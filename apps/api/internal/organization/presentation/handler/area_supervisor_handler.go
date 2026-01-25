package handler

import (
	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/organization/domain/dto"
	"github.com/gilabs/gims/api/internal/organization/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// AreaSupervisorHandler handles area supervisor HTTP requests
type AreaSupervisorHandler struct {
	areaSupervisorUC usecase.AreaSupervisorUsecase
}

// NewAreaSupervisorHandler creates a new AreaSupervisorHandler
func NewAreaSupervisorHandler(areaSupervisorUC usecase.AreaSupervisorUsecase) *AreaSupervisorHandler {
	return &AreaSupervisorHandler{areaSupervisorUC: areaSupervisorUC}
}

func (h *AreaSupervisorHandler) List(c *gin.Context) {
	var req dto.ListAreaSupervisorsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidQueryParamResponse(c)
		return
	}

	supervisors, pagination, err := h.areaSupervisorUC.List(c.Request.Context(), &req)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
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
	}

	response.SuccessResponse(c, supervisors, meta)
}

func (h *AreaSupervisorHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	supervisor, err := h.areaSupervisorUC.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrAreaSupervisorNotFound {
			errors.ErrorResponse(c, "AREA_SUPERVISOR_NOT_FOUND", map[string]interface{}{
				"area_supervisor_id": id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, supervisor, nil)
}

func (h *AreaSupervisorHandler) Create(c *gin.Context) {
	var req dto.CreateAreaSupervisorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	supervisor, err := h.areaSupervisorUC.Create(c.Request.Context(), &req)
	if err != nil {
		if err == usecase.ErrInvalidAreaID {
			errors.ErrorResponse(c, "INVALID_AREA_ID", map[string]interface{}{
				"reason": "one or more area IDs are invalid",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponseCreated(c, supervisor, nil)
}

func (h *AreaSupervisorHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateAreaSupervisorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	supervisor, err := h.areaSupervisorUC.Update(c.Request.Context(), id, &req)
	if err != nil {
		if err == usecase.ErrAreaSupervisorNotFound {
			errors.ErrorResponse(c, "AREA_SUPERVISOR_NOT_FOUND", map[string]interface{}{
				"area_supervisor_id": id,
			}, nil)
			return
		}
		if err == usecase.ErrInvalidAreaID {
			errors.ErrorResponse(c, "INVALID_AREA_ID", map[string]interface{}{
				"reason": "one or more area IDs are invalid",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, supervisor, nil)
}

func (h *AreaSupervisorHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	err := h.areaSupervisorUC.Delete(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrAreaSupervisorNotFound {
			errors.ErrorResponse(c, "AREA_SUPERVISOR_NOT_FOUND", map[string]interface{}{
				"area_supervisor_id": id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponseDeleted(c, "area_supervisor", id, nil)
}

// AssignAreas handles assign areas to supervisor request
func (h *AreaSupervisorHandler) AssignAreas(c *gin.Context) {
	id := c.Param("id")
	var req dto.AssignAreasRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	supervisor, err := h.areaSupervisorUC.AssignAreas(c.Request.Context(), id, &req)
	if err != nil {
		if err == usecase.ErrAreaSupervisorNotFound {
			errors.ErrorResponse(c, "AREA_SUPERVISOR_NOT_FOUND", map[string]interface{}{
				"area_supervisor_id": id,
			}, nil)
			return
		}
		if err == usecase.ErrInvalidAreaID {
			errors.ErrorResponse(c, "INVALID_AREA_ID", map[string]interface{}{
				"reason": "one or more area IDs are invalid",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, supervisor, nil)
}
