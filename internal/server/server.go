package server

import (
	"clipper/internal/config"
	"clipper/internal/handlers"
	"log/slog"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/ulule/limiter/v3"
	limiterMiddleware "github.com/ulule/limiter/v3/drivers/middleware/stdlib"
	memoryStore "github.com/ulule/limiter/v3/drivers/store/memory"
)

type Server struct {
	mux *http.ServeMux
}

func New(cfg *config.Config) *Server {
	mux := http.NewServeMux()

	// Rate limiter: 4 requests per 2 hours per IP
	limiterStore := memoryStore.NewStore()
	rate := limiter.Rate{
		Limit:  4,
		Period: 2 * time.Hour,
	}
	limiterInstance := limiter.New(limiterStore, rate)

	// Custom key getter: use CF-Connecting-IP (or fallback to RemoteAddr)
	keyGetter := func(r *http.Request) string {
		if ip := r.Header.Get("CF-Connecting-IP"); ip != "" {
			return ip
		}
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			parts := strings.Split(xff, ",")
			return strings.TrimSpace(parts[0])
		}
		host, _, err := net.SplitHostPort(r.RemoteAddr)
		if err == nil {
			return host
		}
		return r.RemoteAddr
	}

	limiterMw := limiterMiddleware.NewMiddleware(
		limiterInstance,
		limiterMiddleware.WithKeyGetter(keyGetter),
	)

	// Main app routes
	mux.HandleFunc("/", handlers.HomeHandler)
	mux.Handle("/submit", limiterMw.Handler(handlers.SubmitHandler(cfg)))
	mux.HandleFunc("/progress/", handlers.ProgressHandler)
	mux.HandleFunc("/cancel/", handlers.CancelHandler)
	mux.HandleFunc("/feedback", handlers.FeedbackHandler(cfg))
	mux.HandleFunc("/stats/clips", handlers.StatsHandler(cfg))

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
