package handler

import (
	"net/http"
	"strconv"

	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/usecase"
	"github.com/gin-gonic/gin"
)

type EmployeeCertificationHandler struct {
	usecase usecase.EmployeeCertificationUsecaseInterface
}

// NewEmployeeCertificationHandler creates a new instance of EmployeeCertificationHandler
func NewEmployeeCertificationHandler(usecase usecase.EmployeeCertificationUsecaseInterface) *EmployeeCertificationHandler {
	return &EmployeeCertificationHandler{usecase: usecase}
}

// CreateCertification handles POST request to create a new certification
func (h *EmployeeCertificationHandler) CreateCertification(c *gin.Context) {
	var req dto.CreateEmployeeCertificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.HandleValidationError(c, err)
		return
	}

	// Get current user (from auth middleware)
	currentUser, exists := c.Get("currentUser")
	if !exists {
		errors.ErrorResponse(c, "UNAUTHORIZED", map[string]interface{}{"message": "Unauthorized"}, nil)
		return
	}

	certification, err := h.usecase.CreateCertification(c.Request.Context(), &req, currentUser.(string))
	if err != nil {
		handleCertificationError(c, err)
		return
	}

	response.SuccessResponse(c, certification, nil)
}

// UpdateCertification handles PUT request to update a certification
func (h *EmployeeCertificationHandler) UpdateCertification(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.ErrorResponse(c, "INVALID_ID", map[string]interface{}{"message": "Invalid certification ID"}, nil)
		return
	}

	var req dto.UpdateEmployeeCertificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.HandleValidationError(c, err)
		return
	}

	// Get current user
	currentUser, exists := c.Get("currentUser")
	if !exists {
		errors.ErrorResponse(c, "UNAUTHORIZED", map[string]interface{}{"message": "Unauthorized"}, nil)
		return
	}

	certification, err := h.usecase.UpdateCertification(c.Request.Context(), id, &req, currentUser.(string))
	if err != nil {
		handleCertificationError(c, err)
		return
	}

	response.SuccessResponse(c, certification, nil)
}

// DeleteCertification handles DELETE request to soft delete a certification
func (h *EmployeeCertificationHandler) DeleteCertification(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "Invalid certification ID", nil, nil)
		return
	}

	if err := h.usecase.DeleteCertification(c.Request.Context(), id); err != nil {
		handleCertificationError(c, err)
		return
	}

	response.SuccessResponse(c, gin.H{"message": "Certification deleted successfully"}, nil)
}

// GetCertificationByID handles GET request to retrieve a certification by ID
func (h *EmployeeCertificationHandler) GetCertificationByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "Invalid certification ID", nil, nil)
		return
	}

	certification, err := h.usecase.GetCertificationByID(c.Request.Context(), id)
	if err != nil {
		handleCertificationError(c, err)
		return
	}

	response.SuccessResponse(c, certification, nil)
}

// GetAllCertifications handles GET request to retrieve all certifications
func (h *EmployeeCertificationHandler) GetAllCertifications(c *gin.Context) {
	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	search := c.Query("search")
	employeeID := c.Query("employee_id")

	certifications, total, err := h.usecase.GetAllCertifications(c.Request.Context(), page, perPage, search, employeeID)
	if err != nil {
		handleCertificationError(c, err)
		return
	}

	// Build pagination response
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}

	meta := response.NewPaginationMeta(page, perPage, int(total))
	response.SuccessResponse(c, certifications, &response.Meta{Pagination: meta})
}

// GetCertificationsByEmployeeID handles GET request to retrieve certifications by employee ID
func (h *EmployeeCertificationHandler) GetCertificationsByEmployeeID(c *gin.Context) {
	employeeID := c.Param("employee_id")
	if employeeID == "" {
		errors.ErrorResponse(c, "INVALID_EMPLOYEE_ID", map[string]interface{}{"message": "Invalid employee ID"}, nil)
		return
	}

	certifications, err := h.usecase.GetCertificationsByEmployeeID(c.Request.Context(), employeeID)
	if err != nil {
		handleCertificationError(c, err)
		return
	}

	response.SuccessResponse(c, certifications, nil)
}

// GetExpiringCertifications handles GET request to retrieve certifications expiring soon
func (h *EmployeeCertificationHandler) GetExpiringCertifications(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))

	certifications, err := h.usecase.GetExpiringCertifications(c.Request.Context(), days)
	if err != nil {
		handleCertificationError(c, err)
		return
	}

	response.SuccessResponse(c, certifications, nil)
}

// GetFormData handles GET request to retrieve form dropdown options
func (h *EmployeeCertificationHandler) GetFormData(c *gin.Context) {
	formData, err := h.usecase.GetFormData(c.Request.Context())
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve form data", nil, nil)
		return
	}

	response.SuccessResponse(c, formData, nil)
}

// handleCertificationError handles certification-specific errors
func handleCertificationError(c *gin.Context, err error) {
	switch err.Error() {
	case "employee not found":
		errors.ErrorResponse(c, "EMPLOYEE_NOT_FOUND", map[string]interface{}{"message": "Employee not found"}, nil)
	case "certification not found":
		errors.ErrorResponse(c, "CERTIFICATION_NOT_FOUND", map[string]interface{}{"message": "Certification not found"}, nil)
	case "invalid issue_date format, must be YYYY-MM-DD":
		errors.ErrorResponse(c, "INVALID_DATE_FORMAT", map[string]interface{}{"message": "Invalid issue date format"}, nil)
	case "invalid expiry_date format, must be YYYY-MM-DD":
		errors.ErrorResponse(c, "INVALID_DATE_FORMAT", map[string]interface{}{"message": "Invalid expiry date format"}, nil)
	case "expiry date must be after issue date":
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": "Expiry date must be after issue date"}, nil)
	default:
		errors.ErrorResponse(c, "INTERNAL_ERROR", map[string]interface{}{"message": "An unexpected error occurred"}, nil)
	}
}
