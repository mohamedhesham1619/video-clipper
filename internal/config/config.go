package config

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"cloud.google.com/go/firestore"
)

type SMTPConfig struct {
	Host         string
	Port         string
	Username     string
	Password     string
	FeedbackMail string
}

type AppConfig struct {
	Environment  string
	DownloadPath string
}

type GoogleCloudConfig struct {
	ProjectID       string
	CredentialsPath string
	Firestore       *firestore.Client
}

type YouTubeConfig struct {
	CookiePath string
}

type RateLimitConfig struct {
	MaxCredits float64
	ResetDuration time.Duration
}

type Config struct {
	SMTP        SMTPConfig
	App         AppConfig
	GoogleCloud GoogleCloudConfig
	YouTube     YouTubeConfig
	RateLimit   RateLimitConfig
}

// Close closes the Firestore client
func (c *Config) Close() {
	if c.GoogleCloud.Firestore != nil {
		c.GoogleCloud.Firestore.Close()
	}
}

// Load loads and validates the configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		SMTP: SMTPConfig{
			Host:         getEnv("SMTP_HOST"),
			Port:         getEnv("SMTP_PORT"),
			Username:     getEnv("SMTP_USER"),
			Password:     getEnv("SMTP_PASS"),
			FeedbackMail: getEnv("FEEDBACK_EMAIL"),
		},
		App: AppConfig{
			Environment:  getEnv("ENV"),
			DownloadPath: getEnv("DOWNLOAD_PATH"),
		},
		GoogleCloud: GoogleCloudConfig{
			ProjectID:       getEnv("GC_PROJECT_ID"),
			CredentialsPath: getEnv("GOOGLE_APPLICATION_CREDENTIALS"),
		},
		YouTube: YouTubeConfig{
			CookiePath: getEnv("YOUTUBE_COOKIE_PATH"),
		},
	}

	// Validate required configurations
	if cfg.SMTP.Username == "" || cfg.SMTP.Password == "" {
		return nil, fmt.Errorf("SMTP username and password environment variables are required")
	}

	if cfg.SMTP.FeedbackMail == "" {
		return nil, fmt.Errorf("FEEDBACK_EMAIL environment variable is required")
	}

	if cfg.GoogleCloud.ProjectID == "" {
		return nil, fmt.Errorf("GC_PROJECT_ID environment variable is required")
	}

	// Ensure download directory exists
	if err := os.MkdirAll(cfg.App.DownloadPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create download directory: %w", err)
	}

	// Ensure Google Cloud credentials environment variable is set
	if cfg.GoogleCloud.CredentialsPath == "" {
		return nil, fmt.Errorf("GOOGLE_APPLICATION_CREDENTIALS environment variable is required")
	}else{
		// Ensure Google Cloud credentials file exists
		if _, err := os.Stat(cfg.GoogleCloud.CredentialsPath); os.IsNotExist(err) {
			return nil, fmt.Errorf("Google Cloud credentials file not found at %s", cfg.GoogleCloud.CredentialsPath)
		}
	}

	// Ensure YouTube cookie environment variable is set
	if cfg.YouTube.CookiePath == "" {
		return nil, fmt.Errorf("YOUTUBE_COOKIE environment variable is required")
	}else{
		// Ensure YouTube cookie file exists
		if _, err := os.Stat(cfg.YouTube.CookiePath); os.IsNotExist(err) {
			return nil, fmt.Errorf("YouTube cookie file not found at %s", cfg.YouTube.CookiePath)
		}
	}

	// Initialize Firestore client and set it to the config
	firestoreClient, err := firestore.NewClient(context.Background(), cfg.GoogleCloud.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("failed to create Firestore client: %w", err)
	}
	cfg.GoogleCloud.Firestore = firestoreClient

	// Initialize rate limit configuration
	maxCredits := getEnv("MAX_CREDITS")
	if maxCredits == "" {
		return nil, fmt.Errorf("MAX_CREDITS environment variable is required")
	}
	cfg.RateLimit.MaxCredits, err = strconv.ParseFloat(maxCredits, 64)
	if err != nil {
		return nil, fmt.Errorf("failed to convert MAX_CREDITS environment variable to float64: %w", err)
	}

	resetDuration := getEnv("CREDITS_RESET_DURATION")
	if resetDuration == "" {
		return nil, fmt.Errorf("CREDITS_RESET_DURATION environment variable is required")
	}
	cfg.RateLimit.ResetDuration, err = time.ParseDuration(resetDuration)
	if err != nil {
		return nil, fmt.Errorf("failed to convert CREDITS_RESET_DURATION environment variable to time.Duration: %w", err)
	}

	return cfg, nil
}

// getEnv returns the value of the environment variable with the given key.
// If the environment variable does not exist, it returns an empty string.
func getEnv(key string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return ""
}
