package handler

import (
	"errors"

	coreErrors "github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/gilabs/gims/api/internal/pos/domain/usecase"
	"github.com/gin-gonic/gin"
)

// XenditConfigHandler handles Xendit gateway configuration per company
type XenditConfigHandler struct {
	uc usecase.XenditConfigUsecase
}

// NewXenditConfigHandler creates the handler
func NewXenditConfigHandler(uc usecase.XenditConfigUsecase) *XenditConfigHandler {
	return &XenditConfigHandler{uc: uc}
}

// Get returns the Xendit config for the authenticated user's company (requires pos.payment.manage)
func (h *XenditConfigHandler) Get(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	cfg, err := h.uc.Get(c.Request.Context(), uc.companyID)
	if err != nil {
		if errors.Is(err, usecase.ErrXenditConfigNotFound) {
			coreErrors.NotFoundResponse(c, "xendit_config", "")
			return
		}
		coreErrors.InternalServerErrorResponse(c, "")
		return
	}
	response.SuccessResponse(c, cfg, nil)
}

// GetStatus is a lightweight endpoint for cashiers to check if digital payment is available.
// Requires only pos.order.create permission (cashier-level).
func (h *XenditConfigHandler) GetStatus(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	status, err := h.uc.GetConnectionStatus(c.Request.Context(), uc.companyID)
	if err != nil {
		coreErrors.InternalServerErrorResponse(c, "")
		return
	}
	response.SuccessResponse(c, status, nil)
}

// Connect saves Xendit credentials and sets the account as connected (requires pos.payment.manage)
func (h *XenditConfigHandler) Connect(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	var req dto.ConnectXenditRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		coreErrors.HandleValidationError(c, err)
		return
	}

	cfg, err := h.uc.Connect(c.Request.Context(), uc.companyID, &req, uc.userID)
	if err != nil {
		coreErrors.InternalServerErrorResponse(c, "")
		return
	}
	response.SuccessResponse(c, cfg, nil)
}

// Update patches non-credential Xendit settings (requires pos.payment.manage)
func (h *XenditConfigHandler) Update(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	var req dto.UpdateXenditConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		coreErrors.HandleValidationError(c, err)
		return
	}

	cfg, err := h.uc.Update(c.Request.Context(), uc.companyID, &req, uc.userID)
	if err != nil {
		if errors.Is(err, usecase.ErrXenditConfigNotFound) {
			coreErrors.NotFoundResponse(c, "xendit_config", "")
			return
		}
		coreErrors.InternalServerErrorResponse(c, "")
		return
	}
	response.SuccessResponse(c, cfg, nil)
}

// Disconnect removes Xendit credentials and marks account as not connected (requires pos.payment.manage)
func (h *XenditConfigHandler) Disconnect(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	cfg, err := h.uc.Disconnect(c.Request.Context(), uc.companyID, uc.userID)
	if err != nil {
		if errors.Is(err, usecase.ErrXenditConfigNotFound) {
			coreErrors.NotFoundResponse(c, "xendit_config", "")
			return
		}
		coreErrors.InternalServerErrorResponse(c, "")
		return
	}
	response.SuccessResponse(c, cfg, nil)
}

