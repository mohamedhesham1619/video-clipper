package server

import (
	"clipper/internal/handlers"
	"log/slog"
	"net/http"
	"os"
)

type Server struct {
	mux *http.ServeMux
}

func New() *Server {
	mux := http.NewServeMux()

	// Register routes
	mux.HandleFunc("/", handlers.HomeHandler)
	mux.HandleFunc("/submit", handlers.SubmitHandler)
	mux.HandleFunc("/progress/", handlers.ProgressHandler)
	mux.HandleFunc("/download/", handlers.DownloadHandler)
	mux.HandleFunc("/feedback", handlers.FeedbackHandler)
	mux.HandleFunc("/contact", handlers.ContactPageHandler)
	mux.HandleFunc("/terms", handlers.TermsPageHandler)
	mux.HandleFunc("/privacy", handlers.PrivacyPageHandler)
	mux.HandleFunc("/supported-sites", handlers.SupportedSitesPageHandler)
	mux.HandleFunc("/faq", handlers.FAQPageHandler)
	mux.HandleFunc("/shared.js", handlers.SharedJSHandler)
	mux.HandleFunc("/api/supported-sites", handlers.SupportedSitesDataHandler)
	mux.HandleFunc("/favicon.svg", handlers.FaviconHandler)

	return &Server{mux: mux}
}

func (s *Server) Start() error {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	slog.Info("Server started on port " + port)
	return http.ListenAndServe(":"+port, s.mux)
}
