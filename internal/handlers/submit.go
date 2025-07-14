package handlers

import (
	"clipper/internal/models"
	"clipper/internal/utils"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

type response struct {
	Status    string `json:"status"` // "started", "error"
	ProcessId string `json:"processId,omitempty"`
}

// SubmitHandler handles the submission of a new video download request
func SubmitHandler(w http.ResponseWriter, r *http.Request) {
	// Read the request from the client
	var videoRequest models.VideoRequest
	json.NewDecoder(r.Body).Decode(&videoRequest)

	// Log the request details
	clipDuration, _ := utils.ParseClipDuration(videoRequest.ClipStart, videoRequest.ClipEnd)
	clipDurationFormatted := utils.FormatSecondsToMMSS(clipDuration)
	slog.Info("Received download request",
		"ip", r.RemoteAddr,
		"url", videoRequest.VideoURL,
		"quality", videoRequest.Quality,
		"clip duration", clipDurationFormatted)

	// Generate a unique ID for the file and create a progress channel
	// This ID will be used to track the download process and progress updates.
	fileId := utils.GenerateID()
	progressChan := make(chan models.ProgressEvent)
	data.addProgressChannel(fileId, progressChan)

	// Start a goroutine to handle the download process
	go func() {

		// Get the video title and send it to the progress channel
		videoTitle, err := utils.GetVideoTitle(videoRequest)
		if err != nil {
			slog.Error("Error getting video title", "error", err, "request", videoRequest)
			progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Failed to get video title"}}
			close(progressChan)
			data.cleanupAll(fileId) // Clean up any resources associated with this process
			return
		}

		progressChan <- models.ProgressEvent{
			Event: models.EventTypeTitle,
			Data:  map[string]string{"title": videoTitle},
		}

		// Start the download process
		filePath, cmd, err := utils.DownloadVideo(videoRequest, videoTitle, progressChan)

		// If there was an error during the download, close the goroutine
		if err != nil {
			slog.Error("Error downloading video", "error", err, "request", videoRequest)
			progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Failed to download video"}}
			close(progressChan)
			data.cleanupAll(fileId) // Clean up any resources associated with this process
			return
		}

		// Store the file path and the download command in the shared data
		data.addProcess(fileId, cmd)
		data.addFileID(fileId, filePath)

		// If the download fails, send an error message on the channel and clean up.
		if err := cmd.Wait(); err != nil {

			slog.Error("ffmpeg process failed", "error", err,)

			// Send a failure message on the channel before closing it.
			progressChan <- models.ProgressEvent{
				Event: models.EventTypeError,
				Data:  map[string]string{"message": "Failed to process video"},
			}

			// close the progress channel and clean up
			close(progressChan)
			data.cleanupAll(fileId)
			return
		}

		// This block runs only if ffmpeg succeeds.
		slog.Info("ffmpeg process finished successfully", "processId", fileId)

		// Send the final success message on the channel before closing it.
		progressChan <- models.ProgressEvent{
			Event: models.EventTypeComplete,
			Data:  map[string]string{"downloadUrl": fmt.Sprintf("/download/%s", fileId)},
		}

		close(progressChan)

		// wait for a while to ensure the client can download the file then clean up
		time.Sleep(10 * time.Minute)
		data.cleanupAll(fileId)
		slog.Info("cleanup completed for process", "processId", fileId)
	}()

	// Respond with the process ID
	json.NewEncoder(w).Encode(response{Status: "started", ProcessId: fileId})

}
