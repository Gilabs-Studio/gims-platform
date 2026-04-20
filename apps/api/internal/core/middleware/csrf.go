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

func abortCSRFFailedToGenerate(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
		"success": false,
		"error": gin.H{
			"code":    "INTERNAL_SERVER_ERROR",
			"message": "Failed to generate CSRF token",
		},
	})
}

func ensureCSRFCookie(c *gin.Context) (string, bool) {
	token, err := c.Cookie("gims_csrf_token")
	if err == nil && token != "" {
		return token, true
	}

	token = generateToken()
	if token == "" {
		abortCSRFFailedToGenerate(c)
		return "", false
	}

	setCSRFCookie(c, token)
	return token, true
}

func isPublicFeedbackSubmit(method, path string) bool {
	return method == http.MethodPost && strings.HasPrefix(path, "/api/v1/public/feedback/") && strings.HasSuffix(path, "/submit")
}

func shouldSkipCSRFMiddleware(c *gin.Context, path string) bool {
	if isCRMLeadUpsertWebhookRequest(c.Request.Method, path) {
		return true
	}

	// System admin login/logout uses separate cookie auth flow.
	if strings.HasPrefix(path, "/internal/sys-login") || strings.HasPrefix(path, "/internal/sys-logout") {
		return true
	}

	// Public feedback submission uses one-time URL token, not browser session CSRF.
	return isPublicFeedbackSubmit(c.Request.Method, path)
}

func isSafeMethod(method string) bool {
	return method == http.MethodGet || method == http.MethodHead || method == http.MethodOptions
}

func validateCSRFTokens(c *gin.Context, token string) bool {
	requestToken := c.GetHeader("X-CSRF-Token")
	if requestToken != "" && requestToken == token {
		return true
	}

	c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
		"success": false,
		"error": gin.H{
			"code":    "CSRF_INVALID",
			"message": "Invalid or missing CSRF token",
		},
	})
	return false
}

// CSRF middleware implements the Double-Submit Cookie pattern
func CSRF() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, ok := ensureCSRFCookie(c)
		if !ok {
			return
		}

		// ALWAYS expose the current token in the header so frontend can read it (cross-origin support)
		c.Header("X-CSRF-Token", token)

		path := c.Request.URL.Path
		if shouldSkipCSRFMiddleware(c, path) {
			c.Next()
			return
		}

		if isSafeMethod(c.Request.Method) {
			c.Next()
			return
		}

		if !validateCSRFTokens(c, token) {
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
