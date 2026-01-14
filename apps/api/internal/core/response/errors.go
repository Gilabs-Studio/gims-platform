package response

import "net/http"

// Standard Error Codes
const (
	ErrCodeValidationError    = "VALIDATION_ERROR"
	ErrCodeUnauthorized       = "UNAUTHORIZED"
	ErrCodeForbidden          = "FORBIDDEN"
	ErrCodeNotFound           = "NOT_FOUND"
	ErrCodeConflict           = "CONFLICT"
	ErrCodeInternalServerError = "INTERNAL_SERVER_ERROR"
	ErrCodeServiceUnavailable = "SERVICE_UNAVAILABLE"
	ErrCodeBadRequest         = "BAD_REQUEST"
	ErrCodeQueryTimeout       = "QUERY_TIMEOUT"
)

// ErrorInfo structure for error definition
type ErrorInfo struct {
	HTTPStatus int
	Message    string
	Code       string
}

// ErrorCodeMap maps internal error codes to HTTP status and messages
var ErrorCodeMap = map[string]ErrorInfo{
	ErrCodeValidationError: {
		HTTPStatus: http.StatusBadRequest,
		Message:    "Validation failed",
		Code:       ErrCodeValidationError,
	},
	ErrCodeUnauthorized: {
		HTTPStatus: http.StatusUnauthorized,
		Message:    "Unauthorized access",
		Code:       ErrCodeUnauthorized,
	},
	ErrCodeForbidden: {
		HTTPStatus: http.StatusForbidden,
		Message:    "Access forbidden",
		Code:       ErrCodeForbidden,
	},
	ErrCodeNotFound: {
		HTTPStatus: http.StatusNotFound,
		Message:    "Resource not found",
		Code:       ErrCodeNotFound,
	},
	ErrCodeConflict: {
		HTTPStatus: http.StatusConflict,
		Message:    "Resource conflict",
		Code:       ErrCodeConflict,
	},
	ErrCodeInternalServerError: {
		HTTPStatus: http.StatusInternalServerError,
		Message:    "Internal server error",
		Code:       ErrCodeInternalServerError,
	},
	ErrCodeServiceUnavailable: {
		HTTPStatus: http.StatusServiceUnavailable,
		Message:    "Service unavailable",
		Code:       ErrCodeServiceUnavailable,
	},
	ErrCodeQueryTimeout: {
		HTTPStatus: http.StatusGatewayTimeout,
		Message:    "Query timeout",
		Code:       ErrCodeQueryTimeout,
	},
}

// GetErrorInfo returns standard error info
func GetErrorInfo(code string) ErrorInfo {
	if info, ok := ErrorCodeMap[code]; ok {
		return info
	}
	return ErrorCodeMap[ErrCodeInternalServerError]
}
