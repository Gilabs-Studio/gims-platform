// API Response Standards - Go Implementation Example
// GiPos SaaS Platform
//
// This file contains example implementation of API response standards
// for the Go backend using Gin framework
//
// NOTE: This is an example file for documentation purposes.
// For actual implementation, you need to:
// 1. Install dependencies: go get github.com/gin-gonic/gin
// 2. Implement missing helper functions
// 3. Add proper error handling

package api

import (
	"net/http"
	"strconv"
	"time"
)

// Timezone WIB (UTC+7)
var timezoneWIB = time.FixedZone("WIB", 7*60*60)


// APIResponse represents the standard API response structure
type APIResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Error     *APIError   `json:"error,omitempty"`
	Meta      *Meta       `json:"meta,omitempty"`
	Timestamp string      `json:"timestamp"`
	RequestID string      `json:"request_id"`
}

// APIError represents error information
type APIError struct {
	Code        string                 `json:"code"`
	Message     string                 `json:"message"`
	Details     map[string]interface{} `json:"details,omitempty"`
	FieldErrors []FieldError           `json:"field_errors,omitempty"`
	StackTrace  string                 `json:"stack_trace,omitempty"` // Only in dev/staging
}

// FieldError represents validation error for a specific field
type FieldError struct {
	Field      string                 `json:"field"`
	Code       string                 `json:"code"`
	Message    string                 `json:"message"`
	Constraint map[string]interface{} `json:"constraint,omitempty"`
}

// Meta represents metadata in response
type Meta struct {
	Pagination *PaginationMeta          `json:"pagination,omitempty"`
	Filters    map[string]interface{}   `json:"filters,omitempty"`
	Sort       *SortMeta                `json:"sort,omitempty"`
	TenantID   string                   `json:"tenant_id,omitempty"`
	OutletID   string                   `json:"outlet_id,omitempty"`
	CreatedBy  string                   `json:"created_by,omitempty"`
	UpdatedBy  string                   `json:"updated_by,omitempty"`
	DeletedBy  string                   `json:"deleted_by,omitempty"`
	Changes    map[string]ChangeValue   `json:"changes,omitempty"`
	Additional map[string]interface{}   `json:"additional,omitempty"`
}

// ChangeValue represents old and new value for audit
type ChangeValue struct {
	Old interface{} `json:"old"`
	New interface{} `json:"new"`
}

// PaginationMeta represents pagination information
type PaginationMeta struct {
	Page       int  `json:"page"`
	PerPage    int  `json:"per_page"`
	Total      int  `json:"total"`
	TotalPages int  `json:"total_pages"`
	HasNext    bool `json:"has_next"`
	HasPrev    bool `json:"has_prev"`
	NextPage   *int `json:"next_page,omitempty"`
	PrevPage   *int `json:"prev_page,omitempty"`
}

// SortMeta represents sorting information
type SortMeta struct {
	Field string `json:"field"`
	Order string `json:"order"` // "asc" or "desc"
}

// ErrorInfo contains HTTP status and default message for error codes
type ErrorInfo struct {
	HTTPStatus int
	Message    string
}

// ErrorCodeMap maps error codes to their HTTP status and messages
var ErrorCodeMap = map[string]ErrorInfo{
	// Validation Errors
	"VALIDATION_ERROR": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid request data",
	},
	"REQUIRED": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Field is required",
	},
	"INVALID_TYPE": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid data type",
	},
	"INVALID_FORMAT": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid format",
	},
	"MIN_VALUE": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Value is less than minimum",
	},
	"MAX_VALUE": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Value exceeds maximum",
	},

	// Authentication & Authorization
	"UNAUTHORIZED": {
		HTTPStatus: http.StatusUnauthorized,
		Message:    "Authentication token is invalid or expired",
	},
	"FORBIDDEN": {
		HTTPStatus: http.StatusForbidden,
		Message:    "You do not have permission to access this resource",
	},

	// Resource Errors
	"NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "Resource not found",
	},
	"CONFLICT": {
		HTTPStatus: http.StatusConflict,
		Message:    "Conflict with current state",
	},

	// Business Logic Errors
	"INSUFFICIENT_STOCK": {
		HTTPStatus: http.StatusUnprocessableEntity,
		Message:    "Insufficient product stock",
	},
	"SHIFT_NOT_OPEN": {
		HTTPStatus: http.StatusUnprocessableEntity,
		Message:    "Shift is not open. Please open shift first",
	},
	"PAYMENT_FAILED": {
		HTTPStatus: http.StatusUnprocessableEntity,
		Message:    "Payment failed",
	},

	// System Errors
	"INTERNAL_SERVER_ERROR": {
		HTTPStatus: http.StatusInternalServerError,
		Message:    "An internal server error occurred. Our team has been notified",
	},
	"RATE_LIMIT_EXCEEDED": {
		HTTPStatus: http.StatusTooManyRequests,
		Message:    "Too many requests. Please try again later",
	},
	"SERVICE_UNAVAILABLE": {
		HTTPStatus: http.StatusServiceUnavailable,
		Message:    "Service is under maintenance. Please try again later",
	},
}

