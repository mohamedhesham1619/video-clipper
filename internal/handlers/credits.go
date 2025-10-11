package handlers

import (
	"clipper/internal/credits"
	"encoding/json"
	"net/http"
	"time"
)

// CreditsHandler returns the credits left for the user and the reset time
func CreditsHandler(creditsStore *credits.CreditsStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		ip := GetUserIP(r)
		fp := r.Header.Get("X-Client-FP")
		creditsInfo := creditsStore.GetUserCredits(ip, fp)

		w.Header().Set("Content-Type", "application/json")

		resp := map[string]interface{}{
			"credits_left": creditsInfo.CreditsLeft,
			"reset_time":   creditsInfo.ResetTime.Format(time.RFC3339),
		}

		json.NewEncoder(w).Encode(resp)
	}
}
