package handlers

import (
	"log/slog"
	"net/http"
	"strings"
)

func CancelHandler(w http.ResponseWriter, r *http.Request) {

	slog.Info("Request for CancelHandler: ", "processID", r.URL.Path)
	processID := strings.TrimPrefix(r.URL.Path, "/cancel/")
	err := data.stopDownloadProcessAndCleanUp(processID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}
