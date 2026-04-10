package handler

import (
	"github.com/gin-gonic/gin"
	coreErrors "github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/gilabs/gims/api/internal/pos/domain/usecase"
)

// MidtransConfigHandler handles Midtrans gateway configuration per company
type MidtransConfigHandler struct {
	uc usecase.MidtransConfigUsecase
}

// NewMidtransConfigHandler creates the handler
func NewMidtransConfigHandler(uc usecase.MidtransConfigUsecase) *MidtransConfigHandler {
	return &MidtransConfigHandler{uc: uc}
}

// Get returns the Midtrans config for the authenticated user's company
func (h *MidtransConfigHandler) Get(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	cfg, err := h.uc.Get(c.Request.Context(), uc.companyID)
	if err != nil {
		if err == usecase.ErrMidtransConfigNotFound {
			coreErrors.NotFoundResponse(c, "midtrans_config", "")
			return
		}
		coreErrors.InternalServerErrorResponse(c, "")
		return
	}
	response.SuccessResponse(c, cfg, nil)
}

// Upsert saves or updates the Midtrans credentials for the company
func (h *MidtransConfigHandler) Upsert(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	var req dto.UpsertMidtransConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		coreErrors.HandleValidationError(c, err)
		return
	}

	cfg, err := h.uc.Upsert(c.Request.Context(), uc.companyID, &req, uc.userID)
	if err != nil {
		coreErrors.InternalServerErrorResponse(c, "")
		return
	}
	response.SuccessResponse(c, cfg, nil)
}
