package main

import (
	"clipper/internal/config"
	"clipper/internal/server"
	"clipper/internal/utils"
	"flag"
	"log/slog"
	"os"

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

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		slog.Error("Failed to load configuration", "error", err)
		os.Exit(1)
	}
	defer cfg.Close()

	// Load blocked domains into memory
	err = utils.LoadBlockedDomainsFromFile("internal/data/blocked_domains.txt")
	if err != nil {
		slog.Error("Failed to load blocked domains", "error", err)
	}

	// Start yt-dlp daily updater
	utils.StartYtDlpDailyUpdater()

	// --- Server Initialization ---
	srv := server.New(cfg)

	if err := srv.Start(); err != nil {
		slog.Error("Server error", "error", err)
		os.Exit(1)
	}
}