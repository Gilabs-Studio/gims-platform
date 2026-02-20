package dto

import "time"

// LoginRequest represents login request DTO
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginResponse represents login response DTO
type LoginResponse struct {
	User         *UserResponse `json:"user"`
	Token        string        `json:"token"`
	RefreshToken string        `json:"refresh_token"`
	ExpiresIn    int           `json:"expires_in"` // in seconds
}

// UserResponse represents user response DTO for auth
type UserResponse struct {
	ID          string            `json:"id"`
	Email       string            `json:"email"`
	Name        string            `json:"name"`
	AvatarURL   string            `json:"avatar_url"`
	Role        string            `json:"role"`
	RoleName    string            `json:"role_name"`
	Permissions map[string]string `json:"permissions"` // code -> scope (e.g., {"sales_order.read": "DIVISION"})
	Status      string            `json:"status"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}
