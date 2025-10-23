package main

import (
	"clipper/internal/blocklist"
	"clipper/internal/config"
	"clipper/internal/credits"
	"clipper/internal/server"
	"clipper/internal/stats"
	"clipper/internal/updater"
	"flag"
	"log/slog"
	"os"
	"time"

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

	// Load blocked domains into memory
	err := blocklist.LoadFromFile("internal/blocklist/blocked_domains.txt")
	if err != nil {
		slog.Error("Failed to load blocked domains", "error", err)
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		slog.Error("Failed to load configuration", "error", err)
		os.Exit(1)
	}
	defer cfg.Close()

	// Initialize credit store and start expired credits cleaner
	creditsStore := credits.NewCreditStore(cfg.RateLimit.MaxCredits, cfg.RateLimit.ResetDuration)
	creditsStore.StartExpiredCreditsCleaner(cfg.RateLimit.ResetDuration)

	// Start yt-dlp daily updater
	updater.StartYtDlpDailyUpdater()

	// Start routine to periodically reset failed downloads count
	stats.StartFailedDownloadsCountReset(3 * time.Hour)

	// --- Server Initialization ---
	srv := server.New(cfg, creditsStore)

	// Start the server
	if err := srv.Start(); err != nil {
		slog.Error("Server error", "error", err)
		os.Exit(1)
	}
}
