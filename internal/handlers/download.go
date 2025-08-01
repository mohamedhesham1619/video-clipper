package handlers

import (
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
)

// DownloadHandler serves the requested file for download
func DownloadHandler(w http.ResponseWriter, r *http.Request) {
	// Get the file ID from the URL
	fileId := strings.TrimPrefix(r.URL.Path, "/download/")

	// Get the file name from the map if it exists
	filePath, exists := data.getFilePath(fileId)

	if !exists {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	slog.Info("Request for DownloadHandler: ", "fileId", fileId, "filePath", filePath)

	fileName := filepath.Base(filePath)

	disposition := fmt.Sprintf("attachment; filename=\"%s\"; filename*=UTF-8''%s", 
    fileName, url.PathEscape(fileName))

	w.Header().Set("Content-Disposition", disposition)

	http.ServeFile(w, r, filePath)
}
