package utils

import (
	"clipper/internal/models"
	"context"
	"fmt"
	"io"
	"log/slog"
	"math/rand/v2"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"

	"cloud.google.com/go/firestore"
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


// getVideoTitle retrieves the video title using yt-dlp.
func GetVideoTitle(videoRequest models.VideoRequest) (string, error) {
	args := []string{
		"-f", fmt.Sprintf("bv*[height<=%[1]v]+ba/b[height<=%[1]v]/best", videoRequest.Quality),
		"--print", "%(title).220s-%(height)sp.mp4",
		"--no-playlist",
		"--no-download",
		"--no-warnings",
		"--ignore-errors",        // Prevents crashes on format issues
		"--no-abort-on-error",    // Continues trying other formats
		"--socket-timeout", "20", // Prevents hanging
		"--retries", "2",
	}
	if isYouTubeURL(videoRequest.VideoURL) {
		args = append(args, "--cookies", "/tmp/cookie.txt")
	}
	args = append(args, videoRequest.VideoURL)
	infoCmd := exec.Command("yt-dlp", args...)

	infoOutput, err := infoCmd.CombinedOutput()

	if err != nil {
		slog.Error("yt-dlp failed to get video info", "error", err, "output", string(infoOutput))
		return "", fmt.Errorf("failed to get video info: %w", err)
	}
	if len(infoOutput) == 0 {
		slog.Error("yt-dlp returned empty output for video info", "videoURL", videoRequest.VideoURL)
		return "", fmt.Errorf("yt-dlp returned empty output for video info: %w", err)
	}
	slog.Debug("yt-dlp video title", "title", string(infoOutput))

	// Sanitize the video title to create a valid filename.
	videoTitle := SanitizeName(strings.TrimSpace(string(infoOutput)), nil)
	return videoTitle, nil
}

// calculate the clip duration in microseconds
func calculateClipDuration(start, end string) (int64, error) {

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

// parse clip timing info.
// for ffmpeg to accurately extract the needed clip, it needs the start time and clip duration in seconds
func ParseClipDuration(startTime, endTime string) (duration string, err error) {
	layout := "15:04:05"

	t1, err := time.Parse(layout, startTime)
	if err != nil {
		return "", fmt.Errorf("invalid start time: %v", err)
	}

	t2, err := time.Parse(layout, endTime)
	if err != nil {
		return "", fmt.Errorf("invalid end time: %v", err)
	}

	// Calculate duration in seconds
	durationSeconds := int(t2.Sub(t1).Seconds())

	// Convert duration to string
	duration = strconv.Itoa(durationSeconds)

	return duration, nil
}

// FormatSecondsToMMSS converts a string representing seconds to mm:ss format.
func FormatSecondsToMMSS(secondsStr string) string {
	seconds, err := strconv.Atoi(secondsStr)
	if err != nil || seconds < 0 {
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

// CopyCookieToTmp copies the cookie file to /tmp so yt-dlp can write to it.
func CopyCookieToTmp() error {
	srcPath := "/secrets/cookie.txt"
	dstPath := "/tmp/cookie.txt"

	src, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := os.Create(dstPath)
	if err != nil {
		return err
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	if err != nil {
		return err
	}
	return nil
}

func IncrementClipCount(ctx context.Context, client *firestore.Client) error {
	_, err := client.Collection("stats").Doc("clips").Update(ctx, []firestore.Update{
		{
			Path:  "count",
			Value: firestore.Increment(1),
		},
	})
	return err
}