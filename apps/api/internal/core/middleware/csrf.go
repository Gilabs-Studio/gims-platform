package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"net"
	"net/http"
	"net/url"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"github.com/gin-gonic/gin"
)

// generateToken creates a random 32-byte hex string
func generateToken() string {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return ""
	}
	return hex.EncodeToString(bytes)
}

func shouldUseCrossSiteCSRFCookie(c *gin.Context) bool {
	if config.AppConfig != nil {
		env := strings.ToLower(strings.TrimSpace(config.AppConfig.Server.Env))
		if env == "production" || env == "prod" {
			return true
		}
	}

	origin := strings.TrimSpace(c.GetHeader("Origin"))
	if origin == "" {
		return false
	}

	originURL, err := url.Parse(origin)
	if err != nil || originURL.Host == "" {
		return false
	}

	requestHost := c.Request.Host
	if host, _, err := net.SplitHostPort(requestHost); err == nil {
		requestHost = host
	}

	originHost := originURL.Hostname()
	requestHostname := requestHost
	if requestHostname == "" {
		requestHostname = c.Request.URL.Hostname()
	}

	return !strings.EqualFold(originHost, requestHostname)
}

// CSRF middleware implements the Double-Submit Cookie pattern
func CSRF() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Check for existing CSRF cookie
		token, err := c.Cookie("gims_csrf_token")
		
		// 2. If no cookie, generate a new one and set it
		if err != nil || token == "" {
			token = generateToken()
			if token == "" {
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error": gin.H{
						"code":    "INTERNAL_SERVER_ERROR",
						"message": "Failed to generate CSRF token",
					},
				})
				return
			}
			setCSRFCookie(c, token)
		}

		// ALWAYS expose the current token in the header so frontend can read it (cross-origin support)
		c.Header("X-CSRF-Token", token)

		// Exclude webhooks and external API endpoints that do not use browser sessions
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api/v1/crm/leads/upsert") {
			c.Next()
			return
		}

		// 3. For safe methods, just proceed
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		// 4. For unsafe methods, validate header against cookie
		requestToken := c.GetHeader("X-CSRF-Token")
		
		if requestToken == "" || requestToken != token {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "CSRF_INVALID",
					"message": "Invalid or missing CSRF token",
				},
			})
			return
		}

		c.Next()
	}
}

// setCSRFCookie sets the non-HttpOnly cookie so frontend can read it
func setCSRFCookie(c *gin.Context, token string) {
	isSecure := false
	sameSite := http.SameSiteLaxMode

	if shouldUseCrossSiteCSRFCookie(c) {
		// Cross-site browser requests require SameSite=None and Secure=true.
		isSecure = true
		sameSite = http.SameSiteNoneMode
	}

	c.SetSameSite(sameSite)

	// Note: HttpOnly is FALSE so JavaScript can read it and send in header (Double-Submit Cookie pattern)
	c.SetCookie("gims_csrf_token", token, 3600*24, "/", "", isSecure, false)
}
