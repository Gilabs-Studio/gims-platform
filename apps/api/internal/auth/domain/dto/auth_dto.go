package dto

import "time"

// LoginRequest represents login request DTO
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// RegisterTenantRequest represents self-service tenant registration payload.
// On success the endpoint provisions a new tenant and returns a JWT — the user
// can immediately start using the platform without a separate login step.
//
// TODO(future): Add a `plan` field once batch/billing packages are implemented.
// For now every registration receives enterprise access with no user limit.
type RegisterTenantRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=100"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	CompanyName string `json:"company_name" binding:"required,min=2,max=150"`
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
	ID            string            `json:"id"`
	Email         string            `json:"email"`
	Name          string            `json:"name"`
	AvatarURL     string            `json:"avatar_url"`
	EmployeeID    string            `json:"employee_id,omitempty"`
	Role          string            `json:"role"`
	RoleName      string            `json:"role_name"`
	RoleDataScope string            `json:"role_data_scope"`
	Permissions   map[string]string `json:"permissions"` // code -> scope (e.g., {"sales_order.read": "DIVISION"})
	Status        string            `json:"status"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
	TenantID      string            `json:"tenant_id,omitempty"`
	TenantName    string            `json:"tenant_name,omitempty"`
}
