package handlers

import (
	"log/slog"
	"net/http"
	"strings"
)

func CancelHandler(w http.ResponseWriter, r *http.Request) {

	processID := strings.TrimPrefix(r.URL.Path, "/cancel/")
	slog.Info("Received cancel request for process ID: ", "processID", processID, "reason", r.URL.Query().Get("reason"))

	data.stopDownloadProcessAndCleanUp(processID)
	w.WriteHeader(http.StatusOK)
}
