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

type EmployeeAssetHandler struct {
	usecase usecase.EmployeeAssetUsecase
}

// NewEmployeeAssetHandler creates a new instance of EmployeeAssetHandler
func NewEmployeeAssetHandler(usecase usecase.EmployeeAssetUsecase) *EmployeeAssetHandler {
	return &EmployeeAssetHandler{
		usecase: usecase,
	}
}

// GetAll retrieves all employee assets with pagination and filters
// GET /hrd/employee-assets?page=1&per_page=20&search=laptop&employee_id=uuid&status=BORROWED
func (h *EmployeeAssetHandler) GetAll(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	search := c.Query("search")
	employeeID := c.Query("employee_id")
	status := c.Query("status")

	assets, meta, err := h.usecase.GetAll(c.Request.Context(), page, perPage, search, employeeID, status)
	if err != nil {
		handleEmployeeAssetError(c, err)
		return
	}

	response.SuccessResponse(c, assets, &response.Meta{Pagination: meta})
}

// GetByID retrieves an employee asset by ID
// GET /hrd/employee-assets/:id
func (h *EmployeeAssetHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	asset, err := h.usecase.GetByID(c.Request.Context(), id)
	if err != nil {
		handleEmployeeAssetError(c, err)
		return
	}

	response.SuccessResponse(c, asset, nil)
}

// GetByEmployeeID retrieves all assets for a specific employee
// GET /hrd/employee-assets/employee/:employee_id
func (h *EmployeeAssetHandler) GetByEmployeeID(c *gin.Context) {
	employeeID := c.Param("employee_id")

	assets, err := h.usecase.GetByEmployeeID(c.Request.Context(), employeeID)
	if err != nil {
		handleEmployeeAssetError(c, err)
		return
	}

	response.SuccessResponse(c, assets, nil)
}

// GetBorrowed retrieves all currently borrowed assets
// GET /hrd/employee-assets/borrowed
func (h *EmployeeAssetHandler) GetBorrowed(c *gin.Context) {
	assets, err := h.usecase.GetBorrowed(c.Request.Context())
	if err != nil {
		handleEmployeeAssetError(c, err)
		return
	}

	response.SuccessResponse(c, assets, nil)
}

// GetFormData retrieves form dropdown data (employees)
// GET /hrd/employee-assets/form-data
func (h *EmployeeAssetHandler) GetFormData(c *gin.Context) {
	formData, err := h.usecase.GetFormData(c.Request.Context())
	if err != nil {
		handleEmployeeAssetError(c, err)
		return
	}

	response.SuccessResponse(c, formData, nil)
}

// Create creates a new employee asset record
// POST /hrd/employee-assets
func (h *EmployeeAssetHandler) Create(c *gin.Context) {
	var req dto.CreateEmployeeAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body", err.Error(), nil)
		return
	}

	asset, err := h.usecase.Create(c.Request.Context(), &req)
	if err != nil {
		handleEmployeeAssetError(c, err)
		return
	}

	response.SuccessResponse(c, asset, nil)
}

// Update updates an existing employee asset record
// PUT /hrd/employee-assets/:id
func (h *EmployeeAssetHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateEmployeeAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body", err.Error(), nil)
		return
	}

	asset, err := h.usecase.Update(c.Request.Context(), id, &req)
	if err != nil {
		handleEmployeeAssetError(c, err)
		return
	}

	response.SuccessResponse(c, asset, nil)
}

// ReturnAsset marks an asset as returned
// POST /hrd/employee-assets/:id/return
func (h *EmployeeAssetHandler) ReturnAsset(c *gin.Context) {
	id := c.Param("id")

	var req dto.ReturnAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body", err.Error(), nil)
		return
	}

	asset, err := h.usecase.ReturnAsset(c.Request.Context(), id, &req)
	if err != nil {
		handleEmployeeAssetError(c, err)
		return
	}

	response.SuccessResponse(c, asset, nil)
}

// Delete performs soft delete on an employee asset record
// DELETE /hrd/employee-assets/:id
func (h *EmployeeAssetHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.usecase.Delete(c.Request.Context(), id); err != nil {
		handleEmployeeAssetError(c, err)
		return
	}

	response.SuccessResponse(c, gin.H{"message": "Employee asset deleted successfully"}, nil)
}

// handleEmployeeAssetError handles errors and returns appropriate HTTP responses
func handleEmployeeAssetError(c *gin.Context, err error) {
	switch err.Error() {
	case "employee not found":
		errors.ErrorResponse(c, "EMPLOYEE_NOT_FOUND", map[string]interface{}{"message": "Employee not found"}, nil)
	case "employee asset not found":
		errors.ErrorResponse(c, "EMPLOYEE_ASSET_NOT_FOUND", map[string]interface{}{"message": "Employee asset not found"}, nil)
	case "asset code already exists and is currently borrowed":
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": "Asset code already exists and is currently borrowed"}, nil)
	case "cannot update asset that has been returned":
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": "Cannot update asset that has been returned"}, nil)
	case "asset has already been returned":
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": "Asset has already been returned"}, nil)
	case "invalid borrow date format, must be YYYY-MM-DD":
		errors.ErrorResponse(c, "INVALID_DATE_FORMAT", map[string]interface{}{"message": "Invalid borrow date format"}, nil)
	case "invalid return date format, must be YYYY-MM-DD":
		errors.ErrorResponse(c, "INVALID_DATE_FORMAT", map[string]interface{}{"message": "Invalid return date format"}, nil)
	case "return date must be after borrow date":
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": "Return date must be after borrow date"}, nil)
	default:
		errors.ErrorResponse(c, "INTERNAL_ERROR", map[string]interface{}{"message": "An unexpected error occurred"}, nil)
	}
}
