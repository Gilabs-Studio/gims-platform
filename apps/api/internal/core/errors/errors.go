package errors

import (
	"net/http"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"gorm.io/gorm"
)

const (
	ErrorCodeInvalidRequestBody = "INVALID_REQUEST_BODY"
)

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
	"INVALID_EMAIL": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid email format",
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
	"INVALID_CREDENTIALS": {
		HTTPStatus: http.StatusUnauthorized,
		Message:    "Invalid email or password",
	},
	"TOKEN_EXPIRED": {
		HTTPStatus: http.StatusUnauthorized,
		Message:    "Token has expired",
	},
	"TOKEN_INVALID": {
		HTTPStatus: http.StatusUnauthorized,
		Message:    "Invalid token",
	},
	"TOKEN_MISSING": {
		HTTPStatus: http.StatusUnauthorized,
		Message:    "Token not found in header",
	},
	"ACCOUNT_DISABLED": {
		HTTPStatus: http.StatusUnauthorized,
		Message:    "Account is disabled",
	},
	"USER_NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "User not found",
	},
	"REFRESH_TOKEN_INVALID": {
		HTTPStatus: http.StatusUnauthorized,
		Message:    "Invalid refresh token",
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
	"PRODUCT_NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "Product not found",
	},
	"CATEGORY_NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "Category not found",
	},
	"LEAD_NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "Lead not found",
	},
	"STAGE_NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "Pipeline stage not found",
	},
	"LEAVE_REQUEST_NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "Leave request not found",
	},
	"EMPLOYEE_NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "Employee not found",
	},

	// HRD - Evaluation Errors (Sprint 15)
	"EVALUATION_GROUP_NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "Evaluation group not found",
	},
	"EVALUATION_CRITERIA_NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "Evaluation criteria not found",
	},
	"EMPLOYEE_EVALUATION_NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "Employee evaluation not found",
	},
	"EVALUATION_GROUP_INACTIVE": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Evaluation group is not active",
	},
	"INVALID_STATUS_TRANSITION": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid status transition",
	},
	// HRD - Recruitment Errors (Sprint 15)
	"RECRUITMENT_REQUEST_NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "Recruitment request not found",
	},
	"RECRUITMENT_NOT_EDITABLE": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Recruitment request is not editable (only DRAFT status)",
	},
	"RECRUITMENT_NOT_OPEN": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Recruitment request is not open for updates",
	},
	"INVALID_SALARY_RANGE": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Salary range minimum must not exceed maximum",
	},
	"FILLED_EXCEEDS_REQUIRED": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Filled count cannot exceed required count",
	},
	"DIVISION_NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "Division not found",
	},
	"POSITION_NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "Job position not found",
	},
	"CONFLICT": {
		HTTPStatus: http.StatusConflict,
		Message:    "Conflict with current state",
	},
	"LEAD_ALREADY_CONVERTED": {
		HTTPStatus: http.StatusConflict,
		Message:    "Lead already converted",
	},
	"LEAD_CANNOT_CONVERT": {
		HTTPStatus: http.StatusUnprocessableEntity,
		Message:    "Lead cannot convert. Lead status must be 'qualified'",
	},
	"CRM_LEAD_INVALID_STATUS": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid lead status",
	},
	"INVALID_LEAD_STATUS": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid lead status",
	},
	"INVALID_LEAD_SOURCE": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid lead source",
	},
	"ACCOUNT_CREATION_FAILED": {
		HTTPStatus: http.StatusUnprocessableEntity,
		Message:    "Failed to create account",
	},
	"CONTACT_CREATION_FAILED": {
		HTTPStatus: http.StatusUnprocessableEntity,
		Message:    "Failed to create contact",
	},
	"OPPORTUNITY_CREATION_FAILED": {
		HTTPStatus: http.StatusUnprocessableEntity,
		Message:    "Failed to create opportunity",
	},

	// CRM - Deal Conversion Errors
	"DEAL_NOT_FOUND": {
		HTTPStatus: http.StatusNotFound,
		Message:    "Deal not found",
	},
	"DEAL_NOT_WON": {
		HTTPStatus: http.StatusUnprocessableEntity,
		Message:    "Deal must be won before converting to quotation",
	},
	"DEAL_ALREADY_CONVERTED": {
		HTTPStatus: http.StatusConflict,
		Message:    "Deal has already been converted to a quotation",
	},
	"DEAL_NO_ITEMS": {
		HTTPStatus: http.StatusUnprocessableEntity,
		Message:    "Deal must have product items before converting to quotation",
	},
	"DEAL_CUSTOMER_REQUIRED": {
		HTTPStatus: http.StatusUnprocessableEntity,
		Message:    "Deal must have a customer before converting to quotation",
	},
	"DEAL_INVALID_STAGE": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid pipeline stage",
	},
	"DEAL_ALREADY_CLOSED": {
		HTTPStatus: http.StatusUnprocessableEntity,
		Message:    "Deal is already closed",
	},
	"DEAL_CLOSE_REASON_REQUIRED": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Close reason is required for lost deals",
	},

	// HRD - Leave Request Errors
	"INSUFFICIENT_LEAVE_BALANCE": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Insufficient leave balance for this request",
	},
	"OVERLAPPING_LEAVE_REQUEST": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Leave request overlaps with existing request",
	},
	"INVALID_DATE_FORMAT": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid date format. Use YYYY-MM-DD",
	},
	"INVALID_STATUS": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid leave request status for this operation",
	},
	"INVALID_DURATION": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid leave duration type",
	},

	// System Errors
	"NOT_IMPLEMENTED": {
		HTTPStatus: http.StatusNotImplemented,
		Message:    "This feature is not implemented yet",
	},
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
	"INVALID_REQUEST_BODY": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid request body",
	},
	"INVALID_PATH_PARAM": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid path parameter",
	},
	"INVALID_ID": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid ID",
	},
	"INVALID_QUERY_PARAM": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid query parameter",
	},
	"REQUEST_BODY_TOO_LARGE": {
		HTTPStatus: http.StatusRequestEntityTooLarge,
		Message:    "Request body too large",
	},

	// File Upload Errors
	"INVALID_FILE_TYPE": {
		HTTPStatus: http.StatusUnsupportedMediaType,
		Message:    "File type not allowed. Accepted formats: JPEG, PNG, GIF, WebP",
	},
	"FILE_TOO_LARGE": {
		HTTPStatus: http.StatusRequestEntityTooLarge,
		Message:    "File size exceeds the maximum allowed limit",
	},
	"INVALID_IMAGE": {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Invalid or corrupted image file",
	},

	// AI Service Errors
	"AI_ANALYSIS_FAILED": {
		HTTPStatus: http.StatusInternalServerError,
		Message:    "Failed to analyze visit report with AI",
	},
	"AI_CHAT_FAILED": {
		HTTPStatus: http.StatusInternalServerError,
		Message:    "Failed to get AI chat response",
	},
	"AI_SERVICE_NOT_CONFIGURED": {
		HTTPStatus: http.StatusServiceUnavailable,
		Message:    "AI service is not configured. Please configure Cerebras API key",
	},

	// Warehouse Business Rules
	"WAREHOUSE_HAS_STOCK": {
		HTTPStatus: http.StatusUnprocessableEntity,
		Message:    "Warehouse cannot be deleted because it still has active stock. Transfer all inventory to another warehouse first.",
	},
}

