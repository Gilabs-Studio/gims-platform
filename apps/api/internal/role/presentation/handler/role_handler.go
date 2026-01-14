package handler

import (
	"strconv"

	"github.com/gilabs/crm-healthcare/api/internal/core/errors"
	"github.com/gilabs/crm-healthcare/api/internal/core/response"
	"github.com/gilabs/crm-healthcare/api/internal/role/domain/dto"
	"github.com/gilabs/crm-healthcare/api/internal/role/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type RoleHandler struct {
	roleUC usecase.RoleUsecase
}

func NewRoleHandler(roleUC usecase.RoleUsecase) *RoleHandler {
	return &RoleHandler{
		roleUC: roleUC,
	}
}

// List handles list roles request
func (h *RoleHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	roles, total, err := h.roleUC.List(c.Request.Context(), page, limit)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	pagination := response.NewPaginationMeta(page, limit, int(total))
	meta := &response.Meta{
		Pagination: pagination,
	}

	response.SuccessResponse(c, roles, meta)
}

// GetByID handles get role by ID request
func (h *RoleHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	role, err := h.roleUC.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrRoleNotFound {
			errors.ErrorResponse(c, "NOT_FOUND", map[string]interface{}{
				"resource": "role",
				"role_id":  id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, role, nil)
}

// Create handles create role request
func (h *RoleHandler) Create(c *gin.Context) {
	var req dto.CreateRoleRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	createdRole, err := h.roleUC.Create(c.Request.Context(), &req)
	if err != nil {
		if err == usecase.ErrRoleAlreadyExists {
			errors.ErrorResponse(c, "RESOURCE_ALREADY_EXISTS", map[string]interface{}{
				"resource": "role",
				"field":    "code",
				"value":    req.Code,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{}
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(string); ok {
			meta.CreatedBy = id
		}
	}

	response.SuccessResponseCreated(c, createdRole, meta)
}

// Update handles update role request
func (h *RoleHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateRoleRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	updatedRole, err := h.roleUC.Update(c.Request.Context(), id, &req)
	if err != nil {
		if err == usecase.ErrRoleNotFound {
			errors.ErrorResponse(c, "NOT_FOUND", map[string]interface{}{
				"resource": "role",
				"role_id":  id,
			}, nil)
			return
		}
		if err == usecase.ErrRoleAlreadyExists {
			errors.ErrorResponse(c, "RESOURCE_ALREADY_EXISTS", map[string]interface{}{
				"resource": "role",
				"field":    "code",
			}, nil)
			return
		}
		if err == usecase.ErrRoleProtected {
			errors.ErrorResponse(c, "ROLE_PROTECTED", map[string]interface{}{
				"resource": "role",
				"role_id":  id,
				"message":  "This role is protected and cannot be modified",
			}, nil)
			return
		}
		if err == usecase.ErrLastAdminCannotDisable {
			errors.ErrorResponse(c, "LAST_ADMIN_CANNOT_DISABLE", map[string]interface{}{
				"resource": "role",
				"role_id":  id,
				"message":  "Cannot disable the last admin role",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{}
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(string); ok {
			meta.UpdatedBy = id
		}
	}

	response.SuccessResponse(c, updatedRole, meta)
}

// Delete handles delete role request
func (h *RoleHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	err := h.roleUC.Delete(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrRoleNotFound {
			errors.ErrorResponse(c, "NOT_FOUND", map[string]interface{}{
				"resource": "role",
				"role_id":  id,
			}, nil)
			return
		}
		if err == usecase.ErrRoleProtected {
			errors.ErrorResponse(c, "ROLE_PROTECTED", map[string]interface{}{
				"resource": "role",
				"role_id":  id,
				"message":  "This role is protected and cannot be deleted",
			}, nil)
			return
		}
		if err == usecase.ErrRoleInUse {
			errors.ErrorResponse(c, "ROLE_IN_USE", map[string]interface{}{
				"resource": "role",
				"role_id":  id,
				"message":  "This role is in use by users and cannot be deleted",
			}, nil)
			return
		}
		if err == usecase.ErrLastAdminCannotDelete {
			errors.ErrorResponse(c, "LAST_ADMIN_CANNOT_DELETE", map[string]interface{}{
				"resource": "role",
				"role_id":  id,
				"message":  "Cannot delete the last admin role",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	// Get user ID for meta
	meta := &response.Meta{}
	if userIDVal, exists := c.Get("user_id"); exists {
		if id, ok := userIDVal.(string); ok {
			meta.DeletedBy = id
		}
	}

	response.SuccessResponseDeleted(c, "role", id, meta)
}

// AssignPermissions handles assign permissions to role request
func (h *RoleHandler) AssignPermissions(c *gin.Context) {
	id := c.Param("id")
	var req dto.AssignPermissionsRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	err := h.roleUC.AssignPermissions(c.Request.Context(), id, req.PermissionIDs)
	if err != nil {
		if err == usecase.ErrRoleNotFound {
			errors.ErrorResponse(c, "NOT_FOUND", map[string]interface{}{
				"resource": "role",
				"role_id":  id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	// Return updated role
	updatedRole, err := h.roleUC.GetByID(c.Request.Context(), id)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, updatedRole, nil)
}

// ValidateUserRole handles validate user role request
func (h *RoleHandler) ValidateUserRole(c *gin.Context) {
	userID := c.Param("user_id")
	roleID := c.Query("role_id")

	if roleID == "" {
		errors.ErrorResponse(c, "INVALID_REQUEST", map[string]interface{}{
			"message": "role_id is required",
		}, nil)
		return
	}

	isValid, err := h.roleUC.ValidateUserRole(c.Request.Context(), userID, roleID)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, map[string]interface{}{
		"user_id":  userID,
		"role_id":  roleID,
		"is_valid": isValid,
	}, nil)
}
