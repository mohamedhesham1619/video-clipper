package cookie

import "sync"

var (
	youtubeCookiePaths = []string{
		"/app/cookie_1.txt",
		"/app/cookie_2.txt",
	}
	youtubeCookieIndex int
	youtubeCookieMu    sync.Mutex
)

// YouTube returns a YouTube cookie path, rotating through available cookies
func YouTube() string {
	youtubeCookieMu.Lock()
	defer youtubeCookieMu.Unlock()

	// Get the cookie at current index
	path := youtubeCookiePaths[youtubeCookieIndex]

	// Move to next index, wrap to 0 if we reach the end
	youtubeCookieIndex++
	
	if youtubeCookieIndex >= len(youtubeCookiePaths) {
		youtubeCookieIndex = 0
	}

	return path
}