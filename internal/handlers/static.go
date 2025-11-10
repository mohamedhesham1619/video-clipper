package handlers

import (
	"net/http"
	"path/filepath"
)

// homeHandler serves the main UI page
func HomeHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, filepath.Join("internal/web", "index.html"))
}

func GifHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/gif/" {
		http.Redirect(w, r, "/gif", http.StatusMovedPermanently)
		return
	}
	if r.URL.Path != "/gif" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, filepath.Join("internal/web", "gif.html"))
}
func ContactPageHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/contact/" {
		http.Redirect(w, r, "/contact", http.StatusMovedPermanently)
		return
	}
	if r.URL.Path != "/contact" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, filepath.Join("internal/web/pages", "contact.html"))
}

func TermsPageHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/terms/" {
		http.Redirect(w, r, "/terms", http.StatusMovedPermanently)
		return
	}
	if r.URL.Path != "/terms" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, filepath.Join("internal/web/pages", "terms.html"))
}

func PrivacyPageHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/privacy/" {
		http.Redirect(w, r, "/privacy", http.StatusMovedPermanently)
		return
	}
	if r.URL.Path != "/privacy" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, filepath.Join("internal/web/pages", "privacy.html"))
}

func SupportedSitesPageHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/supported-sites/" {
		http.Redirect(w, r, "/supported-sites", http.StatusMovedPermanently)
		return
	}
	if r.URL.Path != "/supported-sites" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, filepath.Join("internal/web/pages", "supported-sites.html"))
}

func FAQPageHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/faq/" {
		http.Redirect(w, r, "/faq", http.StatusMovedPermanently)
		return
	}
	if r.URL.Path != "/faq" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, filepath.Join("internal/web/pages", "faq.html"))
}

func RobotsTxtHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/robots.txt" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	http.ServeFile(w, r, filepath.Join("internal/web/", "robots.txt"))
}

func SitemapXMLHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/sitemap.xml" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	http.ServeFile(w, r, filepath.Join("internal/web/", "sitemap.xml"))
}

func YouTubeGuideHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/cut-youtube-video-online/" {
		http.Redirect(w, r, "/cut-youtube-video-online", http.StatusMovedPermanently)
		return
	}
	if r.URL.Path != "/cut-youtube-video-online" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, filepath.Join("internal/web/pages/guides", "cut-youtube-video-online.html"))
}

func GeneralGuideHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/trim-videos-online/" {
		http.Redirect(w, r, "/trim-videos-online", http.StatusMovedPermanently)
		return
	}
	if r.URL.Path != "/trim-videos-online" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, filepath.Join("internal/web/pages/guides", "trim-videos-online.html"))
}
