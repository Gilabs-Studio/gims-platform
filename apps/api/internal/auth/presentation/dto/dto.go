package dto

// LoginRequestDTO represents login payload
type LoginRequestDTO struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RegisterRequestDTO represents register payload
type RegisterRequestDTO struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	RoleCode string `json:"role_code" binding:"required"` // Can be optional if default role exists
}

// LoginResponseDTO represents login response
type LoginResponseDTO struct {
	User        UserDTO  `json:"user"`
	AccessToken string   `json:"access_token"`
	RefreshToken string  `json:"refresh_token"`
}

type UserDTO struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Email       string            `json:"email"`
	AvatarURL   string            `json:"avatar_url"`
	Role        RoleDTO           `json:"role"`
	Permissions map[string]string `json:"permissions"` // code -> scope
}

type RoleDTO struct {
	Code string `json:"code"`
	Name string `json:"name"`
}
