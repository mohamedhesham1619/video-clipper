package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
)

func DownloadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	fileID := strings.TrimPrefix(r.URL.Path, "/api/download/")
	if fileID == "" {
		http.Error(w, "Invalid file ID", http.StatusBadRequest)
		return
	}

	downloadProcess, exist := data.getDownloadProcess(fileID)
	if !exist {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	fileName := filepath.Base(downloadProcess.DownloadPath)
	ext := filepath.Ext(fileName)
	safeFileName := fmt.Sprintf("clip%s", ext)

	w.Header().Set("Content-Disposition",
		fmt.Sprintf("attachment; filename=\"%s\"; filename*=UTF-8''%s",
			safeFileName,
			url.PathEscape(fileName)))
	w.Header().Set("Content-Type", "application/octet-stream")

	http.ServeFile(w, r, downloadProcess.DownloadPath)

}
