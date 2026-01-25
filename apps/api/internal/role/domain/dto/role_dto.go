package dto

import (
	"time"

	permissionDto "github.com/gilabs/gims/api/internal/permission/domain/dto"
)

// RoleResponse represents role response DTO
type RoleResponse struct {
	ID          string                             `json:"id"`
	Name        string                             `json:"name"`
	Code        string                             `json:"code"`
	Description string                             `json:"description"`
	Status      string                             `json:"status"`
	IsProtected bool                               `json:"is_protected"`
	Permissions []permissionDto.PermissionResponse `json:"permissions,omitempty"`
	CreatedAt   time.Time                          `json:"created_at"`
	UpdatedAt   time.Time                          `json:"updated_at"`
}

// CreateRoleRequest represents create role request DTO
type CreateRoleRequest struct {
	Name        string `json:"name" binding:"required,min=3"`
	Code        string `json:"code" binding:"required,min=3"`
	Description string `json:"description"`
	Status      string `json:"status" binding:"omitempty,oneof=active inactive"`
	IsProtected bool   `json:"is_protected"` // Only system can set this to true
}

// UpdateRoleRequest represents update role request DTO
type UpdateRoleRequest struct {
	Name        string `json:"name" binding:"omitempty,min=3"`
	Code        string `json:"code" binding:"omitempty,min=3"`
	Description string `json:"description"`
	Status      string `json:"status" binding:"omitempty,oneof=active inactive"`
}

// AssignPermissionsRequest represents assign permissions to role request DTO
type AssignPermissionsRequest struct {
	PermissionIDs []string `json:"permission_ids" binding:"required,min=1,dive,uuid"`
}
