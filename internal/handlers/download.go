package handlers

import (
	"fmt"
	"io"
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

	fileSize := fileInfo.Size()
	const CloudRunLimit = 32 * 1024 * 1024 // 32MB

	// If the file size is less than or equal to the Cloud Run limit, serve the file directly
	if fileSize <= CloudRunLimit {
		slog.Info("Serving file directly", "fileId", fileId, "filePath", filePath, "size", fileSize)

		w.Header().Set("Content-Length", fmt.Sprintf("%d", fileSize))

		http.ServeContent(w, r, fileName, fileInfo.ModTime(), file)
		return
	}

	// If the file size is greater than the Cloud Run limit, use chunked transfer encoding to serve the file in chunks
	slog.Info("Serving file in chunks", "fileId", fileId, "filePath", filePath, "size", fileSize)

	w.Header().Set("Transfer-Encoding", "chunked")

	if err := streamFileChunked(w, file); err != nil {
		slog.Error("Error streaming large file", "error", err)
		return
	}

}

// streamFileChunked handles streaming files with chunked transfer encoding
func streamFileChunked(w http.ResponseWriter, file *os.File) error {
	const chunkSize = 512 * 1024 // 512KB chunks
	buffer := make([]byte, chunkSize)

	// Get flusher to force chunks to be sent immediately
	flusher, ok := w.(http.Flusher)
	if !ok {
		return fmt.Errorf("streaming not supported")
	}

	for {
		n, err := file.Read(buffer)
		if err != nil && err != io.EOF {
			return fmt.Errorf("error reading file: %w", err)
		}

		if n == 0 {
			break // End of file
		}

		// Write chunk to response
		if _, writeErr := w.Write(buffer[:n]); writeErr != nil {
			return fmt.Errorf("error writing chunk: %w", writeErr)
		}

		// Force chunk to be sent immediately
		flusher.Flush()

		if err == io.EOF {
			break
		}
	}

	return nil
}
