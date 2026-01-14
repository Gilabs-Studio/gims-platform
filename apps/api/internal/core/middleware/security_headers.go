package middleware

import "github.com/gin-gonic/gin"

// SecurityHeadersMiddleware adds baseline security headers.
// Safe for APIs and helps prevent common browser-based attacks.
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("Referrer-Policy", "no-referrer")
		c.Header("X-Frame-Options", "DENY")
		c.Next()
	}
}
