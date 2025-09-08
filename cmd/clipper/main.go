package main

import (
	"clipper/internal/server"
	"clipper/internal/utils"
	"context"
	"flag"
	"fmt"
	"log"
	"log/slog"
	"os"

	storage "cloud.google.com/go/storage"
	"google.golang.org/api/option"
	"github.com/joho/godotenv"
)

func main() {

	// --- Command Line Argument Parsing ---
	debug := flag.Bool("debug", false, "Enable debug level logging")
	flag.Parse()

	// --- Logger Setup ---
	logLevel := slog.LevelInfo
	if *debug {
		logLevel = slog.LevelDebug
	}
	opts := &slog.HandlerOptions{
		Level: logLevel,
	}
	handler := slog.NewTextHandler(os.Stdout, opts)
	slog.SetDefault(slog.New(handler))

	// Load env variables from .env
	if err := godotenv.Load(); err != nil {
		slog.Warn("Failed to load .env file", "error", err)
	}

	if err := utils.CopyCookieToTmp(); err != nil {
		slog.Error("Failed to copy cookie to tmp", "error", err)
	}

	// Initialize GCS client and bucket
	ctx := context.Background()
	storageClient, err := newGCSClient(ctx)
	if err != nil {
		log.Fatal("Failed to create storage client", "error", err)
	}
	defer storageClient.Close()

	bucketName := os.Getenv("GCS_BUCKET_NAME")
	if bucketName == "" {
		log.Fatal("GCS_BUCKET_NAME environment variable is not set")
	}
	bucket := storageClient.Bucket(bucketName)

	// --- Server Initialization ---
	srv := server.New(bucket)

	if err := srv.Start(); err != nil {
		slog.Error("Server error", "error", err)
		os.Exit(1)
	}
}

// newGCSClient creates a new Google Cloud Storage client
// If running locally, it uses the service account key file specified in the environment variable GOOGLE_APPLICATION_CREDENTIALS
// If running in Cloud Run / GCP environment, it uses the default credentials
func newGCSClient(ctx context.Context) (*storage.Client, error) {
	var client *storage.Client
	var err error
	
	// check if running locally
	if os.Getenv("ENV") == "local" {
		keyFile := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
		if keyFile == "" {
			return nil, fmt.Errorf("GOOGLE_APPLICATION_CREDENTIALS must be set for local environment")
		}
		client, err = storage.NewClient(ctx, option.WithCredentialsFile(keyFile))
	}else{
		// In Cloud Run / GCP environment, default credentials are used automatically	
		client, err = storage.NewClient(ctx)
	}

	if err != nil {
		return nil, err
	}
	return client, nil
}