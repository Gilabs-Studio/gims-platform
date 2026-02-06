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

type EmployeeContractHandler struct {
	usecase usecase.EmployeeContractUsecase
}

func NewEmployeeContractHandler(usecase usecase.EmployeeContractUsecase) *EmployeeContractHandler {
	return &EmployeeContractHandler{
		usecase: usecase,
	}
}

// Create handles POST /hrd/employee-contracts
func (h *EmployeeContractHandler) Create(c *gin.Context) {
	var req dto.CreateEmployeeContractRequest
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

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		errors.ErrorResponse(c, "UNAUTHORIZED", nil, nil)
		return
	}

	contract, err := h.usecase.Create(c.Request.Context(), &req, userID)
	if err != nil {
		handleEmployeeContractError(c, err)
		return
	}

	response.SuccessResponseCreated(c, contract, nil)
}

// Update handles PUT /hrd/employee-contracts/:id
func (h *EmployeeContractHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.ErrorResponse(c, "INVALID_ID", map[string]interface{}{"message": "Invalid contract ID"}, nil)
		return
	}

	var req dto.UpdateEmployeeContractRequest
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

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		errors.ErrorResponse(c, "UNAUTHORIZED", nil, nil)
		return
	}

	contract, err := h.usecase.Update(c.Request.Context(), id, &req, userID)
	if err != nil {
		handleEmployeeContractError(c, err)
		return
	}

	response.SuccessResponse(c, contract, nil)
}

// Delete handles DELETE /hrd/employee-contracts/:id
func (h *EmployeeContractHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.ErrorResponse(c, "INVALID_ID", map[string]interface{}{"message": "Invalid contract ID"}, nil)
		return
	}

	if err := h.usecase.Delete(c.Request.Context(), id); err != nil {
		handleEmployeeContractError(c, err)
		return
	}

	response.SuccessResponse(c, map[string]string{"message": "Contract deleted successfully"}, nil)
}

// GetByID handles GET /hrd/employee-contracts/:id
func (h *EmployeeContractHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.ErrorResponse(c, "INVALID_ID", map[string]interface{}{"message": "Invalid contract ID"}, nil)
		return
	}

	contract, err := h.usecase.GetByID(c.Request.Context(), id)
	if err != nil {
		handleEmployeeContractError(c, err)
		return
	}

	response.SuccessResponse(c, contract, nil)
}

// GetAll handles GET /hrd/employee-contracts
func (h *EmployeeContractHandler) GetAll(c *gin.Context) {
	var req dto.ListEmployeeContractsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		errors.HandleValidationError(c, err)
		return
	}

	contracts, total, err := h.usecase.GetAll(c.Request.Context(), &req)
	if err != nil {
		handleEmployeeContractError(c, err)
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
	response.SuccessResponse(c, contracts, &response.Meta{Pagination: meta})
}

// GetByEmployeeID handles GET /hrd/employee-contracts/employee/:employee_id
func (h *EmployeeContractHandler) GetByEmployeeID(c *gin.Context) {
	employeeID, err := uuid.Parse(c.Param("employee_id"))
	if err != nil {
		errors.ErrorResponse(c, "INVALID_ID", map[string]interface{}{"message": "Invalid employee ID"}, nil)
		return
	}

	contracts, err := h.usecase.GetByEmployeeID(c.Request.Context(), employeeID)
	if err != nil {
		handleEmployeeContractError(c, err)
		return
	}

	response.SuccessResponse(c, contracts, nil)
}

// GetExpiring handles GET /hrd/employee-contracts/expiring
func (h *EmployeeContractHandler) GetExpiring(c *gin.Context) {
	var req dto.ExpiringContractsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		errors.HandleValidationError(c, err)
		return
	}

	contracts, total, err := h.usecase.GetExpiring(c.Request.Context(), &req)
	if err != nil {
		handleEmployeeContractError(c, err)
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
	response.SuccessResponse(c, contracts, &response.Meta{Pagination: meta})
}

// handleEmployeeContractError maps usecase errors to appropriate HTTP responses
func handleEmployeeContractError(c *gin.Context, err error) {
	errMsg := err.Error()

	switch {
	case strings.Contains(errMsg, "employee not found"):
		errors.ErrorResponse(c, "EMPLOYEE_NOT_FOUND", map[string]interface{}{"message": errMsg}, nil)
	case strings.Contains(errMsg, "contract not found"):
		errors.ErrorResponse(c, "CONTRACT_NOT_FOUND", map[string]interface{}{"message": errMsg}, nil)
	case strings.Contains(errMsg, "contract number already exists"):
		errors.ErrorResponse(c, "CONTRACT_NUMBER_EXISTS", map[string]interface{}{"message": errMsg}, nil)
	case strings.Contains(errMsg, "invalid") || strings.Contains(errMsg, "INVALID"):
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": errMsg}, nil)
	case strings.Contains(errMsg, "permanent contracts"):
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": errMsg}, nil)
	case strings.Contains(errMsg, "non-permanent contracts"):
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": errMsg}, nil)
	case strings.Contains(errMsg, "end date cannot be before"):
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": errMsg}, nil)
	default:
		errors.ErrorResponse(c, "INTERNAL_ERROR", map[string]interface{}{"message": "An unexpected error occurred"}, nil)
	}
}
