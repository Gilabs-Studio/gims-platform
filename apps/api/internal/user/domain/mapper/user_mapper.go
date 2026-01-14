package mapper

import (
	roleMapper "github.com/gilabs/crm-healthcare/api/internal/role/domain/mapper"
	"github.com/gilabs/crm-healthcare/api/internal/user/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/user/domain/dto"
)

// ToUserResponse converts User to UserResponse
func ToUserResponse(u *models.User) *dto.UserResponse {
	resp := &dto.UserResponse{
		ID:        u.ID,
		Email:     u.Email,
		Name:      u.Name,
		AvatarURL: u.AvatarURL,
		RoleID:    u.RoleID,
		Status:    u.Status,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
	if u.Role != nil {
		resp.Role = roleMapper.ToRoleResponse(u.Role)
	}
	return resp
}