// Helper Functions

// Context interface for abstraction (to avoid direct gin dependency in examples)
type Context interface {
	Get(key string) (interface{}, bool)
	Set(key string, value interface{})
	GetHeader(key string) string
	Query(key string) string
	Param(key string) string
	ShouldBindJSON(obj interface{}) error
	JSON(code int, obj interface{})
	Status(code int)
	Header(key, value string)
}


// getRequestID extracts request ID from context or generates new one
func getRequestID(c Context) string {
	if requestID, exists := c.Get("request_id"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	// Generate new request ID if not exists
	return generateRequestID()
}

// generateRequestID generates a unique request ID
func generateRequestID() string {
	// Implementation: use UUID or nanoid
	// Example: return uuid.New().String()
	return "req_" + time.Now().Format("20060102150405") + "_" + randomString(8)
}

// randomString generates random string (implement as needed)
func randomString(length int) string {
	// Implementation: use crypto/rand or similar
	return "abc123"
}

// SuccessResponse creates a success response
func SuccessResponse(c Context, data interface{}, meta *Meta) {
	response := &APIResponse{
		Success:   true,
		Data:      data,
		Meta:      meta,
		Timestamp: time.Now().In(timezoneWIB).Format(time.RFC3339),
		RequestID: getRequestID(c),
	}

	c.JSON(http.StatusOK, response)
}

// SuccessResponseCreated creates a success response for created resource
func SuccessResponseCreated(c Context, data interface{}, meta *Meta) {
	response := &APIResponse{
		Success:   true,
		Data:      data,
		Meta:      meta,
		Timestamp: time.Now().In(timezoneWIB).Format(time.RFC3339),
		RequestID: getRequestID(c),
	}

	c.JSON(http.StatusCreated, response)
}

// SuccessResponseNoContent creates a success response with no content
func SuccessResponseNoContent(c Context) {
	c.Status(http.StatusNoContent)
}

// ErrorResponse creates an error response
func ErrorResponse(c Context, code string, details map[string]interface{}, fieldErrors []FieldError) {
	errorInfo, exists := ErrorCodeMap[code]
	if !exists {
		errorInfo = ErrorCodeMap["INTERNAL_SERVER_ERROR"]
		code = "INTERNAL_SERVER_ERROR"
	}

	apiError := &APIError{
		Code:        code,
		Message:     errorInfo.Message,
		Details:     details,
		FieldErrors: fieldErrors,
	}

	// Add stack trace in development (if available)
	// if isDebugMode() {
	//     apiError.StackTrace = getStackTrace()
	// }

	response := &APIResponse{
		Success:   false,
		Error:     apiError,
		Timestamp: time.Now().In(timezoneWIB).Format(time.RFC3339),
		RequestID: getRequestID(c),
	}

	// Add meta if available (tenant_id, outlet_id, etc.)
	if meta := getMetaFromContext(c); meta != nil {
		response.Meta = meta
	}

	c.JSON(errorInfo.HTTPStatus, response)
}

// ValidationErrorResponse creates a validation error response
func ValidationErrorResponse(c Context, fieldErrors []FieldError) {
	ErrorResponse(c, "VALIDATION_ERROR", nil, fieldErrors)
}

// NotFoundResponse creates a not found error response
func NotFoundResponse(c Context, resource string, resourceID string) {
	details := map[string]interface{}{
		"resource":    resource,
		"resource_id": resourceID,
	}
	ErrorResponse(c, "NOT_FOUND", details, nil)
}

// UnauthorizedResponse creates an unauthorized error response
func UnauthorizedResponse(c Context, reason string) {
	details := map[string]interface{}{}
	if reason != "" {
		details["reason"] = reason
	}
	ErrorResponse(c, "UNAUTHORIZED", details, nil)
}

// ForbiddenResponse creates a forbidden error response
func ForbiddenResponse(c Context, requiredPermission string, userPermissions []string) {
	details := map[string]interface{}{
		"required_permission": requiredPermission,
		"user_permissions":   userPermissions,
	}
	ErrorResponse(c, "FORBIDDEN", details, nil)
}

// ConflictResponse creates a conflict error response
func ConflictResponse(c Context, message string, details map[string]interface{}) {
	if details == nil {
		details = make(map[string]interface{})
	}
	ErrorResponse(c, "CONFLICT", details, nil)
}

// InternalServerErrorResponse creates an internal server error response
func InternalServerErrorResponse(c Context, errorID string) {
	details := map[string]interface{}{
		"error_id": errorID,
	}
	ErrorResponse(c, "INTERNAL_SERVER_ERROR", details, nil)
}

// RateLimitResponse creates a rate limit error response
func RateLimitResponse(c Context, limit int, remaining int, resetAt time.Time) {
	details := map[string]interface{}{
		"limit":     limit,
		"remaining": remaining,
		"reset_at":  resetAt.In(timezoneWIB).Format(time.RFC3339),
	}
	ErrorResponse(c, "RATE_LIMIT_EXCEEDED", details, nil)
}

// getMetaFromContext extracts meta information from context
func getMetaFromContext(c Context) *Meta {
	meta := &Meta{}

	if tenantID, exists := c.Get("tenant_id"); exists {
		if id, ok := tenantID.(string); ok {
			meta.TenantID = id
		}
	}

	if outletID, exists := c.Get("outlet_id"); exists {
		if id, ok := outletID.(string); ok {
			meta.OutletID = id
		}
	}

	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(string); ok {
			meta.CreatedBy = id
		}
	}

	return meta
}

