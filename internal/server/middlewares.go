package server

import (
	"clipper/internal/credits"
	"clipper/internal/handlers"
	"clipper/internal/models"
	"clipper/internal/utils"
	"context"
	"encoding/json"
	"net/http"
)

// blocks requests without a valid fingerprint
func validateFingerPrintMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fp := r.Header.Get("X-Client-FP")
		if len(fp) != 64 {
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func validateClipRequestMiddleware(creditsStore *credits.CreditsStore, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// Get user IP and fingerprint
		ip := handlers.GetUserIP(r)
		fp := r.Header.Get("X-Client-FP")

		// Read the request
		var videoRequest models.ClipRequest
		if err := json.NewDecoder(r.Body).Decode(&videoRequest); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate quality
		if videoRequest.Quality != 480 && videoRequest.Quality != 720 && videoRequest.Quality != 1080 && videoRequest.Quality != 1440 {
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
		creditsCost := credits.CalculateClipCreditCost(clipDurationInSeconds, videoRequest.Quality)

		// Get credits info if the user has any
		// If the user has no credits info (first time), a new credit entry with max credits will be created
		userCreditsInfo := creditsStore.GetUserCredits(ip, fp)

		// Check if the user has enough credits to download the requested clip
		if !userCreditsInfo.HasEnoughCredits(creditsCost) {
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

func validateGIFRequestMiddleware(creditsStore *credits.CreditsStore, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// Get user IP and fingerprint
		ip := handlers.GetUserIP(r)
		fp := r.Header.Get("X-Client-FP")

		// Read the request
		var gifRequest models.GIFRequest
		if err := json.NewDecoder(r.Body).Decode(&gifRequest); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate width
		if gifRequest.Width != 320 && gifRequest.Width != 480 && gifRequest.Width != 720 {
			http.Error(w, "Invalid width", http.StatusBadRequest)
			return
		}

		// Validate fps
		if gifRequest.FPS != 10 && gifRequest.FPS != 15 && gifRequest.FPS != 20{
			http.Error(w, "Invalid fps", http.StatusBadRequest)
			return
		}

		// Validate speed
		if gifRequest.Speed != 0.5 && gifRequest.Speed != 1.0 && gifRequest.Speed != 1.5 && gifRequest.Speed != 2.0 {
			http.Error(w, "Invalid speed", http.StatusBadRequest)
			return
		}

		// Validate loops
		if gifRequest.Loops != 0 && gifRequest.Loops != 1 && gifRequest.Loops != 2 && gifRequest.Loops != 3 {
			http.Error(w, "Invalid loops", http.StatusBadRequest)
			return
		}

		// Validate gif length
		lengthInSeconds, err := utils.CalculateDurationSeconds(gifRequest.VideoStart, gifRequest.VideoEnd)
		if err != nil || lengthInSeconds < 1 || lengthInSeconds > 60 {
			http.Error(w, "Invalid GIF length", http.StatusBadRequest)
			return
		}

		// Validate gif duration
		gifDurationInSeconds, err := utils.CalculateDurationSeconds(gifRequest.VideoStart, gifRequest.VideoEnd)
		if err != nil {
			http.Error(w, "Invalid GIF duration", http.StatusBadRequest)
			return
		}

		// Calculate the needed credits
		creditsCost := credits.CalculateGIFCreditCost(gifDurationInSeconds, gifRequest.Width, gifRequest.FPS, gifRequest.Speed)

		// Get credits info if the user has any
		// If the user has no credits info (first time), a new credit entry with max credits will be created
		userCreditsInfo := creditsStore.GetUserCredits(ip, fp)

		// Check if the user has enough credits to download the requested GIF
		if !userCreditsInfo.HasEnoughCredits(creditsCost) {
			http.Error(w, "Insufficient credits", http.StatusTooManyRequests)
			return
		}

		// Add GIF request to context so it can be used in the submit handler
		ctx := context.WithValue(r.Context(), "gifRequest", gifRequest)
		r = r.WithContext(ctx)

		// Continue with the request
		next.ServeHTTP(w, r)
	})
}