// ErrorResponse creates an error response
func ErrorResponse(c *gin.Context, code string, details map[string]interface{}, fieldErrors []response.FieldError) {
	errorInfo, exists := ErrorCodeMap[code]
	if !exists {
		errorInfo = ErrorCodeMap["INTERNAL_SERVER_ERROR"]
		code = "INTERNAL_SERVER_ERROR"
	}

	apiError := &response.APIError{
		Code:        code,
		Message:     errorInfo.Message,
		Details:     details,
		FieldErrors: fieldErrors,
	}

	apiResponse := &response.APIResponse{
		Success:   false,
		Error:     apiError,
		Timestamp: apptime.Now().Format(time.RFC3339),
		RequestID: getRequestID(c),
	}

	c.JSON(errorInfo.HTTPStatus, apiResponse)
}

// ValidationErrorResponse creates a validation error response
func ValidationErrorResponse(c *gin.Context, fieldErrors []response.FieldError) {
	ErrorResponse(c, "VALIDATION_ERROR", nil, fieldErrors)
}

// NotFoundResponse creates a not found error response
func NotFoundResponse(c *gin.Context, resource string, resourceID string) {
	details := map[string]interface{}{
		"resource":    resource,
		"resource_id": resourceID,
	}
	ErrorResponse(c, "NOT_FOUND", details, nil)
}

// UnauthorizedResponse creates an unauthorized error response
func UnauthorizedResponse(c *gin.Context, reason string) {
	details := map[string]interface{}{}
	if reason != "" {
		details["reason"] = reason
	}
	ErrorResponse(c, "UNAUTHORIZED", details, nil)
}

// ForbiddenResponse creates a forbidden error response
func ForbiddenResponse(c *gin.Context, requiredPermission string, userPermissions []string) {
	details := map[string]interface{}{
		"required_permission": requiredPermission,
		"user_permissions":    userPermissions,
	}
	ErrorResponse(c, "FORBIDDEN", details, nil)
}

// InternalServerErrorResponse creates an internal server error response
func InternalServerErrorResponse(c *gin.Context, errorID string) {
	details := map[string]interface{}{
		"error_id": errorID,
	}
	ErrorResponse(c, "INTERNAL_SERVER_ERROR", details, nil)
}

