package handlers

import (
	"log/slog"
	"net/http"
	"strings"
)

func CancelHandler(w http.ResponseWriter, r *http.Request) {

	processID := strings.TrimPrefix(r.URL.Path, "/cancel/")
	slog.Info("Request for CancelHandler: ", "processID", processID)

	data.stopDownloadProcessAndCleanUp(processID)
	w.WriteHeader(http.StatusOK)
}
