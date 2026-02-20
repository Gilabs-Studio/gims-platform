package handler

import (
	"strconv"
	"time"

	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// OvertimeRequestHandler handles overtime request HTTP requests
type OvertimeRequestHandler struct {
	overtimeUC usecase.OvertimeRequestUsecase
}

// NewOvertimeRequestHandler creates a new OvertimeRequestHandler
func NewOvertimeRequestHandler(overtimeUC usecase.OvertimeRequestUsecase) *OvertimeRequestHandler {
	return &OvertimeRequestHandler{overtimeUC: overtimeUC}
}

// List handles list overtime requests
func (h *OvertimeRequestHandler) List(c *gin.Context) {
	var req dto.ListOvertimeRequestsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidQueryParamResponse(c)
		return
	}

	requests, pagination, err := h.overtimeUC.List(c.Request.Context(), &req)
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
		Filters: map[string]interface{}{},
	}

	if req.EmployeeID != "" {
		meta.Filters["employee_id"] = req.EmployeeID
	}
	if req.Status != "" {
		meta.Filters["status"] = req.Status
	}
	if req.RequestType != "" {
		meta.Filters["request_type"] = req.RequestType
	}

	response.SuccessResponse(c, requests, meta)
}

// GetByID handles get overtime request by ID
func (h *OvertimeRequestHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	request, err := h.overtimeUC.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrOvertimeRequestNotFound {
			errors.ErrorResponse(c, "OVERTIME_REQUEST_NOT_FOUND", map[string]interface{}{
				"request_id": id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, request, nil)
}

// GetPending handles get pending overtime requests for manager
func (h *OvertimeRequestHandler) GetPending(c *gin.Context) {
	// Get manager ID from context
	managerID, exists := c.Get("user_id")
	if !exists {
		errors.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	requests, err := h.overtimeUC.GetPendingForManager(c.Request.Context(), managerID.(string))
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, requests, nil)
}

// Create handles create overtime request
func (h *OvertimeRequestHandler) Create(c *gin.Context) {
	// Get employee ID from context
	employeeID, exists := c.Get("employee_id")
	if !exists {
		employeeID, exists = c.Get("user_id")
		if !exists {
			errors.UnauthorizedResponse(c, "User not authenticated")
			return
		}
	}

	var req dto.CreateOvertimeRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	request, err := h.overtimeUC.Create(c.Request.Context(), &req, employeeID.(string))
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponseCreated(c, request, nil)
}

// Update handles update overtime request
func (h *OvertimeRequestHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateOvertimeRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	request, err := h.overtimeUC.Update(c.Request.Context(), id, &req)
	if err != nil {
		if err == usecase.ErrOvertimeRequestNotFound {
			errors.ErrorResponse(c, "OVERTIME_REQUEST_NOT_FOUND", map[string]interface{}{
				"request_id": id,
			}, nil)
			return
		}
		if err == usecase.ErrCannotModifyApprovedRequest {
			errors.ErrorResponse(c, "CANNOT_MODIFY_REQUEST", map[string]interface{}{
				"request_id": id,
				"message":    "Cannot modify an already processed request",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, request, nil)
}

// Approve handles approve overtime request
func (h *OvertimeRequestHandler) Approve(c *gin.Context) {
	id := c.Param("id")

	// Get approver ID from context
	approverID, exists := c.Get("user_id")
	if !exists {
		errors.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	var req dto.ApproveOvertimeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	request, err := h.overtimeUC.Approve(c.Request.Context(), id, &req, approverID.(string))
	if err != nil {
		if err == usecase.ErrOvertimeRequestNotFound {
			errors.ErrorResponse(c, "OVERTIME_REQUEST_NOT_FOUND", map[string]interface{}{
				"request_id": id,
			}, nil)
			return
		}
		if err == usecase.ErrOvertimeAlreadyProcessed {
			errors.ErrorResponse(c, "REQUEST_ALREADY_PROCESSED", map[string]interface{}{
				"request_id": id,
				"message":    "This request has already been processed",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, request, nil)
}

// Reject handles reject overtime request
func (h *OvertimeRequestHandler) Reject(c *gin.Context) {
	id := c.Param("id")

	// Get rejecter ID from context
	rejecterID, exists := c.Get("user_id")
	if !exists {
		errors.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	var req dto.RejectOvertimeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	request, err := h.overtimeUC.Reject(c.Request.Context(), id, &req, rejecterID.(string))
	if err != nil {
		if err == usecase.ErrOvertimeRequestNotFound {
			errors.ErrorResponse(c, "OVERTIME_REQUEST_NOT_FOUND", map[string]interface{}{
				"request_id": id,
			}, nil)
			return
		}
		if err == usecase.ErrOvertimeAlreadyProcessed {
			errors.ErrorResponse(c, "REQUEST_ALREADY_PROCESSED", map[string]interface{}{
				"request_id": id,
				"message":    "This request has already been processed",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, request, nil)
}

// Cancel handles cancel overtime request
func (h *OvertimeRequestHandler) Cancel(c *gin.Context) {
	id := c.Param("id")

	// Get employee ID from context
	employeeID, exists := c.Get("employee_id")
	if !exists {
		employeeID, exists = c.Get("user_id")
		if !exists {
			errors.UnauthorizedResponse(c, "User not authenticated")
			return
		}
	}

	err := h.overtimeUC.Cancel(c.Request.Context(), id, employeeID.(string))
	if err != nil {
		if err == usecase.ErrOvertimeRequestNotFound {
			errors.ErrorResponse(c, "OVERTIME_REQUEST_NOT_FOUND", map[string]interface{}{
				"request_id": id,
			}, nil)
			return
		}
		if err == usecase.ErrOvertimeAlreadyProcessed {
			errors.ErrorResponse(c, "REQUEST_ALREADY_PROCESSED", map[string]interface{}{
				"request_id": id,
				"message":    "Cannot cancel a processed request",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, map[string]interface{}{
		"message": "Overtime request cancelled successfully",
	}, nil)
}

// Delete handles delete overtime request
func (h *OvertimeRequestHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	err := h.overtimeUC.Delete(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrOvertimeRequestNotFound {
			errors.ErrorResponse(c, "OVERTIME_REQUEST_NOT_FOUND", map[string]interface{}{
				"request_id": id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, map[string]interface{}{
		"message": "Overtime request deleted successfully",
	}, nil)
}

// GetMonthlySummary handles get monthly overtime summary
func (h *OvertimeRequestHandler) GetMonthlySummary(c *gin.Context) {
	// Get employee ID from context or query
	employeeID := c.Query("employee_id")
	if employeeID == "" {
		id, exists := c.Get("employee_id")
		if !exists {
			id, exists = c.Get("user_id")
			if !exists {
				errors.UnauthorizedResponse(c, "User not authenticated")
				return
			}
		}
		employeeID = id.(string)
	}

	// Parse year and month from query params, default to current month
	year := time.Now().Year()
	month := int(time.Now().Month())

	if yearStr := c.Query("year"); yearStr != "" {
		if y, err := strconv.Atoi(yearStr); err == nil && y >= 2000 && y <= 2100 {
			year = y
		}
	}
	if monthStr := c.Query("month"); monthStr != "" {
		if m, err := strconv.Atoi(monthStr); err == nil && m >= 1 && m <= 12 {
			month = m
		}
	}

	summary, err := h.overtimeUC.GetEmployeeMonthlySummary(c.Request.Context(), employeeID, year, month)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, summary, nil)
}

// GetPendingNotifications handles get pending overtime notifications for polling
func (h *OvertimeRequestHandler) GetPendingNotifications(c *gin.Context) {
	notifications, err := h.overtimeUC.GetUnnotifiedPendingRequests(c.Request.Context())
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, notifications, nil)
}
