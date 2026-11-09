package middleware

import (
	"net/url"
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func isLoopbackOrigin(origin string) bool {
	originURL, err := url.Parse(strings.TrimSpace(origin))
	if err != nil {
		return false
	}

	host := strings.ToLower(strings.TrimSpace(originURL.Hostname()))
	if host != "localhost" && host != "127.0.0.1" && host != "::1" {
		return false
	}

	scheme := strings.ToLower(strings.TrimSpace(originURL.Scheme))
	return scheme == "http" || scheme == "https"
}

// CORSMiddleware sets up CORS configuration
func CORSMiddleware() gin.HandlerFunc {
	config := cors.DefaultConfig()

	// Default allowed origins list
	allowedOrigins := []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"http://localhost:3001",
		"http://127.0.0.1:3001",
		// Production origins
		"https://api.gilabs.id",
		"https://gims.gilabs.id",
		"https://salesview.id",
		"https://api-gione.gilabs.id",
		"https://www.salesview.id",
		"https://gims-api-688849728115.asia-southeast2.run.app",
		"https://meccayasuperapp.gilabs.id",
		"http://meccayasuperapp.gilabs.id",
	}

	// Add production origins from environment variable
	// Format: comma-separated list, e.g., "https://gilabs.id,https://www.gilabs.id"
	if envOrigins := os.Getenv("CORS_ALLOWED_ORIGINS"); envOrigins != "" {
		origins := strings.Split(envOrigins, ",")
		for _, origin := range origins {
			trimmed := strings.TrimSpace(origin)
			if trimmed != "" {
				// Check if already exists to avoid duplicates
				exists := false
				for _, existing := range allowedOrigins {
					if existing == trimmed {
						exists = true
						break
					}
				}
				if !exists {
					allowedOrigins = append(allowedOrigins, trimmed)
				}
			}
		}
	}

	allowedOriginSet := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		allowedOriginSet[origin] = struct{}{}
	}

	// Set AllowOrigins to nil so gin-contrib/cors relies on AllowOriginFunc
	config.AllowOrigins = nil
	config.AllowOriginFunc = func(origin string) bool {
		if _, ok := allowedOriginSet[origin]; ok {
			return true
		}

		if isAllowedDomain(origin) {
			return true
		}

		// Allow local development clients on arbitrary ports (e.g. Flutter web).
		return isLoopbackOrigin(origin)
	}
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{
		"Origin",
		"Content-Type",
		"Content-Length",
		"Accept-Encoding",
		"X-CSRF-Token",
		"Authorization",
		"Accept",
		"X-Requested-With",
		"X-Request-ID",
		"X-Idempotency-Key",
	}
	config.AllowCredentials = true
	config.ExposeHeaders = []string{
		"X-Request-ID",
		"X-RateLimit-Limit",
		"X-RateLimit-Remaining",
		"X-RateLimit-Reset",
		"X-CSRF-Token",
	}
	// Set max age for preflight requests (24 hours)
	config.MaxAge = 86400

	return cors.New(config)
}

func isAllowedDomain(origin string) bool {
	originURL, err := url.Parse(strings.TrimSpace(origin))
	if err != nil {
		return false
	}

	host := strings.ToLower(strings.TrimSpace(originURL.Hostname()))
	scheme := strings.ToLower(strings.TrimSpace(originURL.Scheme))
	if scheme != "http" && scheme != "https" {
		return false
	}

	// Allow all subdomains of gilabs.id and salesview.id
	if host == "gilabs.id" || strings.HasSuffix(host, ".gilabs.id") ||
		host == "salesview.id" || strings.HasSuffix(host, ".salesview.id") {
		return true
	}

	return false
}
