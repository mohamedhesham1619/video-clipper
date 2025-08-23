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

	// Rate limiter: 3 requests per 120 minutes per IP for /submit
	limiterStore := memoryStore.NewStore()
	rate := limiter.Rate{
		Limit:  3,
		Period: 120 * time.Minute,
	}
	limiterInstance := limiter.New(limiterStore, rate)
	limiterMw := limiterMiddleware.NewMiddleware(limiterInstance)

	// Main app routes
	mux.HandleFunc("/", handlers.HomeHandler)
	mux.Handle("/submit", limiterMw.Handler(http.HandlerFunc(handlers.SubmitHandler)))
	mux.HandleFunc("/progress/", handlers.ProgressHandler)
	mux.HandleFunc("/download/", handlers.DownloadHandler)
	mux.HandleFunc("/cancel/", handlers.CancelHandler)
	mux.HandleFunc("/feedback", handlers.FeedbackHandler)
	mux.HandleFunc("/check-ytdlp-update", handlers.CheckForYtDlpUpdateHandler)

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
