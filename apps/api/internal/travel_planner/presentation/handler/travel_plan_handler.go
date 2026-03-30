package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/travel_planner/domain/dto"
	"github.com/gilabs/gims/api/internal/travel_planner/domain/usecase"
	"github.com/gin-gonic/gin"
)

type TravelPlanHandler struct {
	uc usecase.TravelPlanUsecase
}

func NewTravelPlanHandler(uc usecase.TravelPlanUsecase) *TravelPlanHandler {
	return &TravelPlanHandler{uc: uc}
}

func (h *TravelPlanHandler) Create(c *gin.Context) {
	var req dto.CreateTravelPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}

	res, err := h.uc.Create(c.Request.Context(), &req)
	if err != nil {
		handleTravelPlanError(c, err)
		return
	}

	response.SuccessResponseCreated(c, res, nil)
}

func (h *TravelPlanHandler) Update(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))

	var req dto.UpdateTravelPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}

	res, err := h.uc.Update(c.Request.Context(), id, &req)
	if err != nil {
		handleTravelPlanError(c, err)
		return
	}

	response.SuccessResponse(c, res, nil)
}

func (h *TravelPlanHandler) Delete(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if err := h.uc.Delete(c.Request.Context(), id); err != nil {
		handleTravelPlanError(c, err)
		return
	}

	response.SuccessResponseDeleted(c, "travel_plan", id, nil)
}

func (h *TravelPlanHandler) GetByID(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	res, err := h.uc.GetByID(c.Request.Context(), id)
	if err != nil {
		handleTravelPlanError(c, err)
		return
	}

	response.SuccessResponse(c, res, nil)
}

func (h *TravelPlanHandler) List(c *gin.Context) {
	var req dto.ListTravelPlansRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}

	items, total, page, perPage, err := h.uc.List(c.Request.Context(), &req)
	if err != nil {
		handleTravelPlanError(c, err)
		return
	}

	meta := &response.Meta{
		Pagination: response.NewPaginationMeta(page, perPage, int(total)),
	}
	response.SuccessResponse(c, items, meta)
}

func (h *TravelPlanHandler) GetFormData(c *gin.Context) {
	res, err := h.uc.GetFormData(c.Request.Context())
	if err != nil {
		handleTravelPlanError(c, err)
		return
	}

	response.SuccessResponse(c, res, nil)
}

func (h *TravelPlanHandler) SearchPlaces(c *gin.Context) {
	query := c.Query("query")
	provider := c.Query("provider")

	results, err := h.uc.SearchPlaces(c.Request.Context(), query, provider)
	if err != nil {
		handleTravelPlanError(c, err)
		return
	}

	response.SuccessResponse(c, results, nil)
}

func (h *TravelPlanHandler) OptimizeRoute(c *gin.Context) {
	planID := strings.TrimSpace(c.Param("id"))
	res, err := h.uc.OptimizeRoute(c.Request.Context(), planID)
	if err != nil {
		handleTravelPlanError(c, err)
		return
	}

	response.SuccessResponse(c, res, nil)
}

func (h *TravelPlanHandler) GetWeather(c *gin.Context) {
	planID := strings.TrimSpace(c.Param("id"))
	res, err := h.uc.GetWeather(c.Request.Context(), planID)
	if err != nil {
		handleTravelPlanError(c, err)
		return
	}

	response.SuccessResponse(c, res, nil)
}

func (h *TravelPlanHandler) GetGoogleMapsLinks(c *gin.Context) {
	planID := strings.TrimSpace(c.Param("id"))
	res, err := h.uc.GetGoogleMapsLinks(c.Request.Context(), planID)
	if err != nil {
		handleTravelPlanError(c, err)
		return
	}

	response.SuccessResponse(c, res, nil)
}

func (h *TravelPlanHandler) ExportPDF(c *gin.Context) {
	planID := strings.TrimSpace(c.Param("id"))
	dayIndexQuery := strings.TrimSpace(c.Query("day_index"))

	var dayIndex *int
	if dayIndexQuery != "" {
		parsedDayIndex, err := strconv.Atoi(dayIndexQuery)
		if err != nil || parsedDayIndex <= 0 {
			response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "day_index must be a positive integer", nil, nil)
			return
		}
		dayIndex = &parsedDayIndex
	}

	pdfBytes, filename, err := h.uc.ExportPDF(c.Request.Context(), planID, dayIndex)
	if err != nil {
		handleTravelPlanError(c, err)
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Header("Cache-Control", "no-store")
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

func handleTravelPlanError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, usecase.ErrTravelPlanNotFound):
		response.ErrorResponse(c, http.StatusNotFound, "TRAVEL_PLAN_NOT_FOUND", err.Error(), nil, nil)
	case errors.Is(err, usecase.ErrInvalidTravelMode),
		errors.Is(err, usecase.ErrInvalidDateRange),
		errors.Is(err, usecase.ErrInvalidDayDate),
		errors.Is(err, usecase.ErrInvalidStatus),
		errors.Is(err, usecase.ErrInvalidStopCategory),
		errors.Is(err, usecase.ErrInvalidStopSource),
		errors.Is(err, usecase.ErrInvalidSearchQuery):
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
	default:
		response.ErrorResponse(
			c,
			http.StatusInternalServerError,
			"INTERNAL_ERROR",
			"internal server error",
			map[string]interface{}{"detail": err.Error()},
			nil,
		)
	}
}
