package utils

import (
	"bufio"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
)

// GenerateID generates a random 8 characters ID.
func GenerateID() string {
	b := make([]byte, 6)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
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

// FindFileByID searches a directory for a file whose name starts with the given ID, and returns its full path if found.
// This is used because downloaded files follow the pattern: <ID><title>.<ext>
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

		if strings.HasPrefix(name, id) {
			return filepath.Join(directory, name), nil
		}
	}

	return "", os.ErrNotExist
}

// RemoveIDFromFileName removes the ID from the file name.
// It changes the file name from <ID><title>.<ext> to <title>.<ext> and returns the new file path.
func RemoveIDFromFileName(filePath string, id string) (string, error) {
	if id == "" {
		return "", fmt.Errorf("id cannot be empty")
	}

	dir := filepath.Dir(filePath)
	original := filepath.Base(filePath)

	if !strings.HasPrefix(original, id) {
		return "", fmt.Errorf("filename does not start with the expected id")
	}

	// Strip the ID
	newName := original[len(id):]

	// Ensure the new name is not empty
	if newName == "" {
		return "", fmt.Errorf("cannot rename, resulting filename is empty")
	}

	newPath := filepath.Join(dir, newName)

	// Perform the rename
	if err := os.Rename(filePath, newPath); err != nil {
		return "", fmt.Errorf("error renaming file: %w", err)
	}

	return newPath, nil

}

// LogStderr reads from a stderr pipe and logs each line
func LogStderr(pipe io.ReadCloser, processID string, command string) {

	scanner := bufio.NewScanner(pipe)
	for scanner.Scan() {
		line := scanner.Text()
		if line != "" {
			slog.Error(line,
				"processId", processID,
				"command", command,
				"source", "stderr",
			)
		}
	}
}
