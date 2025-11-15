package gif

import (
	"clipper/internal/config"
	"clipper/internal/models"
	"clipper/internal/utils"
	"fmt"
	"os/exec"
	"path/filepath"
)

// startVideoDownload starts the video download and doesn't wait for the download to finish, instead it returns running ytdlp command.
func startVideoDownload(downloadProcess *models.DownloadProcess, gifRequest *models.GIFRequest, cfg *config.Config) (ytdlpCmd *exec.Cmd, err error) {

	// Robust ytdlp format selection:
	// 1. Video-only ≥ target height
	// 2. Video-only ≤ target height
	// 3. Combined video and audio ≥ target height
	// 4. Combined video and audio ≤ target height
	formatString := fmt.Sprintf(
		"bestvideo[height>=%[1]v]/bestvideo[height<=%[1]v]/best[height>=%[1]v]/best[height<=%[1]v]",
		gifRequest.Width,
	)

	// Use process id as file name so we can easily identify the file later when converting it to gif.
	outputPath := filepath.Join(cfg.App.DownloadPath, downloadProcess.ID+".%(ext)s")

	// Set the download path in the download process struct to just the download directory for now
	// We will set the actual file path later after the download is finished
	downloadProcess.DownloadPath = cfg.App.DownloadPath

	// Prepare the ytdlp command args
	args := []string{
		"-f", formatString,
		"--download-sections", fmt.Sprintf("*%s-%s", gifRequest.VideoStart, gifRequest.VideoEnd),
		"--no-abort-on-error",
		"--socket-timeout", "20",
		"--retries", "3",
		"--retry-sleep", "3",
		"--force-overwrites",
		"--buffer-size", "64K",
		"-o", outputPath,
	}

	// use cookies if the video is from youtube
	if utils.IsYouTubeURL(gifRequest.VideoURL) {
		args = append(args, "--cookies", cfg.YouTube.CookiePath)
		args = append(args, "--extractor-args", "youtube:player_client=mweb")

	}

	// finally add the video url
	args = append(args, gifRequest.VideoURL)

	// Build the ytdlp command with the completed args
	ytdlpCmd = exec.Command("yt-dlp", args...)

	// Start the ytdlp command without waiting for it to finish
	if err := ytdlpCmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start yt-dlp: %w", err)
	}

	// Return the ytdlp command.
	return ytdlpCmd, nil
}
