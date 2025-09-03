package handlers

import (
	"clipper/internal/models"
	"clipper/internal/utils"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	firestore "cloud.google.com/go/firestore"
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
	clipDurationInSeconds, _ := utils.ParseClipDuration(videoRequest.ClipStart, videoRequest.ClipEnd)
	clipDurationFormatted := utils.FormatSecondsToMMSS(clipDurationInSeconds)
	slog.Info("Received clip request",
		"origin", r.Header.Get("Origin"),
		"refer", r.Header.Get("Referer"),
		"url", videoRequest.VideoURL,
		"quality", videoRequest.Quality,
		"clip duration", clipDurationFormatted)

	// Check if duration exceeds 30 minutes (1800 seconds)
	if clipDurationInt, err := strconv.Atoi(clipDurationInSeconds); err == nil && clipDurationInt > 1800 {
		http.Error(w, "Clip duration cannot exceed 30 minutes", http.StatusBadRequest)
		return
	}

	// Create a download process struct and initialize it with the progress channel and watcher
	var downloadProcess models.DownloadProcess

	progressChan := make(chan models.ProgressEvent)
	watcher := make(chan struct{})

	downloadProcess.ProgressChan = progressChan
	downloadProcess.Watcher = watcher

	// Add the download process to the shared data
	processID := utils.GenerateID()
	data.addDownloadProcess(processID, &downloadProcess)

	// Start a goroutine to handle the download process
	go func() {

		// Get the video title and send it to the progress channel
		videoTitle, err := utils.GetVideoTitle(videoRequest)
		if err != nil {
			slog.Error("Error getting video title", "error", err, "request", videoRequest)

			progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Could not get video info"}}

			close(progressChan)

			// Clean up any resources associated with this process
			data.cleanUp(processID)

			// The download could fail if yt-dlp is outdated, so we check for updates and rebuild the container if necessary.
			go utils.CheckForYtDlpUpdate()
			return
		}

		progressChan <- models.ProgressEvent{
			Event: models.EventTypeTitle,
			Data:  map[string]string{"title": videoTitle},
		}

		// Start the download process
		filePath := filepath.Join("/tmp", videoTitle)
		ytdlpCmd, ffmpegCmd, err := utils.DownloadVideo(videoRequest, filePath, progressChan)

		// If there was an error during the download, send an error message on the channel and clean up.
		if err != nil {
			slog.Error("Error downloading video", "error", err, "request", videoRequest)
			progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Failed to download video"}}
			close(progressChan)
			return
		}

		// If the download fails, send an error message on the channel and clean up.
		if err := ffmpegCmd.Wait(); err != nil {
			handleProcessError("ffmpeg", err, progressChan, processID)
			return
		}
		if err := ytdlpCmd.Wait(); err != nil {
			handleProcessError("yt-dlp", err, progressChan, processID)
			return
		}

		// If both processes succeed, send the final success message on the channel before closing it.
		slog.Info("Download process finished successfully", "processId", processID, "filePath", filePath)
		downloadProcess.FilePath = filePath
		
		progressChan <- models.ProgressEvent{
			Event: models.EventTypeComplete,
			Data:  map[string]string{"downloadUrl": fmt.Sprintf("/download/%s", processID)},
		}

		close(progressChan)

		// Increment clip count in Firestore
		projectID := os.Getenv("GC_PROJECT_ID")
		firestoreClient, err := firestore.NewClient(r.Context(), projectID)
		if err != nil {
			slog.Error("Error creating Firestore client, cannot increment clip count", "error", err)
			return
		}
		defer firestoreClient.Close()
		
		err = utils.IncrementClipCount(r.Context(), firestoreClient)
		if err != nil {
			slog.Error("Error incrementing clip count", "error", err)
		}

		// wait for a while to ensure the client can download the file then clean up
		time.Sleep(15 * time.Minute)
		data.cleanUp(processID)
		slog.Info("cleanup completed for process", "processId", processID)
	}()

	// If the client didn't request the progress handler within 10 seconds, we assume that the client disconnected and stop the download process.
	// This will not block the submit handler, as it runs in a separate goroutine.
	time.AfterFunc(10*time.Second, func() {

		select {
		case <-watcher:
			slog.Info("Client connected with progress handler", "processId", processID)
		default:
			slog.Warn("Client disconnected before progress handler was requested", "processId", processID)
			close(watcher)
			data.stopDownloadProcessAndCleanUp(processID) // Stop the download process and clean up resources
		}
	})

	// Respond with the process ID
	json.NewEncoder(w).Encode(response{Status: "started", ProcessId: processID})

}

// handleProcessError handles process failures and cleans up resources
func handleProcessError(processName string, err error, progressChan chan models.ProgressEvent, processID string) {
	slog.Error(processName+" process failed", "error", err)
	progressChan <- models.ProgressEvent{
		Event: models.EventTypeError,
		Data:  map[string]string{"message": "Failed to process video"},
	}
	close(progressChan)
	data.cleanUp(processID)
}
