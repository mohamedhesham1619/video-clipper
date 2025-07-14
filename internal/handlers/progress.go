package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
)

// ProgressHandler streams progress updates to the client using SSE
func ProgressHandler(w http.ResponseWriter, r *http.Request) {
	// Get the process ID from the URL
	processId := strings.TrimPrefix(r.URL.Path, "/progress/")

	// Get the progress channel
	progressChannel, exists := data.getProgressChannel(processId)

	if !exists {
		http.Error(w, "Process not found", http.StatusNotFound)
		return
	}

	// Set headers for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	// If the client disconnects, close the progress channel, stop the download command and clean up.
	go func() {
		<-r.Context().Done()
		slog.Info("Client disconnected, closing progress channel", "processId", processId)
		close(progressChannel)

		// Stop the download command if it exists
		if cmd, exists := data.getProcess(processId); exists {
			slog.Info("Stopping download command", "processId", processId)
			if err := cmd.Process.Kill(); err != nil {
				slog.Error("Failed to kill download command", "error", err)
			}
		}
		data.cleanupAll(processId) // Clean up all resources associated with this process ID
		slog.Info("Cleaned up resources for process", "processId", processId)
		
	}()

	// Stream progress updates
	for progress := range progressChannel {
		b, _ := json.Marshal(progress.Data)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", progress.Event, b)
		slog.Debug("Streaming progress update", "event", progress.Event, "data", progress.Data)
		w.(http.Flusher).Flush()
	}

}
