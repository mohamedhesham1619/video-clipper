package handlers

import (
	"clipper/internal/config"
	"clipper/internal/credits"
	"clipper/internal/models"
	"clipper/internal/utils"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

type response struct {
	Status    string `json:"status"` // "started", "error"
	ProcessId string `json:"processId,omitempty"`
}

// SubmitHandler handles the submission of a new video download request
func SubmitHandler(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Read the request from the context
		videoRequest := r.Context().Value("videoRequest").(models.VideoRequest)

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
			if utils.IsBlocked(videoRequest.VideoURL) {
				slog.Warn("Blocked download request", "request", videoRequest)
				http.Error(w, "Failed to process the video", http.StatusBadRequest) // Intentionally vague
				return
			}

		}

		// Create a download process struct and initialize it with the needed data
		// The credits will be deducted in the progress handler to only deduct credits when the download starts (to prevent deducting credits for failed requests)
		var downloadProcess models.DownloadProcess

		progressChan := make(chan models.ProgressEvent)
		watcher := make(chan struct{})

		fp := r.Header.Get("X-Client-FP")

		downloadProcess.ProgressChan = progressChan
		downloadProcess.Watcher = watcher
		downloadProcess.UserIP = userIP
		downloadProcess.UserFP = fp

		// Add the download process to the shared data
		processID := utils.GenerateID()
		data.addDownloadProcess(processID, &downloadProcess)

		// Start a goroutine to handle the download process
		go func() {

			// Get the video title and send it to the progress channel
			videoTitle, err := utils.GetVideoTitle(cfg, videoRequest)
			if err != nil {
				slog.Error("Error getting video title", "error", err, "request", videoRequest)

				progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Could not get video info"}}

				close(progressChan)

				// Clean up any resources associated with this process
				data.cleanupDownloadProcess(processID)

				// The download could fail if yt-dlp is outdated, so we check for updates and rebuild the container if necessary.
				go utils.CheckAndUpdateYtDlp()
				return
			}

			// Getting the video title takes some time, so we check if the user cancelled the request while we were getting the video title
			// If the user cancelled the request, we stop the download process and clean up resources
			if downloadProcess.IsCancelled {
				slog.Warn("Skipping download start as process was cancelled", "processID", processID)
				close(progressChan)
				data.cleanupDownloadProcess(processID)
				return
			}

			// Get the actual quality from the video title
			actualQuality := utils.GetActualQuality(videoTitle)
			if actualQuality == "" {
				progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Could not get video info"}}
				close(progressChan)
				data.cleanupDownloadProcess(processID)
				return
			}

			// Calculate the needed credits based on the actual quality and clip duration
			// we don't use the quality from the request because it might be different from the actual quality retrieved from yt-dlp
			neededCredits := credits.CalculateCreditCost(clipDurationInSeconds, actualQuality)
			downloadProcess.NeededCredits = neededCredits

			// Send the video title to the progress channel
			// This is used to display the video title to the user
			progressChan <- models.ProgressEvent{
				Event: models.EventTypeTitle,
				Data:  map[string]string{"title": videoTitle},
			}

			// StartVideoDownloadProcesses function start the download processes and doesn't wait for them to finish instead it returns the running commands
			ytdlpCmd, ffmpegCmd, err := utils.StartVideoDownloadProcesses(cfg, videoRequest, videoTitle, &downloadProcess)

			// If there was an error during the download, send an error message on the channel and clean up.
			if err != nil {
				slog.Error("Error downloading video", "error", err, "request", videoRequest)
				progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Failed to download video"}}
				close(progressChan)
				data.cleanupDownloadProcess(processID)
				return
			}

			// Save the running commands so they can be cancelled if the client disconnect
			downloadProcess.YtDlpProcess = ytdlpCmd
			downloadProcess.FFmpegProcess = ffmpegCmd

			// Wait for both processes to finish
			// If any process fails, send an error message on the channel and clean up.
			if err := ffmpegCmd.Wait(); err != nil {
				handleProcessError("ffmpeg", err, progressChan, processID)
				return
			}
			if err := ytdlpCmd.Wait(); err != nil {
				handleProcessError("yt-dlp", err, progressChan, processID)
				return
			}

			// If everything went well, send the download URL to the client
			slog.Info("Download process finished successfully", "processId", processID, "videoTitle", videoTitle)
			downloadUrl := fmt.Sprintf("%s/api/download/%s", cfg.App.DownloadDomain, processID)

			progressChan <- models.ProgressEvent{
				Event: models.EventTypeComplete,
				Data:  map[string]string{"downloadUrl": downloadUrl},
			}

			close(progressChan)

			// Increment clip count in Firestore
			err = utils.IncrementClipCount(cfg.GoogleCloud.Firestore)
			if err != nil {
				slog.Error("Error incrementing clip count", "error", err)
			}

			// Schedule cleanup of the download process
			time.AfterFunc(30*time.Minute, func() {
				slog.Info("Cleaning up download process", "processId", processID)
				data.cleanupDownloadProcess(processID)
			})

		}()

		// If the client didn't request the progress handler within 10 seconds, we assume that the client disconnected and stop the download process.
		// This will not block the submit handler, as it runs in a separate goroutine.
		time.AfterFunc(10*time.Second, func() {

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
		json.NewEncoder(w).Encode(response{Status: "started", ProcessId: processID})

	}
}

// handleProcessError handles process failures and cleans up resources
func handleProcessError(processName string, err error, progressChan chan models.ProgressEvent, processID string) {
	slog.Error(processName+" process failed", "error", err)
	progressChan <- models.ProgressEvent{
		Event: models.EventTypeError,
		Data:  map[string]string{"message": "Failed to process video"},
	}
	close(progressChan)
	data.cleanupDownloadProcess(processID)
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
