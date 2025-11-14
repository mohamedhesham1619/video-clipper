package utils

import (
	"bufio"
	"clipper/internal/config"
	"clipper/internal/models"
	"fmt"
	"io"
	"log/slog"
	"math"
	"math/rand/v2"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
)

func GenerateID() string {

	randNum := rand.Int32N(10000)
	return fmt.Sprintf("%d%d", time.Now().UnixNano(), randNum)
}

// SanitizeOptions holds configuration for name sanitization
type SanitizeOptions struct {
	Replacement   string
	PreserveCase  bool
	ReplaceSpaces bool
}

// SanitizeName sanitizes a name to be safe for filenames and HTTP headers
func SanitizeName(name string, opts *SanitizeOptions) string {
	// Default options
	if opts == nil {
		opts = &SanitizeOptions{
			Replacement:   "_",
			PreserveCase:  false,
			ReplaceSpaces: false, // Default to preserving spaces
		}
	}

	if name == "" {
		return "unnamed"
	}

	// Remove or replace characters unsafe for filenames and HTTP headers
	unsafeChars := regexp.MustCompile(`[<>:"/\\|?*\x00-\x1f\x7f-\x9f]`)
	sanitized := unsafeChars.ReplaceAllString(name, opts.Replacement)

	// Replace whitespace with replacement character (optional)
	if opts.ReplaceSpaces {
		whitespace := regexp.MustCompile(`\s+`)
		sanitized = whitespace.ReplaceAllString(sanitized, opts.Replacement)
	} else {
		// Just normalize multiple spaces to single spaces
		multiSpace := regexp.MustCompile(`\s+`)
		sanitized = multiSpace.ReplaceAllString(sanitized, " ")
	}

	// Remove Unicode control characters
	sanitized = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1 // Remove the character
		}
		return r
	}, sanitized)

	// Replace multiple consecutive replacement chars with single one
	if opts.Replacement != "" {
		multiRepl := regexp.MustCompile(regexp.QuoteMeta(opts.Replacement) + `+`)
		sanitized = multiRepl.ReplaceAllString(sanitized, opts.Replacement)
	}

	// Remove leading/trailing replacement characters and dots
	trimChars := opts.Replacement + "."
	sanitized = strings.Trim(sanitized, trimChars)

	// Handle case conversion
	if !opts.PreserveCase {
		sanitized = strings.ToLower(sanitized)
	}

	// Final fallback
	if sanitized == "" {
		return "unnamed"
	}

	return sanitized
}

// IsYouTubeURL returns true if the URL is a YouTube link.
func IsYouTubeURL(url string) bool {
	return strings.Contains(url, "youtube.com") || strings.Contains(url, "youtu.be")
}

// getVideoTitle retrieves the video title using yt-dlp.
func GetVideoTitle(cfg *config.Config, quality int, videoURL string) (string, error) {
	args := []string{
		"-f", fmt.Sprintf("bv*[height<=%[1]v]+ba/b[height<=%[1]v]/best", quality),
		"--print", "%(title).220s-%(height)sp.mp4",
		"--no-playlist",
		"--no-download",
		"--no-warnings",
		"--ignore-errors",        // Prevents crashes on format issues
		"--no-abort-on-error",    // Continues trying other formats
		"--socket-timeout", "20", // Prevents hanging
		"--retries", "3",
		"--retry-sleep", "3", // wait 3s between retries
	}
	if IsYouTubeURL(videoURL) {
		args = append(args, "--cookies", cfg.YouTube.CookiePath)
	}
	args = append(args, videoURL)
	infoCmd := exec.Command("yt-dlp", args...)

	infoOutput, err := infoCmd.CombinedOutput()

	if err != nil {
		slog.Error("yt-dlp failed to get video info", "error", err, "output", string(infoOutput))
		return "", fmt.Errorf("failed to get video info: %w", err)
	}
	if len(infoOutput) == 0 {
		slog.Error("yt-dlp returned empty output for video info", "videoURL", videoURL)
		return "", fmt.Errorf("yt-dlp returned empty output for video info: %w", err)
	}
	slog.Debug("yt-dlp video title", "title", string(infoOutput))

	// Sanitize the video title to create a valid filename.
	videoTitle := SanitizeName(strings.TrimSpace(string(infoOutput)), nil)
	return videoTitle, nil
}

