package handlers

import (
	"clipper/internal/web"
	"net/http"
	"path/filepath"
)

// homeHandler serves the main UI page
func HomeHandler(w http.ResponseWriter, r *http.Request) {
	w.Write(web.UI)
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
	w.Header().Set("Cache-Control", "public, max-age=3600") // Cache for 1 hour
	http.ServeFile(w, r, filepath.Join("internal/data", "supported_sites.json"))
}
