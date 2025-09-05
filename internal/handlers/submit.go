package handlers

import (
	"clipper/internal/models"
	"clipper/internal/utils"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	firestore "cloud.google.com/go/firestore"
	iamcredentials "cloud.google.com/go/iam/credentials/apiv1"
	"cloud.google.com/go/storage"
	credentialspb "google.golang.org/genproto/googleapis/iam/credentials/v1"
)

type response struct {
	Status    string `json:"status"` // "started", "error"
	ProcessId string `json:"processId,omitempty"`
}

// SubmitHandler handles the submission of a new video download request
func SubmitHandler(bucket *storage.BucketHandle) http.HandlerFunc {
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
			"origin", r.Header.Get("Origin"),
			"refer", r.Header.Get("Referer"),
			"url", videoRequest.VideoURL,
			"quality", videoRequest.Quality,
			"clip duration", clipDurationFormatted)

		// Check if duration exceeds 30 minutes (1800 seconds)
		if clipDurationInt, err := strconv.Atoi(clipDurationInSeconds); err == nil && clipDurationInt > 1800 {
			http.Error(w, "Clip duration cannot exceed 30 minutes", http.StatusBadRequest)
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
			videoTitle, err := utils.GetVideoTitle(videoRequest)
			if err != nil {
				slog.Error("Error getting video title", "error", err, "request", videoRequest)

				progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Could not get video info"}}

				close(progressChan)

				// Clean up any resources associated with this process
				data.removeDownloadProcess(processID)

				// The download could fail if yt-dlp is outdated, so we check for updates and rebuild the container if necessary.
				go utils.CheckForYtDlpUpdate()
				return
			}

			// Send the video title to the progress channel
			// This is used to display the video title to the user
			progressChan <- models.ProgressEvent{
				Event: models.EventTypeTitle,
				Data:  map[string]string{"title": videoTitle},
			}

			// Start the download process
			ytdlpCmd, ffmpegCmd, err := utils.DownloadVideo(videoRequest, videoTitle, bucket, progressChan)

			// If there was an error during the download, send an error message on the channel and clean up.
			if err != nil {
				slog.Error("Error downloading video", "error", err, "request", videoRequest)
				progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Failed to download video"}}
				close(progressChan)
				return
			}

			// If the download fails, send an error message on the channel and clean up.
			if err := ffmpegCmd.Wait(); err != nil {
				handleProcessError("ffmpeg", err, progressChan, processID)
				return
			}
			if err := ytdlpCmd.Wait(); err != nil {
				handleProcessError("yt-dlp", err, progressChan, processID)
				return
			}

			// If both processes succeed, generate a download URL and send it to the progress channel.
			slog.Info("Download process finished successfully", "processId", processID, "videoTitle", videoTitle)

			// generate download url
			downloadUrl, err := generateSignedURL(os.Getenv("CS_BUCKET_NAME"), videoTitle, os.Getenv("GC_ACCOUNT_EMAIL"))

			if err != nil {
				slog.Error("Error generating download URL", "error", err)
				progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Failed to generate download URL"}}
				close(progressChan)
				return
			}

			progressChan <- models.ProgressEvent{
				Event: models.EventTypeComplete,
				Data:  map[string]string{"downloadUrl": downloadUrl},
			}

			close(progressChan)

			// Increment clip count in Firestore
			projectID := os.Getenv("GC_PROJECT_ID")
			ctx := context.Background()
			firestoreClient, err := firestore.NewClient(ctx, projectID)
			if err != nil {
				slog.Error("Error creating Firestore client, cannot increment clip count", "error", err)
				return
			}
			defer firestoreClient.Close()

			err = utils.IncrementClipCount(ctx, firestoreClient)
			if err != nil {
				slog.Error("Error incrementing clip count", "error", err)
			}

			data.removeDownloadProcess(processID)
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
				data.stopDownloadProcessAndCleanUp(processID) // Stop the download process and clean up resources
			}
		})

		// Respond with the process ID
		json.NewEncoder(w).Encode(response{Status: "started", ProcessId: processID})

	}
}

func generateSignedURL(bucketName, objectName, serviceAccountEmail string) (string, error) {
	ctx := context.Background()

	// IAM client for signing
	iamClient, err := iamcredentials.NewIamCredentialsClient(ctx)
	if err != nil {
		return "", err
	}
	defer iamClient.Close()

	// signBytes function delegates signing to IAM API
	signBytes := func(b []byte) ([]byte, error) {
		resp, err := iamClient.SignBlob(ctx, &credentialspb.SignBlobRequest{
			Name:    "projects/-/serviceAccounts/" + serviceAccountEmail,
			Payload: b,
		})
		if err != nil {
			return nil, err
		}
		return resp.SignedBlob, nil
	}

	opts := &storage.SignedURLOptions{
		Scheme:         storage.SigningSchemeV4,
		Method:         "GET",
		Expires:        time.Now().Add(2 * time.Hour),
		GoogleAccessID: serviceAccountEmail,
		SignBytes:      signBytes,
	}

	// Generate the signed URL
	url, err := storage.SignedURL(bucketName, objectName, opts)
	if err != nil {
		return "", err
	}
	return url, nil
}

// handleProcessError handles process failures and cleans up resources
func handleProcessError(processName string, err error, progressChan chan models.ProgressEvent, processID string) {
	slog.Error(processName+" process failed", "error", err)
	progressChan <- models.ProgressEvent{
		Event: models.EventTypeError,
		Data:  map[string]string{"message": "Failed to process video"},
	}
	close(progressChan)
	data.removeDownloadProcess(processID)
}
