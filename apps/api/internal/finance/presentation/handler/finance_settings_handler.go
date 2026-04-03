package handler

import (
	"log"
	"net/http"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/financesettings"
	"github.com/gin-gonic/gin"
)

type FinanceSettingsHandler struct {
	settingsService financesettings.SettingsService
}

func NewFinanceSettingsHandler(settingsService financesettings.SettingsService) *FinanceSettingsHandler {
	return &FinanceSettingsHandler{
		settingsService: settingsService,
	}
}

func (h *FinanceSettingsHandler) GetAll(c *gin.Context) {
	settings, err := h.settingsService.GetAll(c.Request.Context())
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve finance settings", err.Error(), nil, nil)
		return
	}

	var res []dto.FinanceSettingResponse
	for _, s := range settings {
		res = append(res, dto.FinanceSettingResponse{
			ID:          s.ID,
			SettingKey:  s.SettingKey,
			Value:       s.Value,
			Description: s.Description,
			Category:    s.Category,
		})
	}

	response.SuccessResponse(c, res, nil)
}

func (h *FinanceSettingsHandler) BatchUpsert(c *gin.Context) {
	var req dto.BatchUpsertFinanceSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "Invalid request format", err.Error(), nil, nil)
		return
	}

	ctx := c.Request.Context()
	for _, config := range req.Settings {
		if err := h.settingsService.Upsert(ctx, config.SettingKey, config.Value, config.Description, config.Category); err != nil {
			log.Printf("Failed to upsert setting %s: %v", config.SettingKey, err)
			response.ErrorResponse(c, http.StatusInternalServerError, "Failed to update settings", err.Error(), nil, nil)
			return
		}
	}

	// Reload settings after upsert
	settings, err := h.settingsService.GetAll(ctx)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve finance settings", err.Error(), nil, nil)
		return
	}

	var res []dto.FinanceSettingResponse
	for _, s := range settings {
		res = append(res, dto.FinanceSettingResponse{
			ID:          s.ID,
			SettingKey:  s.SettingKey,
			Value:       s.Value,
			Description: s.Description,
			Category:    s.Category,
		})
	}

	response.SuccessResponse(c, res, nil)
}
