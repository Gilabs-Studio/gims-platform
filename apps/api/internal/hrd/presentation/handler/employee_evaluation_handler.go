package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/usecase"
	"github.com/gin-gonic/gin"
)

type EmployeeEvaluationHandler struct {
	usecase usecase.EmployeeEvaluationUsecase
}

// NewEmployeeEvaluationHandler creates a new instance of EmployeeEvaluationHandler
func NewEmployeeEvaluationHandler(usecase usecase.EmployeeEvaluationUsecase) *EmployeeEvaluationHandler {
	return &EmployeeEvaluationHandler{
		usecase: usecase,
	}
}

// GetAll retrieves all employee evaluations with pagination and filters
// GET /hrd/employee-evaluations?page=1&per_page=20&employee_id=uuid&evaluation_group_id=uuid&status=DRAFT&evaluation_type=SELF
func (h *EmployeeEvaluationHandler) GetAll(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	search := c.Query("search")
	employeeID := c.Query("employee_id")
	evaluationGroupID := c.Query("evaluation_group_id")
	status := c.Query("status")
	evaluationType := c.Query("evaluation_type")

	evaluations, meta, err := h.usecase.GetAll(c.Request.Context(), page, perPage, search, employeeID, evaluationGroupID, status, evaluationType)
	if err != nil {
		handleEmployeeEvaluationError(c, err)
		return
	}

	response.SuccessResponse(c, evaluations, &response.Meta{Pagination: meta})
}

// GetByID retrieves an employee evaluation by ID (with details)
// GET /hrd/employee-evaluations/:id
func (h *EmployeeEvaluationHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	evaluation, err := h.usecase.GetByID(c.Request.Context(), id)
	if err != nil {
		handleEmployeeEvaluationError(c, err)
		return
	}

	response.SuccessResponse(c, evaluation, nil)
}

// GetFormData retrieves form dropdown data
// GET /hrd/employee-evaluations/form-data
func (h *EmployeeEvaluationHandler) GetFormData(c *gin.Context) {
	formData, err := h.usecase.GetFormData(c.Request.Context())
	if err != nil {
		handleEmployeeEvaluationError(c, err)
		return
	}

	response.SuccessResponse(c, formData, nil)
}

// Create creates a new employee evaluation
// POST /hrd/employee-evaluations
func (h *EmployeeEvaluationHandler) Create(c *gin.Context) {
	var req dto.CreateEmployeeEvaluationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body", err.Error(), nil)
		return
	}

	evaluation, err := h.usecase.Create(c.Request.Context(), &req)
	if err != nil {
		handleEmployeeEvaluationError(c, err)
		return
	}

	response.SuccessResponse(c, evaluation, nil)
}

// Update updates an existing employee evaluation
// PUT /hrd/employee-evaluations/:id
func (h *EmployeeEvaluationHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateEmployeeEvaluationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body", err.Error(), nil)
		return
	}

	evaluation, err := h.usecase.Update(c.Request.Context(), id, &req)
	if err != nil {
		handleEmployeeEvaluationError(c, err)
		return
	}

	response.SuccessResponse(c, evaluation, nil)
}

// UpdateStatus transitions evaluation status
// POST /hrd/employee-evaluations/:id/status
func (h *EmployeeEvaluationHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")

	var req dto.SubmitEvaluationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body", err.Error(), nil)
		return
	}

	evaluation, err := h.usecase.UpdateStatus(c.Request.Context(), id, &req)
	if err != nil {
		handleEmployeeEvaluationError(c, err)
		return
	}

	response.SuccessResponse(c, evaluation, nil)
}

// Delete performs soft delete on an employee evaluation
// DELETE /hrd/employee-evaluations/:id
func (h *EmployeeEvaluationHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.usecase.Delete(c.Request.Context(), id); err != nil {
		handleEmployeeEvaluationError(c, err)
		return
	}

	response.SuccessResponse(c, gin.H{"message": "Employee evaluation deleted successfully"}, nil)
}

// handleEmployeeEvaluationError handles errors and returns appropriate HTTP responses
func handleEmployeeEvaluationError(c *gin.Context, err error) {
	switch err.Error() {
	case "employee not found":
		errors.ErrorResponse(c, "EMPLOYEE_NOT_FOUND", map[string]interface{}{"message": "Employee not found"}, nil)
	case "evaluator not found":
		errors.ErrorResponse(c, "EVALUATOR_NOT_FOUND", map[string]interface{}{"message": "Evaluator not found"}, nil)
	case "employee evaluation not found":
		errors.ErrorResponse(c, "EMPLOYEE_EVALUATION_NOT_FOUND", map[string]interface{}{"message": "Employee evaluation not found"}, nil)
	case "evaluation group not found":
		errors.ErrorResponse(c, "EVALUATION_GROUP_NOT_FOUND", map[string]interface{}{"message": "Evaluation group not found"}, nil)
	case "evaluation group is not active":
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": "Evaluation group is not active"}, nil)
	case "only draft evaluations can be edited":
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": "Only draft evaluations can be edited"}, nil)
	case "only draft evaluations can be deleted":
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": "Only draft evaluations can be deleted"}, nil)
	case "cannot submit evaluation without criteria scores":
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": "Cannot submit evaluation without criteria scores"}, nil)
	case "evaluation is already finalized":
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": "Evaluation is already finalized"}, nil)
	case "period_end must be after period_start":
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": "Period end must be after period start"}, nil)
	case "invalid period_start format, must be YYYY-MM-DD",
		"invalid period_end format, must be YYYY-MM-DD":
		errors.ErrorResponse(c, "INVALID_DATE_FORMAT", map[string]interface{}{"message": err.Error()}, nil)
	default:
		// Handle dynamic error messages (e.g., "cannot transition from X to Y")
		if strings.Contains(err.Error(), "cannot transition") ||
			strings.Contains(err.Error(), "does not belong to") {
			errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": err.Error()}, nil)
		} else {
			errors.ErrorResponse(c, "INTERNAL_ERROR", map[string]interface{}{"message": "An unexpected error occurred"}, nil)
		}
	}
}