// Pagination Helpers

// NewPaginationMeta creates pagination metadata
func NewPaginationMeta(page, perPage, total int) *PaginationMeta {
	totalPages := (total + perPage - 1) / perPage
	hasNext := page < totalPages
	hasPrev := page > 1

	var nextPage *int
	var prevPage *int

	if hasNext {
		next := page + 1
		nextPage = &next
	}

	if hasPrev {
		prev := page - 1
		prevPage = &prev
	}

	return &PaginationMeta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    hasNext,
		HasPrev:    hasPrev,
		NextPage:   nextPage,
		PrevPage:   prevPage,
	}
}

// ParsePaginationParams parses pagination parameters from request
func ParsePaginationParams(c Context) (page, perPage int) {
	page = 1
	perPage = 20

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := parseInt(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if perPageStr := c.Query("per_page"); perPageStr != "" {
		if pp, err := parseInt(perPageStr); err == nil && pp > 0 && pp <= 100 {
			perPage = pp
		}
	}

	return page, perPage
}

// parseInt parses string to int with error handling
func parseInt(s string) (int, error) {
	return strconv.Atoi(s)
}

// Date/Time Helpers

// FormatDateTime formats time to WIB timezone string
func FormatDateTime(t time.Time) string {
	return t.In(timezoneWIB).Format(time.RFC3339)
}

// FormatDate formats time to date only string
func FormatDate(t time.Time) string {
	return t.In(timezoneWIB).Format("2006-01-02")
}

// FormatTime formats time to time only string
func FormatTime(t time.Time) string {
	return t.In(timezoneWIB).Format("15:04:05")
}

// ParseDateTime parses datetime string to time (assumes WIB if no timezone)
func ParseDateTime(s string) (time.Time, error) {
	// Try RFC3339 first
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}

	// Try without timezone (assume WIB)
	if t, err := time.ParseInLocation("2006-01-02T15:04:05", s, timezoneWIB); err == nil {
		return t, nil
	}

	// Try date only
	if t, err := time.ParseInLocation("2006-01-02", s, timezoneWIB); err == nil {
		return t, nil
	}

	return time.Time{}, nil // Return error
}

// Currency Helpers

// FormatCurrency formats integer (sen) to formatted currency string
func FormatCurrency(amount int64) string {
	// Convert to Rupiah (divide by 100 if stored in sen)
	rupiah := float64(amount) / 100.0

	// Format with thousand separator
	// Implementation: use number formatting library
	return "Rp " + formatNumber(rupiah)
}

// formatNumber formats number with thousand separator
func formatNumber(n float64) string {
	// Implementation: format with dot as thousand separator
	// Example: 50000 -> "50.000"
	return ""
}

// Middleware Example
// Note: These are example middleware functions. In actual implementation with Gin,
// you would use gin.HandlerFunc return type.


// RequestIDMiddleware adds request ID to context
// Example usage with Gin:
// func RequestIDMiddleware() gin.HandlerFunc {
//     return func(c *gin.Context) {
//         requestID := c.GetHeader("X-Request-ID")
//         if requestID == "" {
//             requestID = generateRequestID()
//         }
//         c.Set("request_id", requestID)
//         c.Header("X-Request-ID", requestID)
//         c.Next()
//     }
// }

