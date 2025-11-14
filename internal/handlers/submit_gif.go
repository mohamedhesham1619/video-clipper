package handlers

import (
	"clipper/internal/blocklist"
	"clipper/internal/config"
	"clipper/internal/downloader/gif"
	"clipper/internal/models"
	"clipper/internal/stats"
	"clipper/internal/utils"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"
)

// SubmitGIFHandler handles the submission of a new GIF request
func SubmitGIFHandler(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Read the request from the context
		gifRequest := r.Context().Value("gifRequest").(models.GIFRequest)

		// Log the request details
		userIP := GetUserIP(r)
		
		slog.Info("Received gif request",
			"user ip", userIP,
			"origin", r.Header.Get("Origin"),
			"refer", r.Header.Get("Referer"),
			"url", gifRequest.VideoURL,
			"gif details", gifRequest)

		// Check if the URL is blocked
		// Since most of the requests are for YouTube, we skip the blocked check for YouTube URLs
		if !utils.IsYouTubeURL(gifRequest.VideoURL) {
			if blocklist.IsBlocked(gifRequest.VideoURL) {
				slog.Warn("Blocked download request", "request", gifRequest)
				http.Error(w, "Failed to process the video", http.StatusBadRequest)
				return
			}

		}

		// Create a download process struct and initialize it with the needed data
		var downloadProcess models.DownloadProcess
		
		processID := utils.GenerateID()
		downloadProcess.ID = processID

		progressChan := make(chan models.ProgressEvent)
		watcher := make(chan struct{})

		userFp := r.Header.Get("X-Client-FP")

		downloadProcess.ProgressChan = progressChan
		downloadProcess.Watcher = watcher
		downloadProcess.UserIP = userIP
		downloadProcess.UserFP = userFp

		// Add the download process to the shared data
		data.addDownloadProcess(processID, &downloadProcess)

		// Start a goroutine to generate the GIF
		go func() {
			err := gif.GenerateGIF(&gifRequest, &downloadProcess, cfg)
			if err != nil {
				slog.Error("Error generating GIF", "error", err)
				close(progressChan)
				data.cleanupDownloadProcess(processID)
				stats.IncrementFailedDownloadsAndNotify(cfg.SMTP)
				return 
			}

			// The process is completed, close the progress channel
			close(progressChan)

			// Increment gif count in Firestore
			err = stats.IncrementStat(cfg.GoogleCloud.Firestore, "gifs")
			if err != nil {
				slog.Error("Error incrementing gif count", "error", err)
			}

			// Schedule cleanup for the download process
			time.AfterFunc(30*time.Minute, func() {
				slog.Info("Cleaning up gif process", "processId", processID)
				data.cleanupDownloadProcess(processID)
			})
		}()

		// If the client didn't request the progress handler within 5 seconds, we assume that the client disconnected and stop the download process.
		// This will not block the submit handler, as it runs in a separate goroutine.
		time.AfterFunc(5*time.Second, func() {

			select {
			case <-watcher:
				slog.Info("Client connected with progress handler", "processId", processID)
			default:
				slog.Warn("Client disconnected before progress handler was requested", "processId", processID)
				close(watcher)
				downloadProcess.Watcher = nil                 // This will prevent server panic if the progress handler is requested after 5 seconds
				data.stopDownloadProcessAndCleanUp(processID) // Stop the download process and clean up resources
			}
		})

		// Respond with the process ID
		json.NewEncoder(w).Encode(map[string]string{"processId": processID})

	}
}