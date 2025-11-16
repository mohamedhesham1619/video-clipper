package server

import (
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/ulule/limiter/v3"
	limiterMiddleware "github.com/ulule/limiter/v3/drivers/middleware/stdlib"
	memoryStore "github.com/ulule/limiter/v3/drivers/store/memory"
)

// limits requests per IP
func ipLimiterMiddleware(limit int64, period time.Duration) *limiterMiddleware.Middleware {
	limitStore := memoryStore.NewStore()
	rate := limiter.Rate{
		Period: period,
		Limit:  limit,
	}
	limiterInstance := limiter.New(limitStore, rate)

	// Extract the real client IP address, prioritizing CF-Connecting-IP from Cloudflare
	// to ensure the actual user IP is used instead of Cloudflare's proxy address.
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
	return limiterMiddleware.NewMiddleware(
		limiterInstance,
		limiterMiddleware.WithKeyGetter(keyGetter),
	)
}

// limits requests per fingerprint
func fpLimiterMiddleware(limit int64, period time.Duration) *limiterMiddleware.Middleware {
	limitStore := memoryStore.NewStore()
	rate := limiter.Rate{
		Period: period,
		Limit:  limit,
	}
	limiterInstance := limiter.New(limitStore, rate)

	// Use the fingerprint as the key
	keyGetter := func(r *http.Request) string {
		return r.Header.Get("X-Client-FP")
	}

	return limiterMiddleware.NewMiddleware(
		limiterInstance,
		limiterMiddleware.WithKeyGetter(keyGetter),
	)
}