// HandleValidationError converts validator errors to FieldError slice
func HandleValidationError(c *gin.Context, err error) {
	var fieldErrors []response.FieldError

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, fieldError := range validationErrors {
			errorInfo := getFieldErrorInfo(fieldError.Tag())

			// Get JSON tag name from struct field
			jsonFieldName := getJSONFieldName(fieldError)

			fieldErr := response.FieldError{
				Field:   jsonFieldName,
				Code:    fieldError.Tag(),
				Message: errorInfo.Message,
			}
			fieldErrors = append(fieldErrors, fieldErr)
		}
	}

	ValidationErrorResponse(c, fieldErrors)
}

// getJSONFieldName extracts JSON tag name from validator field error
func getJSONFieldName(fieldError validator.FieldError) string {
	// Get struct namespace (e.g., "CreateLeadRequest.LeadSource")
	namespace := fieldError.StructNamespace()

	// Split namespace to get struct name and field path
	parts := strings.Split(namespace, ".")
	if len(parts) < 2 {
		// Fallback: convert struct field name to snake_case
		return toSnakeCase(fieldError.StructField())
	}

	// Get the struct type from the first part
	structTypeName := parts[0]
	fieldPath := parts[1:]

	// Try to get JSON tag using reflection
	jsonName := getJSONTagFromStructType(structTypeName, fieldPath)
	if jsonName != "" {
		return jsonName
	}

	// Fallback: convert struct field name to snake_case
	return toSnakeCase(fieldError.StructField())
}

// getJSONTagFromStructType uses reflection to get JSON tag from struct
func getJSONTagFromStructType(structTypeName string, fieldPath []string) string {
	// For CreateLeadRequest and UpdateLeadRequest
	if structTypeName == "CreateLeadRequest" || structTypeName == "UpdateLeadRequest" {
		if len(fieldPath) > 0 {
			return getJSONTagFromLeadRequest(structTypeName, fieldPath[0])
		}
	}

	// Add more struct types as needed
	// For now, return empty to fallback to snake_case conversion
	return ""
}

// getJSONTagFromLeadRequest returns JSON tag name for lead request fields
func getJSONTagFromLeadRequest(structTypeName, fieldName string) string {
	// Map of struct field names to JSON tag names for lead requests
	fieldMap := map[string]string{
		"FirstName":   "first_name",
		"LastName":    "last_name",
		"CompanyName": "company_name",
		"Email":       "email",
		"Phone":       "phone",
		"JobTitle":    "job_title",
		"Industry":    "industry",
		"LeadSource":  "lead_source",
		"LeadStatus":  "lead_status",
		"LeadScore":   "lead_score",
		"AssignedTo":  "assigned_to",
		"Notes":       "notes",
		"Address":     "address",
		"City":        "city",
		"Province":    "province",
		"PostalCode":  "postal_code",
		"Country":     "country",
		"Website":     "website",
	}

	if jsonName, exists := fieldMap[fieldName]; exists {
		return jsonName
	}

	// Fallback to snake_case conversion
	return toSnakeCase(fieldName)
}

// toSnakeCase converts PascalCase to snake_case
func toSnakeCase(str string) string {
	if str == "" {
		return str
	}

	var result strings.Builder
	for i, r := range str {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result.WriteByte('_')
		}
		result.WriteRune(r)
	}
	return strings.ToLower(result.String())
}

// HandleDatabaseError converts database errors to appropriate API errors
func HandleDatabaseError(c *gin.Context, err error) {
	if err == gorm.ErrRecordNotFound {
		NotFoundResponse(c, "resource", "")
		return
	}
	InternalServerErrorResponse(c, "")
}

// getFieldErrorInfo returns error info for validation tag
func getFieldErrorInfo(tag string) ErrorInfo {
	switch tag {
	case "required":
		return ErrorCodeMap["REQUIRED"]
	case "email":
		return ErrorCodeMap["INVALID_EMAIL"]
	case "min", "gte":
		return ErrorCodeMap["MIN_VALUE"]
	case "max", "lte":
		return ErrorCodeMap["MAX_VALUE"]
	default:
		return ErrorCodeMap["INVALID_FORMAT"]
	}
}

// getRequestID extracts request ID from context
func getRequestID(c *gin.Context) string {
	if requestID, exists := c.Get("request_id"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	return "req_" + apptime.Now().Format("20060102150405")
}

// InvalidRequestBodyResponse creates an invalid request body error response
func InvalidRequestBodyResponse(c *gin.Context) {
	ErrorResponse(c, "INVALID_REQUEST_BODY", nil, nil)
}

// InvalidQueryParamResponse creates an invalid query parameter error response
func InvalidQueryParamResponse(c *gin.Context) {
	ErrorResponse(c, "INVALID_QUERY_PARAM", nil, nil)
}
