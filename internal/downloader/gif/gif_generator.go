package gif

import (
	"clipper/internal/config"
	"clipper/internal/credits"
	"clipper/internal/models"
	"clipper/internal/utils"
	"fmt"
	"log/slog"
	"regexp"
)

// GenerateGIF generates a GIF from a video
// It downloads the video, converts it to GIF, and sends progress events to the progress channel
// It returns an error if any error occurs and the caller will handle closing the progress channel and cleaning up resources
func GenerateGIF(gifRequest *models.GIFRequest, downloadProcess *models.DownloadProcess, cfg *config.Config) error {

	// Calculate the video duration in seconds
	// This is used to calculate the needed credits
	videoDurationInSeconds, err := utils.CalculateDurationSeconds(gifRequest.VideoStart, gifRequest.VideoEnd)
	if err != nil {
		return fmt.Errorf("failed to calculate video duration in seconds: %v", err)
	}

	// Set the needed credits for this GIF request
	neededCredits := credits.CalculateGIFCreditCost(videoDurationInSeconds, gifRequest.Width, gifRequest.FPS, gifRequest.Speed)
	downloadProcess.NeededCredits = neededCredits

	// Create a channel to receive the video title
	titleChannel := make(chan string)
	defer close(titleChannel)

	// Get the video title in a separate goroutine and send it to the title channel
	go func() {
		title, err := utils.GetVideoTitle(cfg, gifRequest.Width, gifRequest.VideoURL)
		if err != nil {
			titleChannel <- ""
			return
		}
		titleChannel <- title
	}()

	// Start the video download and set the running yt-dlp process in the download process struct
	runningYtdlpCmd, err := startVideoDownload(downloadProcess, gifRequest, cfg)
	downloadProcess.YtDlpProcess = runningYtdlpCmd

	// If the yt-dlp command failed to start, send an error event to the progress channel and return an error
	// The caller will handle closing the progress channel and cleaning up resources
	if err != nil {
		downloadProcess.ProgressChan <- models.ProgressEvent{
			Event: models.EventTypeError,
			Data:  map[string]string{"message": "Failed to start video download"},
		}
		return fmt.Errorf("failed to start video download: %v", err)
	}

	// Wait for the video title to be received from the title channel
	title := <-titleChannel

	// If we failed to get the video title, send an error event to the progress channel and return an error
	// else remove the "-<number>p.<ext>" suffix from the title and send it to the progress channel
	if title == "" {
		downloadProcess.ProgressChan <- models.ProgressEvent{
			Event: models.EventTypeError,
			Data:  map[string]string{"message": "Failed to get video info"},
		}

		// Kill the running yt-dlp process
		runningYtdlpCmd.Process.Kill()

		// clean up process resources
		runningYtdlpCmd.Wait()

		return fmt.Errorf("failed to get video title")
	}else{
		// Remove the "-<number>p.<ext>" suffix
		re := regexp.MustCompile(`-\d+p\.\w+$`)
		title = re.ReplaceAllString(title, "")

		// Send the video title to the progress channel
		downloadProcess.ProgressChan <- models.ProgressEvent{
			Event: models.EventTypeTitle,
			Data:  map[string]string{"title": title},
		}
	}

	// Wait for the ytdlp download command to finish
	if err := runningYtdlpCmd.Wait(); err != nil {
		downloadProcess.ProgressChan <- models.ProgressEvent{
			Event: models.EventTypeError,
			Data:  map[string]string{"message": "Failed to download video"},
		}
		return fmt.Errorf("failed to download video: %v", err)
	}

	// Before converting the video to GIF, check if the process was cancelled while we were downloading the video, if so, stop the process and return
	if downloadProcess.IsCancelled {
		slog.Warn("Skipping GIF conversion as process was cancelled", "processID", downloadProcess.ID)
		return fmt.Errorf("process was cancelled")
	}

	// Convert the video to GIF and send progress events to the progress channel
	if err := convertVideoToGIF(title, gifRequest, downloadProcess); err != nil {
		downloadProcess.ProgressChan <- models.ProgressEvent{
			Event: models.EventTypeError,
			Data:  map[string]string{"message": "Failed to convert video to GIF"},
		}
		return fmt.Errorf("failed to convert video to GIF: %v", err)
	}

	slog.Info("GIF process finished successfully", "processID", downloadProcess.ID, "userIP", downloadProcess.UserIP)

	// Send the download url in completed event to the progress channel
	downloadUrl := fmt.Sprintf("%s/api/download/%s", cfg.App.DownloadDomain, downloadProcess.ID)
	downloadProcess.ProgressChan <- models.ProgressEvent{
		Event: models.EventTypeComplete,
		Data:  map[string]string{"downloadUrl": downloadUrl},
	}

	return nil
}
