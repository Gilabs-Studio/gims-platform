package middleware

import (
	"github.com/gilabs/gims/api/internal/core/requestcache"
	"github.com/gin-gonic/gin"
)

// RequestCacheMiddleware injects a request-scoped cache into the request context
func RequestCacheMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		reqCtx := requestcache.WithRequestCache(c.Request.Context())
		c.Request = c.Request.WithContext(reqCtx)
		c.Next()
	}
}
