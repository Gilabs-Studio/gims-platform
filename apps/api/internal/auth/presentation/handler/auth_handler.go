package handler

import (
	"net/http"
	"strings"

	"github.com/gilabs/crm-healthcare/api/internal/auth/domain/dto"
	"github.com/gilabs/crm-healthcare/api/internal/auth/domain/usecase"
	authDTO "github.com/gilabs/crm-healthcare/api/internal/auth/presentation/dto"
	"github.com/gilabs/crm-healthcare/api/internal/core/errors"
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/config" // Import config
	"github.com/gilabs/crm-healthcare/api/internal/core/response"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

func isSecureRequest(c *gin.Context) bool {
	if config.AppConfig == nil || config.AppConfig.Server.Env != "production" {
		return false
	}
	if c.Request.TLS != nil {
		return true
	}
	if config.AppConfig.Security.ProxyHeadersEnabled {
		xfp := strings.ToLower(strings.TrimSpace(c.GetHeader("X-Forwarded-Proto")))
		return xfp == "https"
	}
	return false
}

type AuthHandler struct {
	authUC usecase.AuthUsecase
}

func NewAuthHandler(authUC usecase.AuthUsecase) *AuthHandler {
	return &AuthHandler{
		authUC: authUC,
	}
}

// Login handles login request
func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	loginResponse, err := h.authUC.Login(c.Request.Context(), &req)
	if err != nil {
		if err == usecase.ErrInvalidCredentials {
			errors.ErrorResponse(c, "INVALID_CREDENTIALS", nil, nil)
			return
		}
		if err == usecase.ErrUserInactive {
			errors.ErrorResponse(c, "ACCOUNT_DISABLED", map[string]interface{}{
				"reason": "User account is inactive",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	// Security: Set HttpOnly Cookies
	// Access Token
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "access_token",
		Value:    loginResponse.Token,
		Path:     "/",
		MaxAge:   config.AppConfig.JWT.AccessTokenTTL * 3600,
		Secure:   isSecureRequest(c),
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})

	// Refresh Token
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "refresh_token",
		Value:    loginResponse.RefreshToken,
		Path:     "/", // Allowing refresh from any path for simplicity, or restrict to /api/v1/auth
		MaxAge:   config.AppConfig.JWT.RefreshTokenTTL * 24 * 3600,
		Secure:   isSecureRequest(c),
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})

	// Map to Presentation DTO (Strict Mode: No tokens in JSON)
	resp := authDTO.LoginResponseDTO{
		User: authDTO.UserDTO{
			ID:        loginResponse.User.ID,
			Name:      loginResponse.User.Name,
			Email:     loginResponse.User.Email,
			AvatarURL: loginResponse.User.AvatarURL,
			Role: authDTO.RoleDTO{
				Code: loginResponse.User.Role,
				Name: loginResponse.User.RoleName,
			},
			Permissions: loginResponse.User.Permissions,
		},
		AccessToken:  "", // Removed for security
		RefreshToken: "", // Removed for security
	}

	response.SuccessResponse(c, resp, nil)
}

// RefreshToken handles refresh token request
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// 1. Try to get refresh token from Cookie first (Strict/Browser)
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil || refreshToken == "" {
		// 2. Fallback to JSON body (Mobile/CLI)
		var req struct {
			RefreshToken string `json:"refresh_token"`
		}
		if errBind := c.ShouldBindJSON(&req); errBind == nil && req.RefreshToken != "" {
			refreshToken = req.RefreshToken
		}
	}

	if refreshToken == "" {
		errors.ErrorResponse(c, "REFRESH_TOKEN_REQUIRED", nil, nil)
		return
	}

	loginResponse, err := h.authUC.RefreshToken(c.Request.Context(), refreshToken)
	if err != nil {
		if err == usecase.ErrUserNotFound {
			errors.ErrorResponse(c, "USER_NOT_FOUND", nil, nil)
			return
		}
		// Clear cookies if refresh fails
		http.SetCookie(c.Writer, &http.Cookie{Name: "access_token", MaxAge: -1, Path: "/"})
		http.SetCookie(c.Writer, &http.Cookie{Name: "refresh_token", MaxAge: -1, Path: "/"})

		errors.ErrorResponse(c, "REFRESH_TOKEN_INVALID", nil, nil)
		return
	}

	// Security: Set New HttpOnly Cookies
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "access_token",
		Value:    loginResponse.Token,
		Path:     "/",
		MaxAge:   config.AppConfig.JWT.AccessTokenTTL * 3600,
		Secure:   isSecureRequest(c),
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "refresh_token",
		Value:    loginResponse.RefreshToken,
		Path:     "/",
		MaxAge:   config.AppConfig.JWT.RefreshTokenTTL * 24 * 3600,
		Secure:   isSecureRequest(c),
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})

	// Map to Presentation DTO
	resp := authDTO.LoginResponseDTO{
		User: authDTO.UserDTO{
			ID:        loginResponse.User.ID,
			Name:      loginResponse.User.Name,
			Email:     loginResponse.User.Email,
			AvatarURL: loginResponse.User.AvatarURL,
			Role: authDTO.RoleDTO{
				Code: loginResponse.User.Role,
				Name: loginResponse.User.RoleName,
			},
			Permissions: loginResponse.User.Permissions,
		},
		AccessToken:  "",
		RefreshToken: "",
	}

	response.SuccessResponse(c, resp, nil)
}

// Logout handles logout request
func (h *AuthHandler) Logout(c *gin.Context) {
	// In a stateless JWT system, logout is handled client-side
	// Server can maintain a blacklist if needed
	// Here we revoke the refresh token provided in the body or simply return success
	// The original implementation accepted no body and just returned success,
	// but the service had a Logout method taking a token.
	// Let's see if we can get the token from header or body.

	// 1. Try Cookie
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil || refreshToken == "" {
		// 2. Try JSON
		var req struct {
			RefreshToken string `json:"refresh_token"`
		}
		_ = c.ShouldBindJSON(&req)
		refreshToken = req.RefreshToken
	}

	if refreshToken != "" {
		_ = h.authUC.Logout(c.Request.Context(), refreshToken)
	}

	// ALWAYS Clear Cookies on Logout
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Secure:   isSecureRequest(c),
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Secure:   isSecureRequest(c),
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})

	response.SuccessResponseNoContent(c)
}

// GetCSRFToken ensures the client has a CSRF cookie (middleware handles setting it)
func (h *AuthHandler) GetCSRFToken(c *gin.Context) {
	response.SuccessResponse(c, gin.H{"message": "CSRF token set"}, nil)
}
