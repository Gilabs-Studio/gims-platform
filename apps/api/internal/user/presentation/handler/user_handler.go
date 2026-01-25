package handler

import (
	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	domainDTO "github.com/gilabs/gims/api/internal/user/domain/dto"
	"github.com/gilabs/gims/api/internal/user/domain/usecase"
	presentationDTO "github.com/gilabs/gims/api/internal/user/presentation/dto"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type UserHandler struct {
	userUC usecase.UserUsecase
}

func NewUserHandler(userUC usecase.UserUsecase) *UserHandler {
	return &UserHandler{
		userUC: userUC,
	}
}

// List handles list users request
func (h *UserHandler) List(c *gin.Context) {
	var req domainDTO.ListUsersRequest

	if err := c.ShouldBindQuery(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidQueryParamResponse(c)
		return
	}

	users, pagination, err := h.userUC.List(c.Request.Context(), &req)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	// Map to Presentation DTO
	userDTOs := make([]presentationDTO.UserResponseDTO, len(users))
	for i, u := range users {
		userDTOs[i] = presentationDTO.UserResponseDTO{
			ID:        u.ID,
			Name:      u.Name,
			Email:     u.Email,
			AvatarURL: u.AvatarURL,
			Role: presentationDTO.RoleDTO{
				Code: u.Role.Code,
				Name: u.Role.Name,
			},
			Status:    u.Status,
			CreatedAt: u.CreatedAt,
		}
	}

	meta := &response.Meta{
		Pagination: &response.PaginationMeta{
			Page:       pagination.Page,
			PerPage:    pagination.PerPage,
			Total:      pagination.Total,
			TotalPages: pagination.TotalPages,
			HasNext:    pagination.Page < pagination.TotalPages,
			HasPrev:    pagination.Page > 1,
		},
		Filters: map[string]interface{}{},
	}

	if req.Search != "" {
		meta.Filters["search"] = req.Search
	}
	if req.Status != "" {
		meta.Filters["status"] = req.Status
	}
	if req.RoleID != "" {
		meta.Filters["role_id"] = req.RoleID
	}

	response.SuccessResponse(c, userDTOs, meta)
}

// GetByID handles get user by ID request
func (h *UserHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	user, err := h.userUC.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrUserNotFound {
			errors.ErrorResponse(c, "USER_NOT_FOUND", map[string]interface{}{
				"user_id": id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	resp := presentationDTO.UserResponseDTO{
		ID:        user.ID,
		Name:      user.Name,
		Email:     user.Email,
		AvatarURL: user.AvatarURL,
		Role: presentationDTO.RoleDTO{
			Code: user.Role.Code,
			Name: user.Role.Name,
		},
		Status:    user.Status,
		CreatedAt: user.CreatedAt,
	}

	response.SuccessResponse(c, resp, nil)
}

// Create handles create user request
func (h *UserHandler) Create(c *gin.Context) {
	var req domainDTO.CreateUserRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	createdUser, err := h.userUC.Create(c.Request.Context(), &req)
	if err != nil {
		if err == usecase.ErrUserAlreadyExists {
			errors.ErrorResponse(c, "RESOURCE_ALREADY_EXISTS", map[string]interface{}{
				"resource": "user",
				"field":    "email",
				"value":    req.Email,
			}, nil)
			return
		}
		if err == usecase.ErrRoleNotFound {
			errors.ErrorResponse(c, "NOT_FOUND", map[string]interface{}{
				"resource": "role",
				"role_id":  req.RoleID,
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

	resp := presentationDTO.UserResponseDTO{
		ID:        createdUser.ID,
		Name:      createdUser.Name,
		Email:     createdUser.Email,
		AvatarURL: createdUser.AvatarURL,
		Role: presentationDTO.RoleDTO{
			Code: createdUser.Role.Code,
			Name: createdUser.Role.Name,
		},
		Status:    createdUser.Status,
		CreatedAt: createdUser.CreatedAt,
	}

	response.SuccessResponseCreated(c, resp, meta)
}

// Update handles update user request
func (h *UserHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req domainDTO.UpdateUserRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	updatedUser, err := h.userUC.Update(c.Request.Context(), id, &req)
	if err != nil {
		if err == usecase.ErrUserNotFound {
			errors.ErrorResponse(c, "USER_NOT_FOUND", map[string]interface{}{
				"user_id": id,
			}, nil)
			return
		}
		if err == usecase.ErrUserAlreadyExists {
			errors.ErrorResponse(c, "RESOURCE_ALREADY_EXISTS", map[string]interface{}{
				"resource": "user",
				"field":    "email",
			}, nil)
			return
		}
		if err == usecase.ErrRoleNotFound {
			errors.ErrorResponse(c, "NOT_FOUND", map[string]interface{}{
				"resource": "role",
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

	resp := presentationDTO.UserResponseDTO{
		ID:        updatedUser.ID,
		Name:      updatedUser.Name,
		Email:     updatedUser.Email,
		AvatarURL: updatedUser.AvatarURL,
		Role: presentationDTO.RoleDTO{
			Code: updatedUser.Role.Code,
			Name: updatedUser.Role.Name,
		},
		Status:    updatedUser.Status,
		CreatedAt: updatedUser.CreatedAt,
	}

	response.SuccessResponse(c, resp, meta)
}

// Delete handles delete user request
func (h *UserHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	err := h.userUC.Delete(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrUserNotFound {
			errors.ErrorResponse(c, "USER_NOT_FOUND", map[string]interface{}{
				"user_id": id,
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

	response.SuccessResponseDeleted(c, "user", id, meta)
}
