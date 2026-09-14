package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCORSMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(CORSMiddleware())
	r.GET("/api/v1/auth/csrf", func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})

	tests := []struct {
		name           string
		origin         string
		expectedStatus int
		allowed        bool
	}{
		{
			name:           "Meccaya SuperApp domain",
			origin:         "https://meccayasuperapp.gilabs.id",
			expectedStatus: http.StatusOK,
			allowed:        true,
		},
		{
			name:           "GIMS sub-domain",
			origin:         "https://gims.gilabs.id",
			expectedStatus: http.StatusOK,
			allowed:        true,
		},
		{
			name:           "Any gilabs.id sub-domain",
			origin:         "https://random-sub.gilabs.id",
			expectedStatus: http.StatusOK,
			allowed:        true,
		},
		{
			name:           "Salesview domain",
			origin:         "https://salesview.id",
			expectedStatus: http.StatusOK,
			allowed:        true,
		},
		{
			name:           "Localhost web dev port",
			origin:         "http://localhost:54321",
			expectedStatus: http.StatusOK,
			allowed:        true,
		},
		{
			name:           "Disallowed domain",
			origin:         "https://unauthorized-domain.com",
			expectedStatus: http.StatusForbidden,
			allowed:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest(http.MethodGet, "/api/v1/auth/csrf", nil)
			req.Header.Set("Origin", tt.origin)
			resp := httptest.NewRecorder()

			r.ServeHTTP(resp, req)

			if resp.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d for origin %s", tt.expectedStatus, resp.Code, tt.origin)
			}

			allowOriginHeader := resp.Header().Get("Access-Control-Allow-Origin")
			if tt.allowed && allowOriginHeader != tt.origin {
				t.Errorf("expected Access-Control-Allow-Origin %s, got %s", tt.origin, allowOriginHeader)
			} else if !tt.allowed && allowOriginHeader != "" {
				t.Errorf("expected empty Access-Control-Allow-Origin, got %s", allowOriginHeader)
			}
		})
	}
}
