package handlers

import (
	"clipper/internal/config"
	"clipper/internal/utils"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/smtp"
)

type feedbackRequest struct {
	Message string `json:"message"`
	Email   string `json:"email,omitempty"`
}

type feedbackResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

func FeedbackHandler(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var feedback feedbackRequest
		if err := json.NewDecoder(r.Body).Decode(&feedback); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate required message field
		if feedback.Message == "" {
			http.Error(w, "Message is required", http.StatusBadRequest)
			return
		}

		userIP := GetUserIP(r)

		slog.Info("Feedback received",
			"message", feedback.Message,
			"email", feedback.Email,
			"timestamp", utils.GetEgyptTime(),
			"userAgent", r.UserAgent(),
			"ip", userIP)

		// Send email if SMTP is configured
		if err := sendFeedbackEmail(cfg, feedback, r.UserAgent(), userIP); err != nil {
			slog.Error("Failed to send feedback email", "error", err)
			// Don't fail the request if email fails, just log it
		} else {
			slog.Info("Feedback email sent successfully")
		}

		response := feedbackResponse{
			Status:  "success",
			Message: "Thank you for your feedback!",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

func sendFeedbackEmail(cfg *config.Config, feedback feedbackRequest, userAgent, ip string) error {
	smtpHost := cfg.SMTP.Host
	smtpPort := cfg.SMTP.Port
	smtpUser := cfg.SMTP.Username
	smtpPass := cfg.SMTP.Password
	toEmail := cfg.SMTP.FeedbackMail

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
