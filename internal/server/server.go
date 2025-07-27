package server

import (
	"clipper/internal/handlers"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/ulule/limiter/v3"
	limiterMiddleware "github.com/ulule/limiter/v3/drivers/middleware/stdlib"
	memoryStore "github.com/ulule/limiter/v3/drivers/store/memory"
)

type Server struct {
	mux *http.ServeMux
}

func New() *Server {
	mux := http.NewServeMux()

	// Rate limiter: 3 requests per 30 minutes per IP for /submit
	limiterStore := memoryStore.NewStore()
	rate := limiter.Rate{
		Limit:  3,
		Period: 30 * time.Minute,
	}
	limiterInstance := limiter.New(limiterStore, rate)
	limiterMw := limiterMiddleware.NewMiddleware(limiterInstance)

	// Main app routes
	mux.HandleFunc("/", handlers.HomeHandler)
	mux.Handle("/submit", limiterMw.Handler(http.HandlerFunc(handlers.SubmitHandler)))
	mux.HandleFunc("/progress/", handlers.ProgressHandler)
	mux.HandleFunc("/download/", handlers.DownloadHandler)
	mux.HandleFunc("/feedback", handlers.FeedbackHandler)

	// Static page routes
	mux.HandleFunc("/contact", handlers.ContactPageHandler)
	mux.HandleFunc("/terms", handlers.TermsPageHandler)
	mux.HandleFunc("/privacy", handlers.PrivacyPageHandler)
	mux.HandleFunc("/supported-sites", handlers.SupportedSitesPageHandler)
	mux.HandleFunc("/faq", handlers.FAQPageHandler)

	// Static asset routes
	mux.HandleFunc("/shared.js", handlers.SharedJSHandler)
	mux.HandleFunc("/favicon.svg", handlers.FaviconHandler)
	mux.HandleFunc("/favicon.png", handlers.FaviconPNGHandler)

	// Serve all files under /static/ from internal/web/static
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("internal/web/static"))))

	// SEO/static root files
	mux.HandleFunc("/robots.txt", handlers.RobotsTxtHandler)
	mux.HandleFunc("/sitemap.xml", handlers.SitemapXMLHandler)

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
