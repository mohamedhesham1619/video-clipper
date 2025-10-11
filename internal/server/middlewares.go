package server

import (
	"clipper/internal/credits"
	"clipper/internal/handlers"
	"clipper/internal/models"
	"clipper/internal/utils"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

// blocks requests without a valid fingerprint
func validateFPMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fp := r.Header.Get("X-Client-FP")
		if len(fp) != 64 {
			http.Error(w, "Bad Request", http.StatusBadRequest) // Intentionally vague message
			return
		}
		next.ServeHTTP(w, r)
	})
}

func validateCreditsMiddleware(creditsStore *credits.CreditsStore, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// Get user IP and fingerprint
		ip := handlers.GetUserIP(r)
		fp := r.Header.Get("X-Client-FP")

		// Read the request
		var videoRequest models.VideoRequest
		if err := json.NewDecoder(r.Body).Decode(&videoRequest); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate quality
		if videoRequest.Quality == "" || videoRequest.Quality != "480" && videoRequest.Quality != "720" && videoRequest.Quality != "1080" && videoRequest.Quality != "1440" {
			http.Error(w, "Invalid quality", http.StatusBadRequest)
			return
		}

		// Calculate clip duration in seconds
		clipDurationInSeconds, err := utils.CalculateDurationSeconds(videoRequest.ClipStart, videoRequest.ClipEnd)
		if err != nil {
			http.Error(w, "Invalid clip duration", http.StatusBadRequest)
			return
		}

		// Calculate the needed credits
		creditsCost := credits.CalculateCreditCost(clipDurationInSeconds, fmt.Sprintf("%vp", videoRequest.Quality))

		// Get credits info if the user has any 
		// If the user has no credits (first time), a new credit entry with max credits will be created
		creditsInfo := creditsStore.GetUserCredits(ip, fp)

		// Check if the user has enough credits to download the requested clip
		if !creditsInfo.HasEnoughCredits(creditsCost) {
			http.Error(w, "Credit limit exceeded", http.StatusTooManyRequests)
			return
		}

		// Add video request to context so it can be used in the submit handler
		ctx := context.WithValue(r.Context(), "videoRequest", videoRequest)
		r = r.WithContext(ctx)

		// Continue with the request
		next.ServeHTTP(w, r)
	})
}
