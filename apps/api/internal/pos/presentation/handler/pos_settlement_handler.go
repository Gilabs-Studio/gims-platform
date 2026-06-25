package handler

import (
	"errors"
	"strings"

	coreErrors "github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/gilabs/gims/api/internal/pos/domain/usecase"
	roleModels "github.com/gilabs/gims/api/internal/role/data/models"
	"github.com/gin-gonic/gin"
)

type POSSettlementHandler struct {
	uc usecase.POSSettlementUsecase
}

func NewPOSSettlementHandler(uc usecase.POSSettlementUsecase) *POSSettlementHandler {
	return &POSSettlementHandler{uc: uc}
}

func (h *POSSettlementHandler) GetOverview(c *gin.Context) {
	if !requireTenantOwner(c) {
		return
	}

	tenantID := strings.TrimSpace(c.GetString("tenant_id"))
	overview, err := h.uc.GetOverview(c.Request.Context(), tenantID)
	if err != nil {
		coreErrors.InternalServerErrorResponse(c, "")
		return
	}
	response.SuccessResponse(c, overview, nil)
}

func (h *POSSettlementHandler) GetPayouts(c *gin.Context) {
	if !requireTenantOwner(c) {
		return
	}

	tenantID := strings.TrimSpace(c.GetString("tenant_id"))
	payouts, err := h.uc.ListPayouts(c.Request.Context(), tenantID)
	if err != nil {
		coreErrors.InternalServerErrorResponse(c, "")
		return
	}
	response.SuccessResponse(c, payouts, nil)
}

func (h *POSSettlementHandler) GetPayoutChannels(c *gin.Context) {
	if !requireTenantOwner(c) {
		return
	}

	channels, err := h.uc.GetPayoutChannels(
		c.Request.Context(),
		c.DefaultQuery("currency", "IDR"),
		c.Query("channel_category"),
	)
	if err != nil {
		if errors.Is(err, usecase.ErrPOSSettlementNotConfigured) {
			coreErrors.ErrorResponse(c, "SETTLEMENT_NOT_CONFIGURED", nil, nil)
			return
		}
		coreErrors.ErrorResponse(c, "SETTLEMENT_PAYOUT_FAILED", map[string]interface{}{"reason": err.Error()}, nil)
		return
	}
	response.SuccessResponse(c, channels, nil)
}

func (h *POSSettlementHandler) CreatePayout(c *gin.Context) {
	if !requireTenantOwner(c) {
		return
	}

	var req dto.CreatePOSSettlementPayoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		coreErrors.HandleValidationError(c, err)
		return
	}

	tenantID := strings.TrimSpace(c.GetString("tenant_id"))
	userID := strings.TrimSpace(c.GetString("user_id"))
	payout, err := h.uc.CreatePayout(c.Request.Context(), tenantID, userID, &req)
	if err != nil {
		switch {
		case errors.Is(err, usecase.ErrPOSSettlementNotConfigured):
			coreErrors.ErrorResponse(c, "SETTLEMENT_NOT_CONFIGURED", nil, nil)
		case errors.Is(err, usecase.ErrPOSSettlementInsufficientBalance):
			coreErrors.ErrorResponse(c, "SETTLEMENT_INSUFFICIENT_BALANCE", map[string]interface{}{"reason": "requested amount exceeds available payout balance"}, nil)
		case errors.Is(err, usecase.ErrPOSSettlementPayoutFailed):
			coreErrors.ErrorResponse(c, "SETTLEMENT_PAYOUT_FAILED", map[string]interface{}{"reason": err.Error()}, nil)
		default:
			coreErrors.InternalServerErrorResponse(c, "")
		}
		return
	}

	response.SuccessResponseCreated(c, payout, nil)
}

func (h *POSSettlementHandler) ValidateBankAccount(c *gin.Context) {
	if !requireTenantOwner(c) {
		return
	}

	var req dto.ValidatePOSBankAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		coreErrors.HandleValidationError(c, err)
		return
	}

	res, err := h.uc.ValidateBankAccount(c.Request.Context(), &req)
	if err != nil {
		coreErrors.ErrorResponse(c, "BANK_ACCOUNT_VALIDATION_FAILED", map[string]interface{}{"reason": err.Error()}, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *POSSettlementHandler) RequestPayoutOTP(c *gin.Context) {
	if !requireTenantOwner(c) {
		return
	}

	var req dto.RequestPayoutOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		coreErrors.HandleValidationError(c, err)
		return
	}

	tenantID := strings.TrimSpace(c.GetString("tenant_id"))
	userID := strings.TrimSpace(c.GetString("user_id"))
	err := h.uc.RequestPayoutOTP(c.Request.Context(), tenantID, userID, req.Amount)
	if err != nil {
		coreErrors.ErrorResponse(c, "REQUEST_PAYOUT_OTP_FAILED", map[string]interface{}{"reason": err.Error()}, nil)
		return
	}
	response.SuccessResponse(c, map[string]string{"message": "OTP sent successfully"}, nil)
}

func requireTenantOwner(c *gin.Context) bool {
	roleCode := strings.TrimSpace(c.GetString("user_role"))
	tenantID := strings.TrimSpace(c.GetString("tenant_id"))
	if roleCode == "" || tenantID == "" {
		coreErrors.ForbiddenResponse(c, "tenant_owner", nil)
		return false
	}

	// Tests/bootstrap can run without DB; keep the fallback strict to the tenant-owner role code.
	if database.DB == nil {
		if strings.HasPrefix(strings.ToLower(roleCode), "tenant_owner_") {
			return true
		}
		coreErrors.ForbiddenResponse(c, "tenant_owner", nil)
		return false
	}

	var count int64
	err := database.DB.WithContext(c.Request.Context()).
		Model(&roleModels.Role{}).
		Where("code = ? AND tenant_id = ? AND is_protected = ? AND data_scope = ? AND deleted_at IS NULL", roleCode, tenantID, true, "ALL").
		Count(&count).Error
	if err != nil || count == 0 {
		coreErrors.ForbiddenResponse(c, "tenant_owner", nil)
		return false
	}
	return true
}
