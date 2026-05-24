package dto

import "time"

type SubmitSupportFeedbackRequest struct {
	Message  string  `json:"message" binding:"required,min=5"`
	ImageURL *string `json:"image_url"`
}

type SupportFeedbackResponse struct {
	ID         string    `json:"id"`
	TenantID   string    `json:"tenant_id"`
	UserID     string    `json:"user_id"`
	UserName   string    `json:"user_name"`
	UserEmail  string    `json:"user_email"`
	TenantName string    `json:"tenant_name"`
	Message    string    `json:"message"`
	ImageURL   *string   `json:"image_url,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}
