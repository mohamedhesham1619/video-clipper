package blocklist

import (
	"bufio"
	"log/slog"
	"net/url"
	"os"
	"strings"
)

// blocklistMap holds all blocked domains in memory
// Since the domains count is 437k, a map is used for O(1) lookups
// The estimated memory usage is around 20-30MB
var blocklistMap = make(map[string]bool)

// LoadFromFile loads blocked domains from the file into blocklistMap
func LoadFromFile(filename string) error {
	file, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		baseDomain := line[2:] // Remove "*." prefix
		blocklistMap[baseDomain] = true
	}

	return nil
}

// extractDomain extracts the domain from a URL string
func extractDomain(urlStr string) (string, error) {
	// Handle URL-encoded URLs
	if strings.Contains(urlStr, "%") {
		decoded, err := url.QueryUnescape(urlStr)
		if err != nil {
			return "", err
		}

		urlStr = decoded
	}

	// Parse the URL
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return "", err
	}

	// Return the hostname (domain)
	return strings.ToLower(parsedURL.Hostname()), nil
}

// extractAllDomains extracts all domains from a URL, including those in query parameters
//
// Example:
//
//	Input:  "https://example.com?redirect=https%3A%2F%2Fsub.example.org&page=1"
//	Output: []string{"example.com", "sub.example.org"}
//
//	Input:  "https://site.com?url=http://another.com&ref=https://example.com"
//	Output: []string{"site.com", "another.com", "example.com"}
func extractAllDomains(urlStr string) ([]string, error) {
	var domains []string

	// First, get the main domain
	mainDomain, err := extractDomain(urlStr)
	if err != nil {
		return domains, err
	}

	if mainDomain != "" {
		domains = append(domains, mainDomain)
	}

	// Parse the URL to check query parameters for embedded URLs
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return domains, err
	}

	// Check all query parameters for potential URLs
	queryParams := parsedURL.Query()
	for _, values := range queryParams {
		for _, value := range values {
			// Check if this parameter value looks like a URL, either plain or URL-encoded
			// If the parameter contains a URL, extract its domain and add it to domains list
			if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") || strings.HasPrefix(value, "//") {
				embeddedDomain, err := extractDomain(value)
				if err == nil && embeddedDomain != "" && embeddedDomain != mainDomain {
					domains = append(domains, embeddedDomain)
				}
			} else if strings.Contains(value, "%3A%2F%2F") || strings.Contains(value, "%2F%2F") {
				// This might be a URL-encoded URL
				decoded, err := url.QueryUnescape(value)
				if err == nil && (strings.HasPrefix(decoded, "http://") || strings.HasPrefix(decoded, "https://") || strings.HasPrefix(decoded, "//")) {
					embeddedDomain, err := extractDomain(decoded)
					if err == nil && embeddedDomain != "" && embeddedDomain != mainDomain {
						domains = append(domains, embeddedDomain)
					}
				}
			}
		}
	}

	return domains, nil
}

// isDomainBlocked checks if a specific domain exists in the blocked domains map
// It also checks parent domains to handle subdomains correctly
//
// For example, if "example.com" is blocked:
//   - "example.com" should be blocked
//   - "sub.example.com" should be blocked
//   - "sub.sub.example.com" should be blocked
//   - "notexample.com" should NOT be blocked
func isDomainBlocked(domain string) bool {
	if domain == "" {
		return false
	}

	// Split the domain into parts
	parts := strings.Split(domain, ".")

	// Check each possible suffix of the domain
	// For "sub.example.com", check: "sub.example.com", "example.com", "com"
	for i := 0; i < len(parts); i++ {
		suffix := strings.Join(parts[i:], ".")
		if _, exist := blocklistMap[suffix]; exist {
			return true
		}
	}

	return false
}

// IsBlocked checks if a URL should be blocked
// A domain is blocked if it matches exactly or is a subdomain of any blocked domain
// This function checks all domains found in the URL, including embedded ones
func IsBlocked(url string) bool {
	// Extract all domains from the URL (main domain + any embedded in query params)
	domains, err := extractAllDomains(url)

	if err != nil || len(domains) == 0 {
		slog.Warn("Failed to extract domains from URL", "url", url, "error", err)
		return false // If we can't parse the URL, we don't block it by default
	}

	// Check if any of the found domains are blocked
	for _, domain := range domains {
		if isDomainBlocked(domain) {
			return true
		}
	}

	return false
}
