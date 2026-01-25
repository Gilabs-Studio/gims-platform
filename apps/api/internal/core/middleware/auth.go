package middleware

import (
	"strings"

	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT token and sets user info in context
func AuthMiddleware(jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
}) gin.HandlerFunc {
	return func(c *gin.Context) {
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

		// Load Permissions
		perms, err := permService.GetPermissions(claims.Role)
		if err != nil {
			// Fail-secure - deny access if we cannot load permissions
			// This prevents unauthorized access if the permission system fails
			errors.ErrorResponse(c, "FORBIDDEN", map[string]interface{}{
				"reason": "unable to load user permissions",
			}, nil)
			c.Abort()
			return
		}
		
		// Map for O(1) lookup
		permMap := make(map[string]bool)
		for _, p := range perms {
			permMap[p] = true
		}
		c.Set("user_permissions", permMap)

		c.Next()
	}
}
