package handlers

import (
	"clipper/internal/credits"
	"clipper/internal/models"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// ProgressHandler streams progress updates to the client using SSE
func ProgressHandler(creditsStore *credits.CreditsStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		// Get the process ID from the URL
		processId := strings.TrimPrefix(r.URL.Path, "/api/progress/")

		// Get the download process
		downloadProcess, exists := data.getDownloadProcess(processId)
		if !exists {
			http.Error(w, "Process not found", http.StatusNotFound)
			return
		}

		// Notify the watcher that the client is still connected
		alreadyNotified := data.notifyWatcher(processId)

		// In rare cases, the client may connect multiple times
		// If a duplicate connection is detected, return early
		if alreadyNotified {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Get the progress channel
		progressChannel := downloadProcess.ProgressChan

		// Set headers for SSE
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		flusher := w.(http.Flusher)
		flusher.Flush()

		// Set up a heartbeat to check if the client is still connected every 5 seconds.
		heartbeat := time.NewTicker(5 * time.Second)
		defer heartbeat.Stop()

		// Boolean to track if credits have been deducted to prevent deducting credits multiple times
		isCreditsDeducted := false

		for {
			select {
			case <-r.Context().Done():
				// If the client disconnects while the download is still running, stop the download process and clean up.
				slog.Info("Client disconnected, stopping download process and cleaning up", "processId", processId)
				data.stopDownloadProcessAndCleanUp(processId)
				return

			case progress, ok := <-progressChannel:
				// If the channel is closed, it means the download process has finished.
				if !ok {
					return
				}
				
				// Deduct credits if the download started
				if progress.Event == models.EventTypeProgress && !isCreditsDeducted {
					creditsStore.DeductCredits(downloadProcess.UserIP, downloadProcess.UserFP, downloadProcess.NeededCredits)
					isCreditsDeducted = true
				}
				// Send the progress update to the client.
				jsonData, _ := json.Marshal(progress.Data)
				fmt.Fprintf(w, "event: %s\ndata: %s\n\n", progress.Event, jsonData)
				flusher.Flush()

			case <-heartbeat.C:
				// Send a heartbeat to see if the client is still connected
				// If the send fails, it means the client disconnected.
				_, err := w.Write([]byte(": heartbeat\n\n"))
				if err != nil {
					slog.Warn("Error writing heartbeat, stopping download process and cleaning up", "error", err, "processId", processId)
					data.stopDownloadProcessAndCleanUp(processId)
					return
				}
				flusher.Flush()

			}
		}
	}
}
