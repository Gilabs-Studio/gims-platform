package dto

import "time"

// ForgotPasswordRequest represents a forgot password request.
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ForgotPasswordResponse represents a forgot password response.
type ForgotPasswordResponse struct {
	Message string `json:"message"`
	Email   string `json:"email"`
}

// ResetPasswordRequest represents a reset password request.
type ResetPasswordRequest struct {
	Token           string `json:"token" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=6"`
	ConfirmPassword string `json:"confirm_password" binding:"required,eqfield=NewPassword"`
}

// ResetPasswordResponse represents a reset password response.
type ResetPasswordResponse struct {
	Message string `json:"message"`
	Email   string `json:"email"`
}

// PasswordResetRequestResponse represents a password reset request response.
type PasswordResetRequestResponse struct {
	ID        string     `json:"id"`
	UserID    string     `json:"user_id"`
	Status    string     `json:"status"`
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at"`
	CreatedAt time.Time  `json:"created_at"`
}

// TenantOwnerPasswordResetQueueItem represents a pending tenant-owner reset request for system admin queue.
type TenantOwnerPasswordResetQueueItem struct {
	RequestID   string    `json:"request_id"`
	Token       string    `json:"token"`
	UserID      string    `json:"user_id"`
	UserName    string    `json:"user_name"`
	UserEmail   string    `json:"user_email"`
	TenantID    string    `json:"tenant_id"`
	TenantName  string    `json:"tenant_name"`
	Status      string    `json:"status"`
	RequestedAt time.Time `json:"requested_at"`
	ExpiresAt   time.Time `json:"expires_at"`
}

// TenantOwnerPasswordResetPendingCountResponse represents pending queue count for system admins.
type TenantOwnerPasswordResetPendingCountResponse struct {
	PendingCount int64 `json:"pending_count"`
}
