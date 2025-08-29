package handlers

import (
	"net/http"
	"clipper/internal/utils"
)

// CheckForYtDlpUpdateHandler handles requests to check for yt-dlp updates
func CheckForYtDlpUpdateHandler(w http.ResponseWriter, r *http.Request) {

	// Run the update check in a goroutine since it might take some time
	go utils.CheckForYtDlpUpdate()

	w.WriteHeader(http.StatusOK)
}
