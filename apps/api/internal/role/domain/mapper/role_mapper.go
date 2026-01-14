package mapper

import (
	permissionDto "github.com/gilabs/crm-healthcare/api/internal/permission/domain/dto"
	permissionMapper "github.com/gilabs/crm-healthcare/api/internal/permission/domain/mapper"
	"github.com/gilabs/crm-healthcare/api/internal/role/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/role/domain/dto"
)

// ToRoleResponse converts Role to RoleResponse
func ToRoleResponse(r *models.Role) *dto.RoleResponse {
	resp := &dto.RoleResponse{
		ID:          r.ID,
		Name:        r.Name,
		Code:        r.Code,
		Description: r.Description,
		Status:      r.Status,
		IsProtected: r.IsProtected,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}
	if len(r.Permissions) > 0 {
		resp.Permissions = make([]permissionDto.PermissionResponse, len(r.Permissions))
		for i, p := range r.Permissions {
			resp.Permissions[i] = *permissionMapper.ToPermissionResponse(&p)
		}
	}
	return resp
}
