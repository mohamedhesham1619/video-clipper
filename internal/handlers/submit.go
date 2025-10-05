package handlers

import (
	"clipper/internal/config"
	"clipper/internal/models"
	"clipper/internal/utils"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
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

		// Read the request from the client
		var videoRequest models.VideoRequest
		if err := json.NewDecoder(r.Body).Decode(&videoRequest); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Log the request details
		clipDurationInSeconds, _ := utils.ParseClipDuration(videoRequest.ClipStart, videoRequest.ClipEnd)
		clipDurationFormatted := utils.FormatSecondsToMMSS(clipDurationInSeconds)
		slog.Info("Received clip request",
			"user ip", getUserIP(r),
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

		// Check if duration exceeds 10 minutes (600 seconds)
		if clipDurationInt, err := strconv.Atoi(clipDurationInSeconds); err == nil && clipDurationInt > 600 {
			http.Error(w, "Clip duration cannot exceed 10 minutes", http.StatusBadRequest)
			return
		}

		// Create a download process struct and initialize it with the progress channel and watcher
		var downloadProcess models.DownloadProcess

		progressChan := make(chan models.ProgressEvent)
		watcher := make(chan struct{})

		downloadProcess.ProgressChan = progressChan
		downloadProcess.Watcher = watcher

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
			downloadUrl := fmt.Sprintf("download/%s", processID)

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
			time.AfterFunc(20*time.Minute, func() {
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

func getUserIP(r *http.Request) string {
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
