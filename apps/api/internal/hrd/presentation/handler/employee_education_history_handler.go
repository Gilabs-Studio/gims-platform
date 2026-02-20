package handler

import (
	"strings"

	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type EmployeeEducationHistoryHandler struct {
	usecase usecase.EmployeeEducationHistoryUsecase
}

func NewEmployeeEducationHistoryHandler(usecase usecase.EmployeeEducationHistoryUsecase) *EmployeeEducationHistoryHandler {
	return &EmployeeEducationHistoryHandler{
		usecase: usecase,
	}
}

// Create handles POST /hrd/employee-education-histories
func (h *EmployeeEducationHistoryHandler) Create(c *gin.Context) {
	var req dto.CreateEmployeeEducationHistoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.HandleValidationError(c, err)
		return
	}

	currentUserID, exists := c.Get("user_id")
	if !exists {
		errors.ErrorResponse(c, "UNAUTHORIZED", nil, nil)
		return
	}

	userIDStr, ok := currentUserID.(string)
	if !ok {
		errors.ErrorResponse(c, "UNAUTHORIZED", nil, nil)
		return
	}

	education, err := h.usecase.Create(c.Request.Context(), &req, userIDStr)
	if err != nil {
		handleEducationHistoryError(c, err)
		return
	}

	response.SuccessResponseCreated(c, education, nil)
}

// Update handles PUT /hrd/employee-education-histories/:id
func (h *EmployeeEducationHistoryHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.ErrorResponse(c, "INVALID_ID", map[string]interface{}{"message": "Invalid education history ID"}, nil)
		return
	}

	var req dto.UpdateEmployeeEducationHistoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.HandleValidationError(c, err)
		return
	}

	currentUserID, exists := c.Get("user_id")
	if !exists {
		errors.ErrorResponse(c, "UNAUTHORIZED", nil, nil)
		return
	}

	userIDStr, ok := currentUserID.(string)
	if !ok {
		errors.ErrorResponse(c, "UNAUTHORIZED", nil, nil)
		return
	}

	education, err := h.usecase.Update(c.Request.Context(), id, &req, userIDStr)
	if err != nil {
		handleEducationHistoryError(c, err)
		return
	}

	response.SuccessResponse(c, education, nil)
}

// Delete handles DELETE /hrd/employee-education-histories/:id
func (h *EmployeeEducationHistoryHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.ErrorResponse(c, "INVALID_ID", map[string]interface{}{"message": "Invalid education history ID"}, nil)
		return
	}

	if err := h.usecase.Delete(c.Request.Context(), id); err != nil {
		handleEducationHistoryError(c, err)
		return
	}

	response.SuccessResponse(c, map[string]string{"message": "Education history deleted successfully"}, nil)
}

// GetByID handles GET /hrd/employee-education-histories/:id
func (h *EmployeeEducationHistoryHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.ErrorResponse(c, "INVALID_ID", map[string]interface{}{"message": "Invalid education history ID"}, nil)
		return
	}

	education, err := h.usecase.GetByID(c.Request.Context(), id)
	if err != nil {
		handleEducationHistoryError(c, err)
		return
	}

	response.SuccessResponse(c, education, nil)
}

// GetAll handles GET /hrd/employee-education-histories
func (h *EmployeeEducationHistoryHandler) GetAll(c *gin.Context) {
	var req dto.ListEmployeeEducationHistoriesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		errors.HandleValidationError(c, err)
		return
	}

	educations, total, err := h.usecase.GetAll(c.Request.Context(), &req)
	if err != nil {
		handleEducationHistoryError(c, err)
		return
	}

	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}

	meta := response.NewPaginationMeta(page, perPage, int(total))
	response.SuccessResponse(c, educations, &response.Meta{Pagination: meta})
}

// GetByEmployeeID handles GET /hrd/employee-education-histories/employee/:employee_id
func (h *EmployeeEducationHistoryHandler) GetByEmployeeID(c *gin.Context) {
	employeeID, err := uuid.Parse(c.Param("employee_id"))
	if err != nil {
		errors.ErrorResponse(c, "INVALID_ID", map[string]interface{}{"message": "Invalid employee ID"}, nil)
		return
	}

	educations, err := h.usecase.GetByEmployeeID(c.Request.Context(), employeeID)
	if err != nil {
		handleEducationHistoryError(c, err)
		return
	}

	response.SuccessResponse(c, educations, nil)
}

// handleEducationHistoryError maps usecase errors to appropriate HTTP responses
func handleEducationHistoryError(c *gin.Context, err error) {
	errMsg := err.Error()

	switch {
	case strings.Contains(errMsg, "employee not found"):
		errors.ErrorResponse(c, "EMPLOYEE_NOT_FOUND", map[string]interface{}{"message": errMsg}, nil)
	case strings.Contains(errMsg, "education history not found"):
		errors.ErrorResponse(c, "EDUCATION_HISTORY_NOT_FOUND", map[string]interface{}{"message": errMsg}, nil)
	case strings.Contains(errMsg, "invalid") || strings.Contains(errMsg, "INVALID"):
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": errMsg}, nil)
	case strings.Contains(errMsg, "end date must be after"):
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": errMsg}, nil)
	case strings.Contains(errMsg, "GPA must be between"):
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": errMsg}, nil)
	default:
		errors.ErrorResponse(c, "INTERNAL_ERROR", map[string]interface{}{"message": "An unexpected error occurred"}, nil)
	}
}

func (h *EmployeeEducationHistoryHandler) GetFormData(c *gin.Context) {
	formData, err := h.usecase.GetFormData(c.Request.Context())
	if err != nil {
		handleEducationHistoryError(c, err)
		return
	}

	response.SuccessResponse(c, formData, nil)
}
