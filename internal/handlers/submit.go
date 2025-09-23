package handlers

import (
	"clipper/internal/models"
	"clipper/internal/utils"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	firestore "cloud.google.com/go/firestore"
	iamcredentials "cloud.google.com/go/iam/credentials/apiv1"
	credentialspb "cloud.google.com/go/iam/credentials/apiv1/credentialspb"
	"cloud.google.com/go/storage"
	"golang.org/x/oauth2/google"
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

			// StartVideoDownloadProcesses function start the download processes and doesn't wait for them to finish instead it returns the running commands
			ytdlpCmd, ffmpegCmd, err := utils.StartVideoDownloadProcesses(videoRequest, videoTitle, &downloadProcess)

			// If there was an error during the download, send an error message on the channel and clean up.
			if err != nil {
				slog.Error("Error downloading video", "error", err, "request", videoRequest)
				progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Failed to download video"}}
				close(progressChan)
				data.removeDownloadProcess(processID)
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

			// At this point the video is downloaded and ready to be uploaded to GCS
			// Send a final progress event to the client to indicate that the download process is complete and the server is generating the download URL
			progressChan <- models.ProgressEvent{Event: models.EventTypeProgress, Data: map[string]string{"progress": "100"}}

			// Upload the downloaded file to GCS
			if err := uploadFileToGCS(bucket, videoTitle, downloadProcess.DownloadPath); err != nil {
				slog.Error("Error uploading file to GCS", "error", err, "request", videoRequest)
				progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Failed to upload file to GCS"}}
				close(progressChan)
				data.removeDownloadProcess(processID)
				return
			}

			// If everything went well, generate a download URL and send it to the client
			slog.Info("Download process finished successfully", "processId", processID, "videoTitle", videoTitle)
			
			bucketName := os.Getenv("GCS_BUCKET_NAME")
			if bucketName == "" {
				slog.Error("GCS_BUCKET_NAME environment variable is not set")
				progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Failed to generate download URL"}}
				close(progressChan)
				data.removeDownloadProcess(processID)
				return
			}

			accountEmail := os.Getenv("GC_ACCOUNT_EMAIL")
			if accountEmail == "" {
				slog.Error("GC_ACCOUNT_EMAIL environment variable is not set")
				progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Failed to generate download URL"}}
				close(progressChan)
				data.removeDownloadProcess(processID)
				return
			}

			downloadUrl, err := generateSignedURL(bucketName, videoTitle, accountEmail)

			if err != nil {
				slog.Error("Error generating download URL", "error", err)
				progressChan <- models.ProgressEvent{Event: models.EventTypeError, Data: map[string]string{"message": "Failed to generate download URL"}}
				close(progressChan)
				data.removeDownloadProcess(processID)
				return
			}

			progressChan <- models.ProgressEvent{
				Event: models.EventTypeComplete,
				Data:  map[string]string{"downloadUrl": downloadUrl},
			}

			close(progressChan)

			// Increment clip count in Firestore
			projectID := os.Getenv("GC_PROJECT_ID")
			if projectID == "" {
				slog.Error("GC_PROJECT_ID environment variable is not set, cannot increment clip count")
				data.removeDownloadProcess(processID)
				return
			}

			ctx := context.Background()
			firestoreClient, err := firestore.NewClient(ctx, projectID)
			if err != nil {
				slog.Error("Error creating Firestore client, cannot increment clip count", "error", err)
				data.removeDownloadProcess(processID)
				return
			}
			defer firestoreClient.Close()

			err = utils.IncrementClipCount(ctx, firestoreClient)
			if err != nil {
				slog.Error("Error incrementing clip count", "error", err)
			}

			// Remove the downloaded file
			if err = os.Remove(downloadProcess.DownloadPath); err != nil {
				slog.Error("Error removing download file", "error", err, "filePath", downloadProcess.DownloadPath)
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

// uploadFileToGCS uploads a file to Google Cloud Storage bucket.
func uploadFileToGCS(bucket *storage.BucketHandle, objectName, filePath string) error {
	
	// Open the file
	f, err := os.Open(filePath)
	if err != nil{
		return err
	}
	defer f.Close()

	// Create GCS object writer
	ctx := context.Background()
	object := bucket.Object(objectName)
	writer := object.NewWriter(ctx)
	defer writer.Close()

	// Copy the file to GCS
	if _, err := io.Copy(writer, f); err != nil {
		return err
	}
	return nil
}

// generateSignedURL generates a signed URL for a file in Google Cloud Storage bucket.
func generateSignedURL(bucketName, objectName, serviceAccountEmail string) (string, error) {

	// If running locally, use the service account key file
	if os.Getenv("ENV") == "local" {
		keyFile := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
		if keyFile == "" {
			return "", fmt.Errorf("GOOGLE_APPLICATION_CREDENTIALS must be set for local environment")
		}
		keyBytes, err := os.ReadFile(keyFile)
		if err != nil {
			return "", fmt.Errorf("failed to read key file: %v", err)
		}

		cfg, err := google.JWTConfigFromJSON(keyBytes)
		if err != nil {
			return "", fmt.Errorf("failed to create JWT config: %v", err)
		}

		opts := &storage.SignedURLOptions{
			Scheme:         storage.SigningSchemeV4,
			Method:         "GET",
			Expires:        time.Now().Add(2 * time.Hour),
			GoogleAccessID: cfg.Email,
			PrivateKey:     cfg.PrivateKey,
			QueryParameters: url.Values{
				"response-content-disposition": []string{fmt.Sprintf("attachment; filename=\"%s\"", objectName)},
			},
		}
		return storage.SignedURL(bucketName, objectName, opts)
	}

	// If running in GCP environment, use the default credentials provided by GCP
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
		QueryParameters: url.Values{
			"response-content-disposition": []string{fmt.Sprintf("attachment; filename=\"%s\"", objectName)},
		},
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
	
	