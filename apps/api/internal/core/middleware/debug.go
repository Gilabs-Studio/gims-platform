package middleware

import (
	"log"
	"os"
)

// debugLog prints logs only if the DEBUG_MIDDLEWARE environment variable is explicitly set to "true"
func debugLog(format string, v ...interface{}) {
	if os.Getenv("DEBUG_MIDDLEWARE") == "true" {
		log.Printf(format, v...)
	}
}
