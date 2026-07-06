package middleware

import (
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gin-gonic/gin"
)

// LoggerMiddleware logs HTTP requests in Gin framework console style with ANSI colors
func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := apptime.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Log request
		latency := time.Since(start)
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()

		if raw != "" {
			path = path + "?" + raw
		}

		// Use colors when not in release mode
		useColor := gin.Mode() != gin.ReleaseMode

		var statusColor, methodColor, resetColor string
		if useColor {
			resetColor = "\033[0m"

			// Get status code background color
			switch {
			case statusCode >= 200 && statusCode < 300:
				statusColor = "\033[97;42m" // White text, Green background (2xx)
			case statusCode >= 300 && statusCode < 400:
				statusColor = "\033[97;44m" // White text, Blue background (3xx)
			case statusCode >= 400 && statusCode < 500:
				statusColor = "\033[97;43m" // White text, Yellow background (4xx)
			default:
				statusColor = "\033[97;41m" // White text, Red background (5xx)
			}

			// Get method background color
			switch method {
			case "GET":
				methodColor = "\033[97;44m" // White text, Blue background
			case "POST":
				methodColor = "\033[97;46m" // White text, Cyan background
			case "PUT", "PATCH":
				methodColor = "\033[97;43m" // White text, Yellow background
			case "DELETE":
				methodColor = "\033[97;41m" // White text, Red background
			default:
				methodColor = "\033[97;45m" // White text, Magenta background
			}
		}

		timeStr := apptime.Now().Format("2006/01/02 - 15:04:05")

		// Print context errors if there are any
		var errorMsg string
		if len(c.Errors) > 0 {
			errorMsg = "\n" + c.Errors.ByType(gin.ErrorTypePrivate).String()
		}

		// Print in Gin format: [GIN] timestamp | status | latency | clientIP | method | path
		if useColor {
			fmt.Fprintf(gin.DefaultWriter, "[GIN] %s |%s %3d %s| %13v | %15s |%s %-7s %s %#v%s\n",
				timeStr,
				statusColor, statusCode, resetColor,
				latency,
				clientIP,
				methodColor, method, resetColor,
				path,
				errorMsg,
			)
		} else {
			fmt.Fprintf(gin.DefaultWriter, "[GIN] %s | %3d | %13v | %15s | %-7s %#v%s\n",
				timeStr,
				statusCode,
				latency,
				clientIP,
				method,
				path,
				errorMsg,
			)
		}
	}
}

