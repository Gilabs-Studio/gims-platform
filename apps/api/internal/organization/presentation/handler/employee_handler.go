package handler

import (
	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/organization/domain/dto"
	"github.com/gilabs/gims/api/internal/organization/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// EmployeeHandler handles HTTP requests for employee operations
type EmployeeHandler struct {
	employeeUC usecase.EmployeeUsecase
}

// NewEmployeeHandler creates a new EmployeeHandler instance
func NewEmployeeHandler(uc usecase.EmployeeUsecase) *EmployeeHandler {
	return &EmployeeHandler{employeeUC: uc}
}

// Create handles POST /employees
func (h *EmployeeHandler) Create(c *gin.Context) {
	var req dto.CreateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	// Get user ID from context (set by auth middleware)
	userID := ""
	if uid, exists := c.Get("user_id"); exists {
		if id, ok := uid.(string); ok {
			userID = id
		}
	}

	resp, err := h.employeeUC.Create(c.Request.Context(), req, userID)
	if err != nil {
		switch err {
		case usecase.ErrEmployeeCodeExists:
			errors.ErrorResponse(c, "EMPLOYEE_CODE_EXISTS", map[string]interface{}{
				"message": err.Error(),
			}, nil)
		case usecase.ErrReplacementNotFound:
			errors.ErrorResponse(c, "REPLACEMENT_NOT_FOUND", map[string]interface{}{
				"message": err.Error(),
			}, nil)
		default:
			errors.InternalServerErrorResponse(c, err.Error())
		}
		return
	}

	meta := &response.Meta{}
	if userID != "" {
		meta.CreatedBy = userID
	}
	response.SuccessResponseCreated(c, resp, meta)
}

// GetByID handles GET /employees/:id
func (h *EmployeeHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	resp, err := h.employeeUC.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrEmployeeNotFound {
			errors.ErrorResponse(c, "EMPLOYEE_NOT_FOUND", map[string]interface{}{
				"employee_id": id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, resp, nil)
}

// List handles GET /employees
func (h *EmployeeHandler) List(c *gin.Context) {
	var params dto.EmployeeListParams
	if err := c.ShouldBindQuery(&params); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidQueryParamResponse(c)
		return
	}

	employees, total, err := h.employeeUC.List(c.Request.Context(), params)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	// Calculate pagination meta
	perPage := params.PerPage
	if perPage <= 0 {
		perPage = 10
	}
	page := params.Page
	if page <= 0 {
		page = 1
	}
	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	meta := &response.Meta{
		Pagination: &response.PaginationMeta{
			Page:       page,
			PerPage:    perPage,
			Total:      int(total),
			TotalPages: totalPages,
			HasNext:    page < totalPages,
			HasPrev:    page > 1,
		},
		Filters: map[string]interface{}{},
	}

	if params.Search != "" {
		meta.Filters["search"] = params.Search
	}
	if params.DivisionID != "" {
		meta.Filters["division_id"] = params.DivisionID
	}
	if params.JobPositionID != "" {
		meta.Filters["job_position_id"] = params.JobPositionID
	}
	if params.AreaID != "" {
		meta.Filters["area_id"] = params.AreaID
	}
	if params.Status != "" {
		meta.Filters["status"] = params.Status
	}

	response.SuccessResponse(c, employees, meta)
}

// Update handles PUT /employees/:id
func (h *EmployeeHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	resp, err := h.employeeUC.Update(c.Request.Context(), id, req)
	if err != nil {
		switch err {
		case usecase.ErrEmployeeNotFound:
			errors.ErrorResponse(c, "EMPLOYEE_NOT_FOUND", map[string]interface{}{
				"employee_id": id,
			}, nil)
		case usecase.ErrEmployeeCodeExists:
			errors.ErrorResponse(c, "EMPLOYEE_CODE_EXISTS", map[string]interface{}{
				"message": err.Error(),
			}, nil)
		case usecase.ErrReplacementNotFound:
			errors.ErrorResponse(c, "REPLACEMENT_NOT_FOUND", map[string]interface{}{
				"message": err.Error(),
			}, nil)
		default:
			errors.InternalServerErrorResponse(c, err.Error())
		}
		return
	}

	meta := &response.Meta{}
	if userID, exists := c.Get("user_id"); exists {
		if uid, ok := userID.(string); ok {
			meta.UpdatedBy = uid
		}
	}
	response.SuccessResponse(c, resp, meta)
}

// Delete handles DELETE /employees/:id
func (h *EmployeeHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.employeeUC.Delete(c.Request.Context(), id); err != nil {
		if err == usecase.ErrEmployeeNotFound {
			errors.ErrorResponse(c, "EMPLOYEE_NOT_FOUND", map[string]interface{}{
				"employee_id": id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{}
	if userID, exists := c.Get("user_id"); exists {
		if uid, ok := userID.(string); ok {
			meta.DeletedBy = uid
		}
	}
	response.SuccessResponseDeleted(c, "employee", id, meta)
}

// SubmitForApproval handles POST /employees/:id/submit
func (h *EmployeeHandler) SubmitForApproval(c *gin.Context) {
	id := c.Param("id")

	resp, err := h.employeeUC.SubmitForApproval(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrEmployeeNotFound {
			errors.ErrorResponse(c, "EMPLOYEE_NOT_FOUND", map[string]interface{}{
				"employee_id": id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, resp, nil)
}

// Approve handles POST /employees/:id/approve
func (h *EmployeeHandler) Approve(c *gin.Context) {
	id := c.Param("id")

	var req dto.ApproveEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	// Get user ID from context (set by auth middleware)
	userID := ""
	if uid, exists := c.Get("user_id"); exists {
		if id, ok := uid.(string); ok {
			userID = id
		}
	}

	resp, err := h.employeeUC.Approve(c.Request.Context(), id, req, userID)
	if err != nil {
		switch err {
		case usecase.ErrEmployeeNotFound:
			errors.ErrorResponse(c, "EMPLOYEE_NOT_FOUND", map[string]interface{}{
				"employee_id": id,
			}, nil)
		case usecase.ErrCannotApproveNonPending:
			errors.ErrorResponse(c, "INVALID_STATUS", map[string]interface{}{
				"message": err.Error(),
			}, nil)
		case usecase.ErrEmployeeInvalidApprovalAction:
			errors.ErrorResponse(c, "INVALID_ACTION", map[string]interface{}{
				"message": err.Error(),
			}, nil)
		default:
			errors.InternalServerErrorResponse(c, err.Error())
		}
		return
	}

	response.SuccessResponse(c, resp, nil)
}

// AssignAreas handles POST /employees/:id/areas
func (h *EmployeeHandler) AssignAreas(c *gin.Context) {
	id := c.Param("id")

	var req dto.AssignEmployeeAreasRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	resp, err := h.employeeUC.AssignAreas(c.Request.Context(), id, req)
	if err != nil {
		if err == usecase.ErrEmployeeNotFound {
			errors.ErrorResponse(c, "EMPLOYEE_NOT_FOUND", map[string]interface{}{
				"employee_id": id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, resp, nil)
}
