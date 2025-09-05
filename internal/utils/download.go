package utils

import (
	"bufio"
	"clipper/internal/models"
	"context"
	"fmt"
	"io"
	"log/slog"
	"os/exec"
	"strconv"
	"strings"

	storage "cloud.google.com/go/storage"
)

// DownloadVideo downloads the video and returns the output file path, a progress channel, and the ffmpeg command.
func DownloadVideo(videoRequest models.VideoRequest, videoTitle string, bucket *storage.BucketHandle, progressChan chan models.ProgressEvent) (ytdlpCmd *exec.Cmd, ffmpegCmd *exec.Cmd, err error) {

	// Create the yt-dlp and ffmpeg commands.
	ytdlpCmd = prepareYtDlpCommand(videoRequest)
	ffmpegCmd = prepareFfmpegCommand()

	// Prepare the pipes for yt-dlp, ffmpeg and GCS writer.
	err = preparePipes(ytdlpCmd, ffmpegCmd, bucket, videoTitle)

	if err != nil {
		return nil, nil, fmt.Errorf("error preparing pipes: %v", err)
	}

	// Calculate the total clip duration.
	// This is used to calculate the progress percentage.
	totalTime, err := calculateClipDuration(videoRequest.ClipStart, videoRequest.ClipEnd)
	if err != nil {
		return nil, nil, fmt.Errorf("error calculating clip duration in microseconds: %v", err)
	}

	// Create a pipe for ffmpeg's stderr.
	// This pipe will be used to read progress updates.
	// stderr is used for progress updates because stdout is used for the GCS writer.
	ffmpegStderr, err := ffmpegCmd.StderrPipe()
	if err != nil {
		return nil, nil, fmt.Errorf("error creating ffmpeg stderr pipe: %v", err)
	}
	go parseAndSendProgress(ffmpegStderr, progressChan, totalTime)

	// Start both commands and do not wait for them to finish.
	if err := ytdlpCmd.Start(); err != nil {
		return nil, nil, fmt.Errorf("failed to start yt-dlp: %w", err)
	}
	if err := ffmpegCmd.Start(); err != nil {
		// If ffmpeg fails to start, we must kill the lingering yt-dlp process.
		_ = ytdlpCmd.Process.Kill()
		return nil, nil, fmt.Errorf("failed to start ffmpeg: %w", err)
	}

	return ytdlpCmd, ffmpegCmd, nil
}

// isYouTubeURL returns true if the URL is a YouTube link.
func isYouTubeURL(url string) bool {
	return strings.Contains(url, "youtube.com") || strings.Contains(url, "youtu.be")
}

func prepareYtDlpCommand(videoRequest models.VideoRequest) *exec.Cmd {

	var formatString string

	if isYouTubeURL(videoRequest.VideoURL) {
		// Youtube often seperate the audio and video streams, so we need to prefer seperate streams to get the required video quality.
		formatString = fmt.Sprintf("bestvideo[height<=%[1]v]+bestaudio/best[height<=%[1]v]/best", videoRequest.Quality)
	} else {
		// For other sites, we can prefer the merged stream.
		formatString = fmt.Sprintf("best[height<=%[1]v]/bv*[height<=%[1]v]+ba/best/bv+ba/worst", videoRequest.Quality)
	}
	args := []string{
		"-f", formatString,
		"--download-sections", fmt.Sprintf("*%s-%s", videoRequest.ClipStart, videoRequest.ClipEnd),
		"--no-warnings",
		"--ignore-errors",
		"--no-abort-on-error",
		"--audio-quality", "0",
		"--prefer-free-formats",
		"--socket-timeout", "20",
		"--retries", "2",
		"-o", "-", // Output to stdout
	}
	if isYouTubeURL(videoRequest.VideoURL) {
		args = append(args, "--cookies", "/tmp/cookie.txt")
	}
	args = append(args, videoRequest.VideoURL)
	return exec.Command("yt-dlp", args...)
}

func prepareFfmpegCommand() *exec.Cmd {
	return exec.Command("ffmpeg",
		"-hide_banner", // Quieter logs
		"-i", "pipe:0", // Read from stdin
		"-progress", "pipe:2", // Progress to stderr
		"-c", "copy", // Just copy the stream yt-dlp provides.
		"-avoid_negative_ts", "make_zero", // Avoid negative timestamps.
		"-fflags", "+genpts", // Generate missing timestamps.
		"-f", "mp4", // Force the output format to mp4.
		"pipe:1", // Output to stdout
	)
}

// preparePipes sets up the necessary pipes for yt-dlp and ffmpeg commands.
func preparePipes(ytdlpCmd *exec.Cmd, ffmpegCmd *exec.Cmd, bucket *storage.BucketHandle, fileName string) error {

	// pipe yt-dlp stdout -> ffmpeg stdin
	var err error
	ffmpegCmd.Stdin, err = ytdlpCmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("error connecting yt-dlp stdout to ffmpeg stdin: %v", err)
	}

	// log yt-dlp's stderr for debugging any download-specific issues.
	ytdlpStderr, err := ytdlpCmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("error creating yt-dlp stderr pipe: %v", err)
	}
	go logPipe(ytdlpStderr, "yt-dlp")

	// create GCS writer
	ctx := context.Background()
	gcsWriter := bucket.Object(fileName).NewWriter(ctx)
	
	// pipe ffmpeg stdout -> GCS writer
	ffmpegStdout, err := ffmpegCmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("error creating ffmpeg stdout pipe: %v", err)
	}
	
	// Write the ffmpeg stdout to GCS bucket object.
	// This is done in a separate goroutine to avoid blocking DownloadVideo function.
	go func() {
		defer gcsWriter.Close()
		_, err := io.Copy(gcsWriter, ffmpegStdout)
		if err != nil {
			slog.Error("error writing to GCS", "error", err, "fileName", fileName)
		}
	}()

	return nil
}

// logPipe reads from a process's output pipe and logs each line for debugging.
func logPipe(pipe io.ReadCloser, prefix string) {
	scanner := bufio.NewScanner(pipe)
	for scanner.Scan() {
		slog.Debug(prefix, "output", scanner.Text())
	}
}

// parseAndSendProgress reads from ffmpeg's progress pipe, parses the progress, and sends it to the progress channel.
func parseAndSendProgress(pipe io.ReadCloser, progressChan chan models.ProgressEvent, totalTime int64) {
	scanner := bufio.NewScanner(pipe)
	for scanner.Scan() {
		line := scanner.Text()

		if strings.Contains(line, "out_time_ms") {
			outTime, err := strconv.ParseInt(strings.Split(line, "=")[1], 10, 64)

			if err != nil {
				slog.Error("error parsing out_time_ms from ffmpeg", "error", err)
				continue
			}

			// Convert to float64 to avoid integer division truncation and get precise percentage
			progress := (float64(outTime) / float64(totalTime)) * 100

			progressChan <- models.ProgressEvent{
				Event: models.EventTypeProgress,
				Data: map[string]string{
					"progress": fmt.Sprintf("%d", int(progress)),
				},
			}

		}
	}
}
