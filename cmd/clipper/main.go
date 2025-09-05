package main

import (
	"clipper/internal/server"
	"clipper/internal/utils"
	"context"
	"flag"
	"log"
	"log/slog"
	"os"

	storage "cloud.google.com/go/storage"
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
	storageClient, err := storage.NewClient(ctx)
	if err != nil {
		log.Fatal("Failed to create storage client", "error", err)
	}
	defer storageClient.Close()

	bucket := storageClient.Bucket(os.Getenv("GCS_BUCKET_NAME"))

	// --- Server Initialization ---
	srv := server.New(bucket)

	if err := srv.Start(); err != nil {
		slog.Error("Server error", "error", err)
		os.Exit(1)
	}
}
