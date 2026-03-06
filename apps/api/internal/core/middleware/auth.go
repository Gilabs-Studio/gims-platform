package middleware

import (
	"context"
	"strings"

	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT token and sets user info in context
func AuthMiddleware(jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
	GetPermissionsWithScope(roleCode string) (map[string]string, error)
}) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 0. Exclude webhooks that do not use browser JWT sessions
		if strings.HasPrefix(c.Request.URL.Path, "/api/v1/crm/leads/upsert") {
			// Inject a system mock user so RequirePermission middleware passes
			// created_by in DB is a UUID, so we must use a real UUID format instead of 'system-webhook'
			mockUserID := "00000000-0000-0000-0000-000000000000"
			c.Set("user_id", mockUserID)
			c.Set("user_email", "webhook@system.local")
			c.Set("user_role", "admin")
			
			permMap := map[string]bool{
				"crm_lead.create": true,
				"crm_lead.read":   true,
				"crm_lead.update": true,
			}
			c.Set("user_permissions", permMap)
			
			permScopeMap := map[string]string{
				"crm_lead.create": "ALL",
				"crm_lead.read":   "ALL",
				"crm_lead.update": "ALL",
			}
			c.Set("user_permissions_scope", permScopeMap)

			reqCtx := c.Request.Context()
			reqCtx = context.WithValue(reqCtx, "user_id", mockUserID)
			reqCtx = context.WithValue(reqCtx, "user_email", "webhook@system.local")
			reqCtx = context.WithValue(reqCtx, "user_role", "admin")
			reqCtx = context.WithValue(reqCtx, "client_ip", c.ClientIP())
			reqCtx = context.WithValue(reqCtx, "user_agent", c.Request.UserAgent())
			c.Request = c.Request.WithContext(reqCtx)

			c.Next()
			return
		}

		var tokenString string

		// 1. Check Authorization Header (Bearer)
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
			}
		}

		// 2. Check Cookie (HttpOnly)
		if tokenString == "" {
			cookie, err := c.Cookie("gims_access_token")
			if err == nil && cookie != "" {
				tokenString = cookie
			}
		}

		if tokenString == "" {
			errors.UnauthorizedResponse(c, "token missing")
			c.Abort()
			return
		}

		// Validate token
		claims, err := jwtManager.ValidateToken(tokenString)
		if err != nil {
			if err == jwt.ErrExpiredToken {
				errors.ErrorResponse(c, "TOKEN_EXPIRED", nil, nil)
			} else {
				errors.ErrorResponse(c, "TOKEN_INVALID", nil, nil)
			}
			c.Abort()
			return
		}

		// Validate claims are not empty
		if claims.UserID == "" || claims.Email == "" || claims.Role == "" {
			errors.ErrorResponse(c, "TOKEN_INVALID", nil, nil)
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)

		// Also set values on request context for infrastructure services (e.g. audit)
		reqCtx := c.Request.Context()
		reqCtx = context.WithValue(reqCtx, "user_id", claims.UserID)
		reqCtx = context.WithValue(reqCtx, "user_email", claims.Email)
		reqCtx = context.WithValue(reqCtx, "user_role", claims.Role)
		reqCtx = context.WithValue(reqCtx, "client_ip", c.ClientIP())
		reqCtx = context.WithValue(reqCtx, "user_agent", c.Request.UserAgent())
		c.Request = c.Request.WithContext(reqCtx)

		// Load Permissions with scope (with fallback to non-scoped permissions)
		permScopeMap, err := permService.GetPermissionsWithScope(claims.Role)
		if err != nil {
			// Fallback: try loading non-scoped permissions and default scope to ALL
			plainPerms, fallbackErr := permService.GetPermissions(claims.Role)
			if fallbackErr != nil {
				// Both methods failed - deny access
				errors.ErrorResponse(c, "FORBIDDEN", map[string]interface{}{
					"reason": "unable to load user permissions",
				}, nil)
				c.Abort()
				return
			}
			// Build scope map with ALL as default for all permissions
			permScopeMap = make(map[string]string, len(plainPerms))
			for _, code := range plainPerms {
				permScopeMap[code] = "ALL"
			}
		}

		// Build backward-compatible map[string]bool for existing checks
		permMap := make(map[string]bool, len(permScopeMap))
		for code := range permScopeMap {
			permMap[code] = true
		}
		c.Set("user_permissions", permMap)
		// Also set scope-aware map for new scope-based checks
		c.Set("user_permissions_scope", permScopeMap)

		c.Next()
	}
}
