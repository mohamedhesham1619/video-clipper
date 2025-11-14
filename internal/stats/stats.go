package stats

import (
	"clipper/internal/config"
	"clipper/internal/utils"
	"context"
	"fmt"
	"log/slog"
	"net/smtp"
	"sync/atomic"
	"time"

	"cloud.google.com/go/firestore"
)

// IncrementStat increments the stat for the given type (clips or gifs) in the Firestore database
func IncrementStat(fireStoreClient *firestore.Client, statType string) error {
	_, err := fireStoreClient.Collection("stats").Doc(statType).Update(context.Background(), []firestore.Update{
		{
			Path:  "count",
			Value: firestore.Increment(1),
		},
	})
	return err
}

// --- Failed downloads ---
var failedDownloadsCount int64 = 0

const alertThreshold int64 = 15

// IncrementFailedDownloadsAndNotify increments the failed downloads count and sends an alert if the threshold is reached
func IncrementFailedDownloadsAndNotify(smtpConfig config.SMTPConfig) {
	atomic.AddInt64(&failedDownloadsCount, 1)
	if failedDownloadsCount >= alertThreshold {
		err := sendAlert(smtpConfig)
		if err != nil {
			slog.Error("Failed to send alert email", "error", err)
		} else {
			resetFailedDownloadsCount()
		}
	}
}

func resetFailedDownloadsCount() {
	atomic.StoreInt64(&failedDownloadsCount, 0)
}

func sendAlert(smtpConfig config.SMTPConfig) error {
	smtpHost := smtpConfig.Host
	smtpPort := smtpConfig.Port
	smtpUser := smtpConfig.Username
	smtpPass := smtpConfig.Password
	toEmail := smtpConfig.FeedbackMail

	subject := "[VideoClipper Alert] Failed Downloads"

	body := fmt.Sprintf(`
New failed downloads alert from VideoClipper!

Failed downloads count: %d
Timestamp: %s
`, failedDownloadsCount, utils.GetEgyptTime())

	// Prepare email headers and message
	headers := fmt.Sprintf("To: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n", toEmail, subject)
	msg := headers + body

	// Send email
	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
	return smtp.SendMail(smtpHost+":"+smtpPort, auth, smtpUser, []string{toEmail}, []byte(msg))

}

// StartFailedDownloadsCountReset starts a goroutine that resets the failed downloads count at regular intervals
func StartFailedDownloadsCountReset(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			resetFailedDownloadsCount()
		}
	}()
}
