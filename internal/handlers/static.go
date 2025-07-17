package handlers

import (
	"net/http"
	"path/filepath"
)

// homeHandler serves the main UI page
func HomeHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, filepath.Join("internal/web/static", "index.html"))
}

func ContactPageHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, filepath.Join("internal/web/static", "contact.html"))
}

func TermsPageHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, filepath.Join("internal/web/static", "terms.html"))
}

func PrivacyPageHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, filepath.Join("internal/web/static", "privacy.html"))
}

func SupportedSitesPageHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, filepath.Join("internal/web/static", "supported-sites.html"))
}

func FAQPageHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, filepath.Join("internal/web/static", "faq.html"))
}

func SharedJSHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/javascript")
	http.ServeFile(w, r, filepath.Join("internal/web/static", "shared.js"))
}

func SupportedSitesDataHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	http.ServeFile(w, r, filepath.Join("internal/data", "supported_sites.json"))
}

func FaviconHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "image/svg+xml")
	http.ServeFile(w, r, filepath.Join("internal/web/static", "favicon.svg"))
}

func RobotsTxtHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	http.ServeFile(w, r, filepath.Join("internal/web/static", "robots.txt"))
}

func SitemapXMLHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	http.ServeFile(w, r, filepath.Join("internal/web/static", "sitemap.xml"))
}
