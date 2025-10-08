package server

import (
	"clipper/internal/config"
	"clipper/internal/handlers"
	"log/slog"
	"net/http"
	"os"
	"time"
)

type Server struct {
	mux *http.ServeMux
}

func New(cfg *config.Config) *Server {
	mux := http.NewServeMux()

	// Rate limiters
	// 2 layers of protection: IP and fingerprint
	ipLimiter := ipLimiterMiddleware(2, 2*time.Hour)
	fpLimiter := fpLimiterMiddleware(2, 2*time.Hour)

	// Main app routes
	mux.HandleFunc("/", handlers.HomeHandler)
	mux.Handle("/submit", validateFPMiddleware(ipLimiter.Handler(fpLimiter.Handler(handlers.SubmitHandler(cfg)))))
	mux.HandleFunc("/progress/", handlers.ProgressHandler)
	mux.HandleFunc("/cancel/", handlers.CancelHandler)
	mux.HandleFunc("/feedback", handlers.FeedbackHandler(cfg))
	mux.HandleFunc("/stats/clips", handlers.StatsHandler(cfg))
	mux.HandleFunc("/download/", handlers.DownloadHandler)

	// Static page routes
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
