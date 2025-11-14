package gif

import (
	"clipper/internal/models"
	"clipper/internal/utils"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// convertVideoToGIF converts a video to a GIF, sends progress events to the progress channel and removes the video file
func convertVideoToGIF(title string, gifRequest *models.GIFRequest, downloadProcess *models.DownloadProcess) error {

	// Find the video file path (we know the file name is the process id but we don't know the extension and the only way to know it is to wait for the download to finish and then see what file was downloaded)
	videoPath, err:= utils.FindFileByID(downloadProcess.DownloadPath, downloadProcess.ID)
	if err != nil {
		return fmt.Errorf("failed to find video file: %v", err)
	}

	// Set the video path in the download process struct
	// It will be used by ffmpeg to generate the GIF
	downloadProcess.DownloadPath = videoPath

	// Prepare the GIF path
	downloadDirectory := filepath.Dir(videoPath)
	gifPath := filepath.Join(downloadDirectory, title + ".gif")

	// Prepare the ffmpeg command and set it in the download process struct
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
	go utils.ParseAndSendProgress(ffmpegStdout, downloadProcess.ProgressChan, totalTimeInMS)

	// Run the ffmpeg command
	if err := ffmpegCmd.Start(); err != nil {
		return fmt.Errorf("failed to start ffmpeg: %v", err)
	}

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