package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"strings"

	cloudbuild "cloud.google.com/go/cloudbuild/apiv1/v2"
	buildpb "cloud.google.com/go/cloudbuild/apiv1/v2/cloudbuildpb"
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

// triggerRebuild rebuilds the container image on Google Cloud Run
// This is used to update the yt-dlp version on the server
func triggerRebuild() error{
	ctx := context.Background()

    client, err := cloudbuild.NewClient(ctx)
    if err != nil {
        return fmt.Errorf("failed to create Cloud Build client: %v", err)
    }
    defer client.Close()

	// Get the trigger ID and project ID from the environment variables
	triggerID := os.Getenv("GC_TRIGGER_ID")
	if triggerID == "" {
		slog.Error("GC_TRIGGER_ID environment variable is not set, cannot trigger rebuild")
		return fmt.Errorf("GC_TRIGGER_ID environment variable is not set")
	}
	projectID := os.Getenv("GC_PROJECT_ID")
	if projectID == "" {
		slog.Error("PROJECT_ID environment variable is not set, cannot trigger rebuild")
		return fmt.Errorf("PROJECT_ID environment variable is not set")
	}
	
    req := &buildpb.RunBuildTriggerRequest{
        Name: fmt.Sprintf("projects/%s/locations/global/triggers/%s", projectID, triggerID),
    }
    _, err = client.RunBuildTrigger(ctx, req)
    if err != nil {
        return fmt.Errorf("failed to run trigger: %v", err)
    }

    return nil
}

// CheckForYtDlpUpdate checks for yt-dlp updates and rebuilds the container image if a new version is available
func CheckForYtDlpUpdate() {
	slog.Info("Checking for yt-dlp updates...")

	current, err := getCurrentYtDlpVersion()
	if err != nil {
		slog.Error("Failed to get current yt-dlp version", "error", err)
		return
	}

	latest, err := getLatestYtDlpVersion()
	if err != nil {
		slog.Error("Failed to get latest yt-dlp version", "error", err)
		return
	}

	if latest != current {
		slog.Info("ytdlp update available! Triggering rebuild...", "current", current, "latest", latest)
		if err := triggerRebuild(); err != nil {
			slog.Error("Rebuild failed", "error", err)
		} else {
			slog.Info("Rebuild started!")
		}
	} else {
		slog.Info("ytdlp is up to date")
	}
}


