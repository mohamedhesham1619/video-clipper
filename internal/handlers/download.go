package handlers

import (
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

// DownloadHandler serves the requested file for download
func DownloadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get the file ID from the URL
	fileId := strings.TrimPrefix(r.URL.Path, "/download/")
	if fileId == "" {
		http.Error(w, "File ID is required", http.StatusBadRequest)
		return
	}

	// Get the file name from the map if it exists
	filePath, exists := data.getFilePath(fileId)
	if !exists {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Open the file
	file, err := os.Open(filePath)
	if err != nil {
		slog.Error("Error opening file", "error", err, "filePath", filePath)
		http.Error(w, "Error accessing file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Get file info for content length
	fileInfo, err := file.Stat()
	if err != nil {
		slog.Error("Error getting file info", "error", err, "filePath", filePath)
		http.Error(w, "Error accessing file", http.StatusInternalServerError)
		return
	}

	// Set headers
	fileName := filepath.Base(filePath)
	ext := filepath.Ext(fileName)
	safeFileName := fmt.Sprintf("clip%s", ext)

	w.Header().Set("Content-Disposition",
		fmt.Sprintf("attachment; filename=\"%s\"; filename*=UTF-8''%s",
			safeFileName,
			url.PathEscape(fileName)))
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))

	slog.Info("Serving file for download", "fileId", fileId, "filePath", filePath, "size", fileInfo.Size())

	// Use http.ServeContent which handles range requests and other HTTP features
	http.ServeContent(w, r, fileName, fileInfo.ModTime(), file)
}
