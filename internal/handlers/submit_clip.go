package handlers

import (
	"clipper/internal/blocklist"
	"clipper/internal/config"
	"clipper/internal/credits"
	"clipper/internal/downloader/clip"
	"clipper/internal/models"
	"clipper/internal/stats"
	"clipper/internal/updater"
	"clipper/internal/utils"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// SubmitClipHandler handles the submission of a new clip download request
func SubmitClipHandler(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Read the request from the context
		videoRequest := r.Context().Value("videoRequest").(models.ClipRequest)

		// Log the request details
		clipDurationInSeconds, err := utils.CalculateDurationSeconds(videoRequest.ClipStart, videoRequest.ClipEnd)
		if err != nil {
			slog.Error("Failed to calculate clip duration", "error", err)
			http.Error(w, "Invalid clip duration", http.StatusBadRequest)
			return
		}
		clipDurationFormatted := utils.FormatSecondsToMMSS(clipDurationInSeconds)

		userIP := GetUserIP(r)

		slog.Info("Received clip request",
			"user ip", userIP,
			"origin", r.Header.Get("Origin"),
			"refer", r.Header.Get("Referer"),
			"url", videoRequest.VideoURL,
			"quality", videoRequest.Quality,
			"clip duration", clipDurationFormatted)

		// Check if the URL is blocked
		// Since most of the requests are for YouTube, we skip the blocked check for YouTube URLs
		if !utils.IsYouTubeURL(videoRequest.VideoURL) {
			if blocklist.IsBlocked(videoRequest.VideoURL) {
				slog.Warn("Blocked download request", "request", videoRequest)
				http.Error(w, "Failed to process the video", http.StatusBadRequest) // Intentionally vague
				return
			}
		}

		// Create a download process struct and initialize it with the needed data
		var downloadProcess models.DownloadProcess

		userFingerPrint := r.Header.Get("X-Client-FP")

		progressChan := make(chan models.ProgressEvent)
		watcher := make(chan struct{})

		downloadProcess.UserIP = userIP
		downloadProcess.UserFP = userFingerPrint
		downloadProcess.ProgressChan = progressChan
		downloadProcess.Watcher = watcher

		// Calculate the needed credits based on quality and clip duration.
		// The credits will be deducted in the progress handler to only deduct credits when the download starts (to prevent deducting credits for failed requests)
		neededCredits := credits.CalculateClipCreditCost(clipDurationInSeconds, videoRequest.Quality)
		downloadProcess.NeededCredits = neededCredits

		// Add the download process to the shared data
		processID := utils.GenerateID()
		downloadProcess.ID = processID
		data.addDownloadProcess(processID, &downloadProcess)

		// Start a goroutine to handle the download process
		go func() {

			// StartClipDownload function start the download process and doesn't wait for it to finish instead it returns the running command
			ytdlpCmd, err := clip.StartClipDownload(cfg, videoRequest, &downloadProcess)

			// If there was an error during the download, send an error message on the channel and clean up.
			if err != nil {
				handleError(err, "Failed to download video", progressChan, processID, cfg.SMTP)
				return
			}

			// Save the running command so it can be cancelled if the client disconnect
			downloadProcess.YtDlpProcess = ytdlpCmd

			// Wait for the download process to finish
			ytdlpErr := ytdlpCmd.Wait()

			if ytdlpErr != nil {
				handleError(ytdlpErr, "Video processing failed", progressChan, processID, cfg.SMTP)
				return
			}

			// Find the downloaded file 
			filePath, err := utils.FindFileByID(cfg.App.DownloadPath, processID)
			if err != nil {
				handleError(err, "Failed to find file", progressChan, processID, cfg.SMTP)
				return
			}

			// Remove the ID from the file name
			filePath, err = utils.RemoveIDFromFileName(filePath, processID)
			if err != nil {
				handleError(err, "Failed to process downloaded file", progressChan, processID, cfg.SMTP)
				return
			}

			// Set the download path in the download process struct
			downloadProcess.DownloadPath = filePath

			// If everything went well, send the download URL to the client
			slog.Info("Download process finished successfully", "processId", processID)
			downloadUrl := fmt.Sprintf("%s/api/download/%s", cfg.App.DownloadDomain, processID)

			progressChan <- models.ProgressEvent{
				Event: models.EventTypeComplete,
				Data:  map[string]string{"downloadUrl": downloadUrl},
			}

			close(progressChan)

			// Increment clip count in Firestore
			err = stats.IncrementStat(cfg.GoogleCloud.Firestore, "clips")
			if err != nil {
				slog.Error("Error incrementing clip count", "error", err)
			}

			// Schedule cleanup for the download process
			time.AfterFunc(30*time.Minute, func() {
				slog.Info("Cleaning up clip process", "processId", processID)
				data.cleanupDownloadProcess(processID)
			})

		}()

		// If the client didn't request the progress handler within 5 seconds, we assume that the client disconnected and stop the download process.
		// This will not block the submit handler, as it runs in a separate goroutine.
		time.AfterFunc(5*time.Second, func() {

			select {
			case <-watcher:
				slog.Info("Client connected with progress handler", "processId", processID)
			default:
				slog.Warn("Client disconnected before progress handler was requested", "processId", processID)
				close(watcher)
				downloadProcess.Watcher = nil                 // This will prevent server panic if the progress handler is requested after 10 seconds
				data.stopDownloadProcessAndCleanUp(processID) // Stop the download process and clean up resources
			}
		})

		// Respond with the process ID
		json.NewEncoder(w).Encode(map[string]string{"processId": processID})

	}
}

// handleError handles download process errors consistently
func handleError(err error, message string, progressChan chan models.ProgressEvent, processID string, smtpConfig config.SMTPConfig) {
	slog.Error(message, "error", err, "processId", processID)
	progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": message}}
	close(progressChan)
	data.cleanupDownloadProcess(processID)
	go stats.IncrementFailedDownloadsAndNotify(smtpConfig)
	go updater.CheckAndUpdateYtDlp()
}

// handleProcessError handles process failures and cleans up resources
func handleProcessError(processName string, err error, progressChan chan models.ProgressEvent, processID string, smtpConfig config.SMTPConfig) {
	slog.Error(processName+" process failed for process ID "+processID, "error", err)
	progressChan <- models.ProgressEvent{
		Event: models.EventTypeError,
		Data:  map[string]string{"message": "Failed to process video"},
	}
	close(progressChan)
	data.cleanupDownloadProcess(processID)
	go stats.IncrementFailedDownloadsAndNotify(smtpConfig)
	go updater.CheckAndUpdateYtDlp()
}

func GetUserIP(r *http.Request) string {
	// 1. Cloudflare header
	if ip := r.Header.Get("CF-Connecting-IP"); ip != "" {
		return ip
	}
	// 2. Standard header
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		parts := strings.Split(ip, ",")
		return strings.TrimSpace(parts[0])
	}
	return ""
}
