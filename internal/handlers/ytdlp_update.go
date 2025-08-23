package handlers

import (
	"net/http"
	"clipper/internal/utils"
)

// CheckForYtDlpUpdateHandler handles requests to check for yt-dlp updates
func CheckForYtDlpUpdateHandler(w http.ResponseWriter, r *http.Request) {
	pass := r.Header.Get("pass")
	if pass != "285" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Run the update check in a goroutine since it might take some time
	go utils.CheckForYtDlpUpdate()

	w.WriteHeader(http.StatusOK)
}
