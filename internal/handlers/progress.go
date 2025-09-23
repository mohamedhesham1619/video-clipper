package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// ProgressHandler streams progress updates to the client using SSE
func ProgressHandler(w http.ResponseWriter, r *http.Request) {
	// Get the process ID from the URL
	processId := strings.TrimPrefix(r.URL.Path, "/progress/")

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
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.Header().Set("Access-Control-Allow-Origin", "*") 
	w.Header().Set("Access-Control-Allow-Headers", "Cache-Control")

	// Additional anti-buffering headers
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	w.Header().Set("X-Buffer", "no")
	w.Header().Set("Proxy-Buffering", "off")

	w.Header().Del("Content-Length")
	w.Header().Set("Transfer-Encoding", "chunked")

	// Write status immediately before any content
	w.WriteHeader(http.StatusOK)
	
	flusher := w.(http.Flusher)

	// Send immediate padding to break proxy buffering
	padding := strings.Repeat(" ", 2048) // 2KB padding
	fmt.Fprintf(w, ": padding%s\n", padding)
	fmt.Fprintf(w, "retry: 1000\n")
	fmt.Fprintf(w, "data: {\"status\":\"connected\"}\n\n")
	flusher.Flush()

	// Small delay to ensure first chunk gets through
	time.Sleep(200 * time.Millisecond)

	// Set up a heartbeat to check if the client is still connected every 5 seconds.
	heartbeat := time.NewTicker(5 * time.Second)
	defer heartbeat.Stop()

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
