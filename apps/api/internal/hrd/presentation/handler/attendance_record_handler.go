package handler

import (
	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// AttendanceRecordHandler handles attendance record HTTP requests
type AttendanceRecordHandler struct {
	attendanceUC usecase.AttendanceRecordUsecase
}

// NewAttendanceRecordHandler creates a new AttendanceRecordHandler
func NewAttendanceRecordHandler(attendanceUC usecase.AttendanceRecordUsecase) *AttendanceRecordHandler {
	return &AttendanceRecordHandler{attendanceUC: attendanceUC}
}

// List handles list attendance records request
func (h *AttendanceRecordHandler) List(c *gin.Context) {
	var req dto.ListAttendanceRecordsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidQueryParamResponse(c)
		return
	}

	records, pagination, err := h.attendanceUC.List(c.Request.Context(), &req)
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
	if req.DateFrom != "" {
		meta.Filters["date_from"] = req.DateFrom
	}
	if req.DateTo != "" {
		meta.Filters["date_to"] = req.DateTo
	}

	response.SuccessResponse(c, records, meta)
}

// GetByID handles get attendance record by ID request
func (h *AttendanceRecordHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	record, err := h.attendanceUC.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrAttendanceNotFound {
			errors.ErrorResponse(c, "ATTENDANCE_NOT_FOUND", map[string]interface{}{
				"attendance_id": id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, record, nil)
}

// GetTodayAttendance handles get today's attendance for current user
func (h *AttendanceRecordHandler) GetTodayAttendance(c *gin.Context) {
	// Get employee ID from context (set by auth middleware)
	employeeID, exists := c.Get("employee_id")
	if !exists {
		// Fallback to user_id if employee_id not set
		employeeID, exists = c.Get("user_id")
		if !exists {
			errors.UnauthorizedResponse(c, "User not authenticated")
			return
		}
	}

	attendance, err := h.attendanceUC.GetTodayAttendance(c.Request.Context(), employeeID.(string))
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, attendance, nil)
}

// ClockIn handles clock in request
func (h *AttendanceRecordHandler) ClockIn(c *gin.Context) {
	// Get employee ID from context
	employeeID, exists := c.Get("employee_id")
	if !exists {
		employeeID, exists = c.Get("user_id")
		if !exists {
			errors.UnauthorizedResponse(c, "User not authenticated")
			return
		}
	}

	var req dto.ClockInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	record, err := h.attendanceUC.ClockIn(c.Request.Context(), employeeID.(string), &req)
	if err != nil {
		switch err {
		case usecase.ErrAlreadyCheckedIn:
			errors.ErrorResponse(c, "ALREADY_CHECKED_IN", map[string]interface{}{
				"message": "You have already checked in for today",
			}, nil)
		case usecase.ErrGPSRequired:
			errors.ErrorResponse(c, "GPS_REQUIRED", map[string]interface{}{
				"message": "GPS location is required for clock in",
			}, nil)
		case usecase.ErrOutsideGPSRadius:
			errors.ErrorResponse(c, "OUTSIDE_GPS_RADIUS", map[string]interface{}{
				"message": "You are outside the allowed GPS radius from the office",
			}, nil)
		case usecase.ErrNotWorkingDay:
			errors.ErrorResponse(c, "NOT_WORKING_DAY", map[string]interface{}{
				"message": "Today is not a working day",
			}, nil)
		case usecase.ErrHolidayNoCheckIn:
			errors.ErrorResponse(c, "HOLIDAY_NO_CHECK_IN", map[string]interface{}{
				"message": "Cannot check in on a holiday",
			}, nil)
		default:
			errors.InternalServerErrorResponse(c, err.Error())
		}
		return
	}

	response.SuccessResponseCreated(c, record, nil)
}

// ClockOut handles clock out request
func (h *AttendanceRecordHandler) ClockOut(c *gin.Context) {
	// Get employee ID from context
	employeeID, exists := c.Get("employee_id")
	if !exists {
		employeeID, exists = c.Get("user_id")
		if !exists {
			errors.UnauthorizedResponse(c, "User not authenticated")
			return
		}
	}

	var req dto.ClockOutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	record, err := h.attendanceUC.ClockOut(c.Request.Context(), employeeID.(string), &req)
	if err != nil {
		switch err {
		case usecase.ErrNotCheckedIn:
			errors.ErrorResponse(c, "NOT_CHECKED_IN", map[string]interface{}{
				"message": "You have not checked in today",
			}, nil)
		case usecase.ErrAlreadyCheckedOut:
			errors.ErrorResponse(c, "ALREADY_CHECKED_OUT", map[string]interface{}{
				"message": "You have already checked out for today",
			}, nil)
		default:
			errors.InternalServerErrorResponse(c, err.Error())
		}
		return
	}

	response.SuccessResponse(c, record, nil)
}

// CreateManualEntry handles manual attendance entry by admin
func (h *AttendanceRecordHandler) CreateManualEntry(c *gin.Context) {
	// Get admin user ID from context
	adminID, exists := c.Get("user_id")
	if !exists {
		errors.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	var req dto.ManualAttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	record, err := h.attendanceUC.CreateManualEntry(c.Request.Context(), &req, adminID.(string))
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponseCreated(c, record, nil)
}

// Update handles update attendance record request
func (h *AttendanceRecordHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateAttendanceRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	record, err := h.attendanceUC.Update(c.Request.Context(), id, &req)
	if err != nil {
		if err == usecase.ErrAttendanceNotFound {
			errors.ErrorResponse(c, "ATTENDANCE_NOT_FOUND", map[string]interface{}{
				"attendance_id": id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, record, nil)
}

// Delete handles delete attendance record request
func (h *AttendanceRecordHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	err := h.attendanceUC.Delete(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrAttendanceNotFound {
			errors.ErrorResponse(c, "ATTENDANCE_NOT_FOUND", map[string]interface{}{
				"attendance_id": id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, map[string]interface{}{
		"message": "Attendance record deleted successfully",
	}, nil)
}

// GetMonthlyStats handles get monthly attendance statistics request
func (h *AttendanceRecordHandler) GetMonthlyStats(c *gin.Context) {
	var req dto.MonthlyReportRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidQueryParamResponse(c)
		return
	}

	// If no employee ID provided, use current user
	if req.EmployeeID == "" {
		employeeID, exists := c.Get("employee_id")
		if !exists {
			employeeID, exists = c.Get("user_id")
			if !exists {
				errors.UnauthorizedResponse(c, "User not authenticated")
				return
			}
		}
		req.EmployeeID = employeeID.(string)
	}

	stats, err := h.attendanceUC.GetMonthlyStats(c.Request.Context(), &req)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, stats, nil)
}
