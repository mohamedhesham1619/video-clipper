package server

import (
	"clipper/internal/config"
	"clipper/internal/credits"
	"clipper/internal/handlers"
	"log/slog"
	"net/http"
	"os"
)

type Server struct {
	mux *http.ServeMux
}

func New(cfg *config.Config, creditsStore *credits.CreditsStore) *Server {
	mux := http.NewServeMux()

	// API routes
	mux.Handle("/api/submit", validateFPMiddleware(validateCreditsMiddleware(creditsStore, handlers.SubmitHandler(cfg))))
	mux.HandleFunc("/api/progress/", handlers.ProgressHandler(creditsStore))
	mux.HandleFunc("/api/cancel/", handlers.CancelHandler)
	mux.HandleFunc("/api/feedback", handlers.FeedbackHandler(cfg))
	mux.HandleFunc("/api/stats/clips", handlers.StatsHandler(cfg))
	mux.HandleFunc("/api/download/", handlers.DownloadHandler)
	mux.HandleFunc("/api/credits", handlers.CreditsHandler(creditsStore))

	// Static page routes
	mux.HandleFunc("/", handlers.HomeHandler)
	mux.HandleFunc("/contact", handlers.ContactPageHandler)
	mux.HandleFunc("/terms", handlers.TermsPageHandler)
	mux.HandleFunc("/privacy", handlers.PrivacyPageHandler)
	mux.HandleFunc("/supported-sites", handlers.SupportedSitesPageHandler)
	mux.HandleFunc("/faq", handlers.FAQPageHandler)

	// Guide pages
	mux.HandleFunc("/cut-youtube-video-online", handlers.YouTubeGuideHandler)
	mux.HandleFunc("/trim-videos-online", handlers.GeneralGuideHandler)

	// SEO/static root files
	fs := http.FileServer(http.Dir("internal/web/"))
	mux.Handle("/css/", fs)
	mux.Handle("/js/", fs)
	mux.Handle("/images/", fs)
	mux.Handle("/components/", fs)
	mux.HandleFunc("/robots.txt", handlers.RobotsTxtHandler)
	mux.HandleFunc("/sitemap.xml", handlers.SitemapXMLHandler)
	mux.Handle("/favicon.ico", http.FileServer(http.Dir("internal/web/images")))

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
