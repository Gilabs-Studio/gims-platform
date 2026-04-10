package middleware

import (
	"context"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gin-gonic/gin"
)

// RequirePermission check strictly against loaded permissions
func RequirePermission(requiredPermission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Validate permission string is not empty
		if requiredPermission == "" {
			errors.ForbiddenResponse(c, "invalid permission check", nil)
			c.Abort()
			return
		}

		// Ensure user role exists in context (set by AuthMiddleware)
		if _, exists := c.Get("user_role"); !exists {
			errors.UnauthorizedResponse(c, "authentication required")
			c.Abort()
			return
		}

		// Admin/superadmin bypass strict permission map checks.
		if roleRaw, exists := c.Get("user_role"); exists {
			if role, ok := roleRaw.(string); ok {
				normalized := strings.ToLower(strings.TrimSpace(role))
				if normalized == "admin" || normalized == "superadmin" {
					c.Set("permission_scope", "ALL")
					reqCtx := c.Request.Context()
					reqCtx = context.WithValue(reqCtx, "permission_scope", "ALL")
					c.Request = c.Request.WithContext(reqCtx)
					c.Next()
					return
				}
			}
		}

		// Get permissions map
		perms, exists := c.Get("user_permissions")
		if !exists {
			errors.ForbiddenResponse(c, "permission check failed", nil)
			c.Abort()
			return
		}

		permMap, ok := perms.(map[string]bool)
		if !ok {
			errors.ForbiddenResponse(c, "permission format error", nil)
			c.Abort()
			return
		}

		if !permMap[requiredPermission] {
			errors.ForbiddenResponse(c, fmt.Sprintf("Missing permission: %s", requiredPermission), nil)
			c.Abort()
			return
		}

		// Inject the permission scope into context for downstream handlers
		scope := "ALL"
		if scopeMap, exists := c.Get("user_permissions_scope"); exists {
			if sm, ok := scopeMap.(map[string]string); ok {
				if s, found := sm[requiredPermission]; found {
					scope = s
				}
			}
		}
		c.Set("permission_scope", scope)
		reqCtx := c.Request.Context()
		reqCtx = context.WithValue(reqCtx, "permission_scope", scope)
		c.Request = c.Request.WithContext(reqCtx)

		c.Next()
	}
}

// PermissionMiddleware is deprecated, use RequirePermission
func PermissionMiddleware(permission string) gin.HandlerFunc {
	return RequirePermission(permission)
}

// RoleMiddleware checks if user has one of the required roles
func RoleMiddleware(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			errors.UnauthorizedResponse(c, "authentication required")
			c.Abort()
			return
		}

		// Convert to string
		roleStr, ok := userRole.(string)
		if !ok {
			errors.UnauthorizedResponse(c, "invalid role format")
			c.Abort()
			return
		}

		// Admin always has access
		if roleStr == "admin" {
			c.Next()
			return
		}

		// Check if user role matches any of the allowed roles
		allowed := false
		for _, role := range roles {
			if role == roleStr {
				allowed = true
				break
			}
		}

		if !allowed {
			errors.ForbiddenResponse(c, "Required one of: "+strings.Join(roles, ", "), []string{roleStr})
			c.Abort()
			return
		}

		c.Next()
	}
}
