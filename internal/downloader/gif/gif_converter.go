package gif

import (
	"bufio"
	"clipper/internal/models"
	"clipper/internal/utils"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

// convertVideoToGIF converts a video to a GIF, sends progress events to the progress channel and removes the video file
func convertVideoToGIF(downloadDirectory string, gifRequest *models.GIFRequest, downloadProcess *models.DownloadProcess) error {

	// Find the video file path
	videoPath, err := utils.FindFileByID(downloadDirectory, downloadProcess.ID)
	if err != nil {
		return fmt.Errorf("failed to find video file: %v", err)
	}

	// Set the download path to the video path for now
	// It will be changed later to the GIF path after it is generated
	downloadProcess.DownloadPath = videoPath

	// Prepare the GIF path
	gifPath := prepareGIFPath(videoPath, downloadProcess.ID)

	// Prepare the ffmpeg command and set it in the download process struct so it can be cancelled if the client disconnects
	ffmpegCmd := prepareFFmpegCommand(gifPath, gifRequest, downloadProcess)
	downloadProcess.FFmpegProcess = ffmpegCmd

	// Create a pipe for ffmpeg's stdout.
	// It will be used to read progress updates.
	ffmpegStdout, err := ffmpegCmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("error creating ffmpeg stdout pipe: %v", err)
	}

	// Calculate the total video duration in microseconds.
	// This is used to calculate the progress percentage (ffmpeg shares the output duration in microseconds).
	totalTimeInMS, err := utils.ParseTimeRangeToMicroseconds(gifRequest.VideoStart, gifRequest.VideoEnd)
	if err != nil {
		return fmt.Errorf("error parsing video duration: %v", err)
	}

	// Read progress updates from ffmpeg stdout, parse them, and send them to the progress channel.
	go parseAndSendProgress(ffmpegStdout, downloadProcess.ProgressChan, totalTimeInMS)

	// Create a pipe for ffmpeg's stderr.
	// It will be used to log error messages.
	ffmpegStderr, err := ffmpegCmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("error creating ffmpeg stderr pipe: %v", err)
	}

	// Log stderr output for debugging purposes.
	go utils.LogStderr(ffmpegStderr, downloadProcess.ID, "ffmpeg")

	// Run the ffmpeg command
	if err := ffmpegCmd.Start(); err != nil {
		return fmt.Errorf("failed to start ffmpeg: %v", err)
	}

	// Set the ffmpeg process in the download process struct so it can be cancelled if the client disconnects
	downloadProcess.FFmpegProcess = ffmpegCmd

	// Wait for the ffmpeg command to finish
	if err := ffmpegCmd.Wait(); err != nil {

		return fmt.Errorf("failed to convert video to GIF: %v", err)
	}

	// Set the GIF path in the download process struct
	downloadProcess.DownloadPath = gifPath

	// Remove the video file as it's no longer needed
	if err := os.Remove(videoPath); err != nil {
		return fmt.Errorf("failed to remove video file: %v", err)
	}

	return nil
}

// prepareGIFPath prepares the GIF path by removing the process ID prefix from the video name and replacing the video extension with .gif extension
func prepareGIFPath(videoPath string, processID string) string {

	// Get the download directory and base name
	downloadDirectory := filepath.Dir(videoPath)
	base := filepath.Base(videoPath)

	// Remove the process ID prefix from the video name
	videoName := strings.TrimPrefix(base, processID)

	// Remove the extension from the video name
	videoName = strings.TrimSuffix(videoName, filepath.Ext(videoName))

	// Build the GIF path
	gifPath := filepath.Join(downloadDirectory, videoName+".gif")
	return gifPath
}

func prepareFFmpegCommand(gifPath string, gifRequest *models.GIFRequest, downloadProcess *models.DownloadProcess) *exec.Cmd {

	// Prepare the ffmpeg command
	return exec.Command("ffmpeg",

		// Suppress the startup banner and version info for cleaner output
		"-hide_banner",

		// Input video path
		"-i", downloadProcess.DownloadPath,

		// Apply video filters: set frame rate, resize width (preserve aspect ratio), and adjust playback speed
		"-vf", fmt.Sprintf("fps=%d,scale=%d:-1,setpts=%f*PTS", gifRequest.FPS, gifRequest.Width, 1.0/gifRequest.Speed),

		// Set output frame rate to match the desired FPS
		"-r", fmt.Sprintf("%d", gifRequest.FPS),

		// Set the number of loops (0 for infinite)
		"-loop", fmt.Sprintf("%d", gifRequest.Loops),

		// Send progress to stdout
		"-progress", "pipe:1",

		// Overwrite the output file if it exists.
		"-y",

		// Output GIF file path
		gifPath,
	)
}

// parseAndSendProgress reads from ffmpeg's progress pipe, parses the progress, and sends it to the progress channel.
func parseAndSendProgress(pipe io.ReadCloser, progressChan chan models.ProgressEvent, totalTimeInMS int64) {
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
			progress := (float64(outTime) / float64(totalTimeInMS)) * 100

			progressChan <- models.ProgressEvent{
				Event: models.EventTypeProgress,
				Data: map[string]string{
					"progress": fmt.Sprintf("%d", int(progress)),
				},
			}

		}
	}
}
