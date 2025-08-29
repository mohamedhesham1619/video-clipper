package main

import (
	"clipper/internal/server"
	"clipper/internal/utils"
	"flag"
	"log/slog"
	"os"
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

	if err := utils.CopyCookieToTmp(); err != nil {
		slog.Error("Failed to copy cookie to tmp", "error", err)
	}

	// --- Server Initialization ---
	srv := server.New()

	if err := srv.Start(); err != nil {
		slog.Error("Server error", "error", err)
		os.Exit(1)
	}
}
