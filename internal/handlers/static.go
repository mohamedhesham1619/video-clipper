package handlers

import (
	"net/http"
	"path/filepath"
)

// homeHandler serves the main UI page
func HomeHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, filepath.Join("internal/web", "index.html"))
}

func ContactPageHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, filepath.Join("internal/web/pages", "contact.html"))
}

func TermsPageHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, filepath.Join("internal/web/pages", "terms.html"))
}

func PrivacyPageHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, filepath.Join("internal/web/pages", "privacy.html"))
}

func SupportedSitesPageHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, filepath.Join("internal/web/pages", "supported-sites.html"))
}

func FAQPageHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, filepath.Join("internal/web/pages", "faq.html"))
}

func RobotsTxtHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	http.ServeFile(w, r, filepath.Join("internal/web/", "robots.txt"))
}

func SitemapXMLHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	http.ServeFile(w, r, filepath.Join("internal/web/", "sitemap.xml"))
}
