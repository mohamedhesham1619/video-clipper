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
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	// Read the request from the client
	var videoRequest models.VideoRequest
	if err := json.NewDecoder(r.Body).Decode(&videoRequest); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	// Log the request details
	clipDuration, _ := utils.ParseClipDuration(videoRequest.ClipStart, videoRequest.ClipEnd)
	clipDurationFormatted := utils.FormatSecondsToMMSS(clipDuration)
	slog.Info("Received clip request",
		"ip", r.RemoteAddr,
		"origin", r.Header.Get("Origin"),
		"refer", r.Header.Get("Referer"),
		"url", videoRequest.VideoURL,
		"quality", videoRequest.Quality,
		"clip duration", clipDurationFormatted)

	// Generate a unique ID for the file and create a progress channel
	// This ID will be used to track the download process and progress updates.
	fileId := utils.GenerateID()
	progressChan := make(chan models.ProgressEvent)
	data.addProgressChannel(fileId, progressChan)

	// Add a watcher for this process ID to track client connection status
	data.addWatcher(fileId)

	// Start a goroutine to handle the download process
	go func() {

		// Get the video title and send it to the progress channel
		videoTitle, err := utils.GetVideoTitle(videoRequest)
		if err != nil {
			slog.Error("Error getting video title", "error", err, "request", videoRequest)
			
			progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Failed to get video title"}}

			close(progressChan)

			// Clean up any resources associated with this process
			data.cleanupAll(fileId) 
			
			// The download could fail if yt-dlp is outdated, so we check for updates and rebuild the container if necessary.
			go utils.CheckForYtDlpUpdate()
			return
		}

		progressChan <- models.ProgressEvent{
			Event: models.EventTypeTitle,
			Data:  map[string]string{"title": videoTitle},
		}

		// Start the download process
		filePath, cmd, err := utils.DownloadVideo(videoRequest, videoTitle, progressChan)

		// If there was an error during the download, send an error message on the channel and clean up.
		if err != nil {
			slog.Error("Error downloading video", "error", err, "request", videoRequest)
			progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Failed to download video"}}
			close(progressChan)
			data.cleanupAll(fileId) // Clean up any resources associated with this process
			return
		}

		// Store the file path and the download command in the shared data
		data.addDownloadProcess(fileId, cmd)
		data.addFileID(fileId, filePath)

		// If the download fails, send an error message on the channel and clean up.
		if err := cmd.Wait(); err != nil {

			slog.Error("ffmpeg process failed", "error", err)

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
		slog.Info("ffmpeg process finished successfully", "processId", fileId, "filePath", filePath)

		// Send the final success message on the channel before closing it.
		progressChan <- models.ProgressEvent{
			Event: models.EventTypeComplete,
			Data:  map[string]string{"downloadUrl": fmt.Sprintf("/download/%s", fileId)},
		}

		close(progressChan)

		// wait for a while to ensure the client can download the file then clean up
		time.Sleep(15 * time.Minute)
		data.cleanupAll(fileId)
		slog.Info("cleanup completed for process", "processId", fileId)
	}()

	// If the client didn't request the progress handler within 5 seconds, we assume that the client disconnected and stop the download process.
	// This will not block the submit handler, as it runs in a separate goroutine.
	time.AfterFunc(5*time.Second, func() {
		watcher, exist := data.getWatcher(fileId)
		if exist {
			select {
			case <-watcher:
				slog.Debug("Client is still connected", "processId", fileId)
			default:
				slog.Warn("Client disconnected before download started", "processId", fileId)
				data.stopDownloadProcessAndCleanUp(fileId) // Stop the download process and clean up resources
			}
		}
	})

	// Respond with the process ID
	json.NewEncoder(w).Encode(response{Status: "started", ProcessId: fileId})

}
