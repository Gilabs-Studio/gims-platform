package handler

import (
	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/general/domain/dto"
	"github.com/gilabs/gims/api/internal/general/domain/usecase"
	"github.com/gin-gonic/gin"
)

// DashboardHandler handles HTTP requests for the dashboard overview endpoint.
type DashboardHandler struct {
	uc usecase.DashboardUsecase
}

// NewDashboardHandler creates a new DashboardHandler
func NewDashboardHandler(uc usecase.DashboardUsecase) *DashboardHandler {
	return &DashboardHandler{uc: uc}
}

// GetOverview handles GET /general/dashboard/overview
func (h *DashboardHandler) GetOverview(c *gin.Context) {
	var req dto.DashboardRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		errors.InvalidQueryParamResponse(c)
		return
	}

	result, err := h.uc.GetOverview(c.Request.Context(), req)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, result, nil)
}

// GetLayout handles GET /general/dashboard/layout — fetches the current user's saved layout.
func (h *DashboardHandler) GetLayout(c *gin.Context) {
	userIDRaw, exists := c.Get("user_id")
	if !exists {
		errors.UnauthorizedResponse(c, "missing user context")
		return
	}
	userID, ok := userIDRaw.(string)
	if !ok || userID == "" {
		errors.UnauthorizedResponse(c, "invalid user context")
		return
	}

	dashboardType := c.DefaultQuery("type", "general")

	result, err := h.uc.GetLayout(c.Request.Context(), userID, dashboardType)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}
	if result == nil {
		// No saved layout yet — frontend should use the default
		errors.NotFoundResponse(c, "DASHBOARD_LAYOUT", userID)
		return
	}

	response.SuccessResponse(c, result, nil)
}

// SaveLayout handles PUT /general/dashboard/layout — persists the current user's layout.
func (h *DashboardHandler) SaveLayout(c *gin.Context) {
	userIDRaw, exists := c.Get("user_id")
	if !exists {
		errors.UnauthorizedResponse(c, "missing user context")
		return
	}
	userID, ok := userIDRaw.(string)
	if !ok || userID == "" {
		errors.UnauthorizedResponse(c, "invalid user context")
		return
	}

	var req dto.DashboardLayoutSaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.InvalidRequestBodyResponse(c)
		return
	}

	if err := h.uc.SaveLayout(c.Request.Context(), userID, req); err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, nil, nil)
}