// GetActualQuality extracts resolution from video title and returns closest match
func GetActualQuality(videoTitle string) int {
	resolutions := []int{480, 720, 1080, 1440}

	// Regex to match resolution pattern at the end (e.g., -720p.mp4, _1080p.mp4)
	re := regexp.MustCompile(`(\d+)p\.[^\.]+$`)
	matches := re.FindStringSubmatch(videoTitle)

	if len(matches) < 2 {
		return 0 // No resolution found
	}

	// Parse the extracted resolution
	foundRes, err := strconv.Atoi(matches[1])
	if err != nil {
		return 0
	}

	// Find closest resolution
	closest := resolutions[0]
	minDiff := math.Abs(float64(foundRes - closest))

	for _, res := range resolutions[1:] {
		diff := math.Abs(float64(foundRes - res))
		if diff < minDiff {
			minDiff = diff
			closest = res
		}
	}

	return closest
}

// ParseTimeRangeToMicroseconds parses a time range in format "hh:mm:ss" and returns the duration in microseconds.
func ParseTimeRangeToMicroseconds(start, end string) (int64, error) {

	layout := "15:04:05"
	startTime, err := time.Parse(layout, start)

	if err != nil {
		return 0, err
	}

	endTime, err := time.Parse(layout, end)

	if err != nil {
		return 0, err
	}

	return endTime.Sub(startTime).Microseconds(), nil

}

// CalculateDurationSeconds calculates the duration in seconds between two time strings in format "hh:mm:ss"
func CalculateDurationSeconds(startTime, endTime string) (int, error) {
	layout := "15:04:05"

	t1, err := time.Parse(layout, startTime)
	if err != nil {
		return 0, fmt.Errorf("invalid start time: %v", err)
	}

	t2, err := time.Parse(layout, endTime)
	if err != nil {
		return 0, fmt.Errorf("invalid end time: %v", err)
	}

	// Calculate and return duration in seconds
	return int(t2.Sub(t1).Seconds()), nil
}

// FormatSecondsToMMSS converts seconds to mm:ss format.
func FormatSecondsToMMSS(seconds int) string {
	if seconds < 0 {
		return "00:00"
	}
	minutes := seconds / 60
	secs := seconds % 60
	return fmt.Sprintf("%02d:%02d", minutes, secs)
}

// GetEgyptTime returns the current time in Egypt (Africa/Cairo) location as a formatted 12-hour string with AM/PM.
func GetEgyptTime() string {
	location, err := time.LoadLocation("Africa/Cairo")
	if err != nil {
		location = time.FixedZone("EET", 2*60*60) // fallback to UTC+2
	}
	return time.Now().In(location).Format("2006-01-02 3:04:05 PM")
}

// ParseAndSendProgress reads from ffmpeg's progress pipe, parses the progress, and sends it to the progress channel.
func ParseAndSendProgress(pipe io.ReadCloser, progressChan chan models.ProgressEvent, totalTimeInMS int64) {
	scanner := bufio.NewScanner(pipe)
	for scanner.Scan() {
		line := scanner.Text()

		if strings.Contains(line, "out_time_ms") {
			outTime, err := strconv.ParseInt(strings.Split(line, "=")[1], 10, 64)

			if err != nil {
				slog.Error("error parsing out_time_ms from ffmpeg", "error", err)
				continue
			}

			// Convert to float64 to avoid integer division truncation and get precise percentage
			progress := (float64(outTime) / float64(totalTimeInMS)) * 100

			progressChan <- models.ProgressEvent{
				Event: models.EventTypeProgress,
				Data: map[string]string{
					"progress": fmt.Sprintf("%d", int(progress)),
				},
			}

		}
	}
}

// FindFileByID searches a directory for a file whose name (without extension) matches the given ID, and returns its full path if found.
func FindFileByID(directory, id string) (string, error) {
    entries, err := os.ReadDir(directory)
    if err != nil {
        return "", err
    }

    for _, entry := range entries {
        if entry.IsDir() {
            continue
        }

        name := entry.Name()
        ext := filepath.Ext(name)
        base := strings.TrimSuffix(name, ext)

        if base == id {
            return filepath.Join(directory, name), nil
        }
    }

    return "", os.ErrNotExist
}