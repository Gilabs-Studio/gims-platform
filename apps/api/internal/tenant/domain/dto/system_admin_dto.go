package dto

// SystemAdminLoginRequest is the request body for system admin login
type SystemAdminLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

// SystemAdminLoginResponse is returned after successful system admin login
type SystemAdminLoginResponse struct {
	Admin        *SystemAdminResponse `json:"admin"`
	AccessToken  string               `json:"access_token,omitempty"`
	RefreshToken string               `json:"refresh_token,omitempty"`
	ExpiresIn    int                  `json:"expires_in"`
}

// SystemAdminResponse is the safe representation of a system admin
type SystemAdminResponse struct {
	ID     string `json:"id"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	Status string `json:"status"`
}
