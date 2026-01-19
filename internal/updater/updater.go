package updater

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os/exec"
	"strings"
	"time"
)

type gitHubRelease struct {
	TagName string `json:"tag_name"`
}

func getLatestYtDlpVersion() (string, error) {
	resp, err := http.Get("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var release gitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return "", err
	}

	return release.TagName, nil
}

func getCurrentYtDlpVersion() (string, error) {
	cmd := exec.Command("yt-dlp", "--version")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

func updateYtDlp() error {
	cmd := exec.Command("pip", "install", "--pre", "-U", "yt-dlp[default]", "--break-system-packages")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to update ytdlp: %v", err)
	}
	slog.Info("ytdlp updated successfully", "output", string(output))
	return nil
}

// CheckAndUpdateYtDlp checks for ytdlp updates and updates it if a new version is available
func CheckAndUpdateYtDlp() {
	slog.Info("Checking for ytdlp updates...")

	if err := updateYtDlp(); err != nil {
		slog.Error("Failed to update ytdlp", "error", err)
	}

	// current, err := getCurrentYtDlpVersion()
	// if err != nil {
	// 	slog.Error("Failed to get current ytdlp version", "error", err)
	// 	return
	// }

	// latest, err := getLatestYtDlpVersion()
	// if err != nil {
	// 	slog.Error("Failed to get latest ytdlp version", "error", err)
	// 	return
	// }

	// if latest != current {
	// 	slog.Info("ytdlp update available! Updating...", "current", current, "latest", latest)
	// 	if err := updateYtDlp(); err != nil {
	// 		slog.Error("Failed to update ytdlp", "error", err)
	// 	}
	// } else {
	// 	slog.Info("ytdlp is up to date")
	// }
}

// StartYtDlpDailyUpdater starts a goroutine that checks for yt-dlp updates daily
func StartYtDlpDailyUpdater() {
	ticker := time.NewTicker(24 * time.Hour)
	go func() {
		for range ticker.C {
			CheckAndUpdateYtDlp()
		}
	}()
}