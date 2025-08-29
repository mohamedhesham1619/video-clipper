package handlers

import (
	"clipper/internal/models"
	"clipper/internal/utils"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/smtp"
	"os"
)

func FeedbackHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var feedback models.FeedbackRequest
	if err := json.NewDecoder(r.Body).Decode(&feedback); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required message field
	if feedback.Message == "" {
		http.Error(w, "Message is required", http.StatusBadRequest)
		return
	}

	slog.Info("Feedback received",
		"message", feedback.Message,
		"email", feedback.Email,
		"timestamp", utils.GetEgyptTime(),
		"userAgent", r.UserAgent(),
		"ip", r.RemoteAddr)

	// Send email if SMTP is configured
	if os.Getenv("SMTP_HOST") != "" {
		if err := sendFeedbackEmail(feedback, r.UserAgent(), r.RemoteAddr); err != nil {
			slog.Error("Failed to send feedback email", "error", err)
			// Don't fail the request if email fails, just log it
		} else {
			slog.Info("Feedback email sent successfully")
		}
	} else {
		slog.Info("SMTP not configured, feedback logged only")
	}

	response := models.FeedbackResponse{
		Status:  "success",
		Message: "Thank you for your feedback!",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func sendFeedbackEmail(feedback models.FeedbackRequest, userAgent, ip string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	toEmail := os.Getenv("FEEDBACK_EMAIL")

	if smtpHost == "" || smtpUser == "" || smtpPass == "" || toEmail == "" {
		return fmt.Errorf("missing SMTP configuration")
	}

	subject := "[VideoClipper Feedback] New Feedback Received"

	// Create a nicely formatted email body
	body := fmt.Sprintf(`
New feedback received from VideoClipper!

📝 Message:
%s

📧 User Email: %s
🌐 User Agent: %s
📍 IP Address: %s
⏰ Timestamp: %s

---
This feedback was sent from the VideoClipper contact form.
	`,
		feedback.Message,
		feedback.Email,
		userAgent,
		ip,
		utils.GetEgyptTime())

	// Prepare email headers
	headers := fmt.Sprintf("To: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n", toEmail, subject)
	msg := headers + body

	// Send email
	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
	return smtp.SendMail(smtpHost+":"+smtpPort, auth, smtpUser, []string{toEmail}, []byte(msg))
}