// MetaMiddleware extracts tenant/outlet/user info and adds to context
// Example usage with Gin:
// func MetaMiddleware() gin.HandlerFunc {
//     return func(c *gin.Context) {
//         // Extract from JWT token or headers
//         // tenantID := extractTenantID(c)
//         // outletID := extractOutletID(c)
//         // userID := extractUserID(c)
//         // c.Set("tenant_id", tenantID)
//         // c.Set("outlet_id", outletID)
//         // c.Set("user_id", userID)
//         c.Next()
//     }
// }

// Usage Example in Handler
// Note: These are example handler functions showing how to use the API response helpers.
// In actual implementation, you would use gin.Context directly.

// Example: Get Product Handler
// func GetProduct(c *gin.Context) {
//     productID := c.Param("id")
//
//     // Business logic to get product
//     product, err := productService.GetByID(productID)
//     if err != nil {
//         NotFoundResponse(c, "product", productID)
//         return
//     }
//
//     // Create meta
//     meta := getMetaFromContext(c)
//     // meta.OutletID = "outlet_456" // if applicable
//
//     // Return success response
//     SuccessResponse(c, product, meta)
// }

// Example: Create Product Handler
// func CreateProduct(c *gin.Context) {
//     var req CreateProductRequest
//     if err := c.ShouldBindJSON(&req); err != nil {
//         // Parse validation errors
//         fieldErrors := parseValidationErrors(err)
//         ValidationErrorResponse(c, fieldErrors)
//         return
//     }
//
//     // Business logic to create product
//     product, err := productService.Create(req)
//     if err != nil {
//         ErrorResponse(c, err.Code, err.Details, nil)
//         return
//     }
//
//     // Create meta with created_by
//     meta := getMetaFromContext(c)
//     // meta.CreatedBy = userID
//
//     SuccessResponseCreated(c, product, meta)
// }

// Example: List Products Handler
// func ListProducts(c *gin.Context) {
//     // Parse pagination
//     page, perPage := ParsePaginationParams(c)
//
//     // Parse filters
//     filters := parseFilters(c)
//
//     // Business logic to get products
//     products, total, err := productService.List(page, perPage, filters)
//     if err != nil {
//         InternalServerErrorResponse(c, errorID)
//         return
//     }
//
//     // Create meta with pagination
//     meta := getMetaFromContext(c)
//     meta.Pagination = NewPaginationMeta(page, perPage, total)
//     meta.Filters = filters
//
//     SuccessResponse(c, products, meta)
// }

// parseValidationErrors converts validation errors to FieldError slice
// Example implementation:
// func parseValidationErrors(c Context, err error) []FieldError {
//     var fieldErrors []FieldError
//
//     // Parse gin validation errors
//     if validationErrors, ok := err.(validator.ValidationErrors); ok {
//         for _, fieldError := range validationErrors {
//             errorInfo := getFieldErrorInfo(fieldError.Tag())
//             fieldErr := FieldError{
//                 Field:     fieldError.Field(),
//                 Code:      fieldError.Tag(),
//                 Message:   errorInfo.Message,
//             }
//             fieldErrors = append(fieldErrors, fieldErr)
//         }
//     }
//
//     return fieldErrors
// }

// parseFilters extracts filter parameters from request
func parseFilters(c Context) map[string]interface{} {
	filters := make(map[string]interface{})

	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}

	if categoryID := c.Query("category_id"); categoryID != "" {
		filters["category_id"] = categoryID
	}

	// Add more filters as needed

	return filters
}

// Example Request/Response Types

type CreateProductRequest struct {
	Name        string   `json:"name" binding:"required,min=3,max=200"`
	SKU         string   `json:"sku" binding:"required"`
	Barcode     string   `json:"barcode"`
	Price       int64    `json:"price" binding:"required,min=1"`
	Cost        int64    `json:"cost"`
	CategoryID  string   `json:"category_id" binding:"required"`
	Description string   `json:"description"`
	Taxable     bool     `json:"taxable"`
	Images      []string `json:"images"`
}

type ProductResponse struct {
	ID          string             `json:"id"`
	Name        string             `json:"name"`
	SKU         string             `json:"sku"`
	Barcode     string             `json:"barcode"`
	Price       int64              `json:"price"`
	Cost        int64              `json:"cost"`
	Stock       int                `json:"stock"`
	Category    CategoryReference  `json:"category"`
	Images      []ImageResponse    `json:"images"`
	Status      string             `json:"status"`
	Taxable     bool               `json:"taxable"`
	CreatedAt   string             `json:"created_at"`
	UpdatedAt   string             `json:"updated_at"`
}

type CategoryReference struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ImageResponse struct {
	ID           string `json:"id"`
	URL          string `json:"url"`
	ThumbnailURL string `json:"thumbnail_url"`
	Order        int    `json:"order"`
}

