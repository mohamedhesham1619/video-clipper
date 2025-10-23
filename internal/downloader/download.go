package downloader

import (
	"bufio"
	"clipper/internal/config"
	"clipper/internal/models"
	"clipper/internal/utils"
	"fmt"
	"io"
	"log/slog"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

// StartVideoDownloadProcesses starts the video download processes and returns the running commands.
func StartVideoDownloadProcesses(cfg *config.Config, videoRequest models.VideoRequest, videoTitle string, downloadProcess *models.DownloadProcess) (ytdlpCmd *exec.Cmd, ffmpegCmd *exec.Cmd, err error) {

	// Build the download path and save it to the download process struct.
	downloadPath := filepath.Join(cfg.App.DownloadPath, videoTitle)
	downloadProcess.DownloadPath = downloadPath

	// Create the yt-dlp and ffmpeg commands.
	ytdlpCmd = prepareYtDlpCommand(cfg, videoRequest)
	ffmpegCmd = prepareFfmpegCommand(downloadPath)

	// Prepare the pipes for yt-dlp, ffmpeg.
	err = preparePipes(ytdlpCmd, ffmpegCmd)

	if err != nil {
		return nil, nil, fmt.Errorf("error preparing pipes: %v", err)
	}

	// Calculate the total clip duration.
	// This is used to calculate the progress percentage.
	totalTime, err := utils.ParseTimeRangeToMicroseconds(videoRequest.ClipStart, videoRequest.ClipEnd)
	if err != nil {
		return nil, nil, fmt.Errorf("error calculating clip duration in microseconds: %v", err)
	}

	// Create a pipe for ffmpeg's stdout.
	// This pipe will be used to read progress updates.
	ffmpegStdout, err := ffmpegCmd.StdoutPipe()
	if err != nil {
		return nil, nil, fmt.Errorf("error creating ffmpeg stdout pipe: %v", err)
	}
	go parseAndSendProgress(ffmpegStdout, downloadProcess.ProgressChan, totalTime)

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

func prepareYtDlpCommand(cfg *config.Config, videoRequest models.VideoRequest) *exec.Cmd {

	var formatString string

	if utils.IsYouTubeURL(videoRequest.VideoURL) {
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
		"--socket-timeout", "20",
		"--retries", "5",
		"--retry-sleep", "3", // wait 3s between retries
		"--force-overwrites", // ensures retry writes cleanly
		"--concurrent-fragments", "6",
		"--buffer-size", "64K",
		"--external-downloader", "aria2c",
		"--external-downloader-args", "aria2c:-x 4 -s 4 -k 1M --max-tries=3",
		"-o", "-", // Output to stdout
	}
	if utils.IsYouTubeURL(videoRequest.VideoURL) {
		args = append(args, "--cookies", cfg.YouTube.CookiePath)
	}
	args = append(args, videoRequest.VideoURL)
	return exec.Command("yt-dlp", args...)
}

func prepareFfmpegCommand(downloadPath string) *exec.Cmd {

	return exec.Command("ffmpeg",
		"-hide_banner", // Quieter logs
		"-i", "pipe:0", // Read from stdin
		"-progress", "pipe:1", // Progress to stdout
		"-c", "copy", // Just copy the stream yt-dlp provides.
		"-avoid_negative_ts", "make_zero", // Avoid negative timestamps.
		"-fflags", "+genpts", // Generate missing timestamps.
		"-f", "mp4", // Force the output format to mp4.
		"-y", // Overwrite the output file if it exists.
		downloadPath,
	)
}

// preparePipes sets up the necessary pipes for yt-dlp and ffmpeg commands.
func preparePipes(ytdlpCmd *exec.Cmd, ffmpegCmd *exec.Cmd) error {

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

	// log ffmpeg' stderr for debugging
	ffmpegStderr, err := ffmpegCmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("error creating ffmpeg stderr pipe: %v", err)
	}
	go logPipe(ffmpegStderr, "ffmpeg")

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
