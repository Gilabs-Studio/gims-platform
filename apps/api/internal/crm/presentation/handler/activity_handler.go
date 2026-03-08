package handler

import (
	"strconv"

	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/crm/data/repositories"
	"github.com/gilabs/gims/api/internal/crm/domain/dto"
	"github.com/gilabs/gims/api/internal/crm/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"gorm.io/gorm"
)

// ActivityHandler handles HTTP requests for CRM activities
type ActivityHandler struct {
	uc usecase.ActivityUsecase
	db *gorm.DB
}

// NewActivityHandler creates a new activity handler
func NewActivityHandler(uc usecase.ActivityUsecase, db *gorm.DB) *ActivityHandler {
	return &ActivityHandler{uc: uc, db: db}
}

// Create handles POST request to create an activity
func (h *ActivityHandler) Create(c *gin.Context) {
	var req dto.CreateActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	createdBy := ""
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(string); ok {
			createdBy = id
		}
	}

	// Use the explicitly provided employee_id if present; fall back to JWT user
	employeeID := createdBy
	if req.EmployeeID != nil && *req.EmployeeID != "" {
		employeeID = *req.EmployeeID
	}

	result, err := h.uc.Create(c.Request.Context(), req, employeeID)
	if err != nil {
		handleActivityError(c, err)
		return
	}

	meta := &response.Meta{}
	if createdBy != "" {
		meta.CreatedBy = createdBy
	}

	response.SuccessResponseCreated(c, result, meta)
}

// GetByID handles GET request to get an activity by ID
func (h *ActivityHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.ErrorResponse(c, "INVALID_ID", map[string]interface{}{
			"message": "ID is required",
		}, nil)
		return
	}

	result, err := h.uc.GetByID(c.Request.Context(), id)
	if err != nil {
		errors.ErrorResponse(c, "CRM_ACTIVITY_NOT_FOUND", map[string]interface{}{
			"activity_id": id,
		}, nil)
		return
	}

	response.SuccessResponse(c, result, nil)
}

// List handles GET request to list activities with filtering and pagination
func (h *ActivityHandler) List(c *gin.Context) {
	params := repositories.ActivityListParams{
		Search:         c.Query("search"),
		SortBy:         c.DefaultQuery("sort_by", "timestamp"),
		SortDir:        c.DefaultQuery("sort_dir", "desc"),
		Type:           c.Query("type"),
		ActivityTypeID: c.Query("activity_type_id"),
		CustomerID:     c.Query("customer_id"),
		ContactID:      c.Query("contact_id"),
		DealID:         c.Query("deal_id"),
		LeadID:         c.Query("lead_id"),
		EmployeeID:     c.Query("employee_id"),
		DateFrom:       c.Query("date_from"),
		DateTo:         c.Query("date_to"),
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage > 100 {
		perPage = 100
	}
	params.Limit = perPage
	params.Offset = (page - 1) * perPage

	results, total, err := h.uc.List(c.Request.Context(), params)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
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

	if params.Type != "" {
		meta.Filters["type"] = params.Type
	}
	if params.EmployeeID != "" {
		meta.Filters["employee_id"] = params.EmployeeID
	}
	if params.CustomerID != "" {
		meta.Filters["customer_id"] = params.CustomerID
	}

	response.SuccessResponse(c, results, meta)
}

// Timeline handles GET request to get activity timeline for an entity
func (h *ActivityHandler) Timeline(c *gin.Context) {
	params := repositories.ActivityListParams{
		SortBy:     "timestamp",
		SortDir:    "desc",
		CustomerID: c.Query("customer_id"),
		ContactID:  c.Query("contact_id"),
		DealID:     c.Query("deal_id"),
		LeadID:     c.Query("lead_id"),
		EmployeeID: c.Query("employee_id"),
		DateFrom:   c.Query("date_from"),
		DateTo:     c.Query("date_to"),
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "50"))
	if perPage > 100 {
		perPage = 100
	}
	params.Limit = perPage
	params.Offset = (page - 1) * perPage

	results, total, err := h.uc.Timeline(c.Request.Context(), params)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
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
	}

	response.SuccessResponse(c, results, meta)
}

// MyActivities handles GET request to list current user's activities
func (h *ActivityHandler) MyActivities(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		errors.ErrorResponse(c, "UNAUTHORIZED", map[string]interface{}{
			"message": "User not authenticated",
		}, nil)
		return
	}

	userIDStr, ok := userID.(string)
	if !ok || userIDStr == "" {
		errors.ErrorResponse(c, "UNAUTHORIZED", map[string]interface{}{
			"message": "Invalid user ID",
		}, nil)
		return
	}

	// Resolve employee_id from user_id
	var employeeID string
	if err := h.db.WithContext(c.Request.Context()).
		Table("employees").
		Select("id").
		Where("user_id = ? AND deleted_at IS NULL", userIDStr).
		Row().Scan(&employeeID); err != nil {
		errors.ErrorResponse(c, "CRM_ACTIVITY_NOT_FOUND", map[string]interface{}{
			"message": "No employee profile linked to current user",
		}, nil)
		return
	}

	params := repositories.ActivityListParams{
		SortBy:         "timestamp",
		SortDir:        "desc",
		EmployeeID:     employeeID,
		ActivityTypeID: c.Query("activity_type_id"),
		DateFrom:       c.Query("date_from"),
		DateTo:         c.Query("date_to"),
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage > 100 {
		perPage = 100
	}
	params.Limit = perPage
	params.Offset = (page - 1) * perPage

	results, total, err := h.uc.List(c.Request.Context(), params)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
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
	}

	response.SuccessResponse(c, results, meta)
}

// handleActivityError maps business errors to appropriate HTTP responses
func handleActivityError(c *gin.Context, err error) {
	switch err.Error() {
	case "activity not found":
		errors.ErrorResponse(c, "CRM_ACTIVITY_NOT_FOUND", map[string]interface{}{
			"message": err.Error(),
		}, nil)
	case "activity type not found":
		errors.ErrorResponse(c, "CRM_ACTIVITY_TYPE_NOT_FOUND", map[string]interface{}{
			"message": err.Error(),
		}, nil)
	case "invalid timestamp format, use ISO 8601":
		errors.ErrorResponse(c, "INVALID_FORMAT", map[string]interface{}{
			"message": err.Error(),
			"field":   "timestamp",
		}, nil)
	default:
		errors.InternalServerErrorResponse(c, err.Error())
	}
}
