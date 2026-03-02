package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/finance/domain/usecase"
	"github.com/gin-gonic/gin"
)

type AgingReportHandler struct {
	uc usecase.AgingReportUsecase
}

func NewAgingReportHandler(uc usecase.AgingReportUsecase) *AgingReportHandler {
	return &AgingReportHandler{uc: uc}
}

func parseAsOfDate(c *gin.Context) (time.Time, error) {
	v := strings.TrimSpace(c.Query("as_of_date"))
	if v == "" {
		now := apptime.Now()
		return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC), nil
	}
	parsed, err := time.Parse("2006-01-02", v)
	if err != nil {
		return time.Time{}, err
	}
	return time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, time.UTC), nil
}

func (h *AgingReportHandler) ARAging(c *gin.Context) {
	asOf, err := parseAsOfDate(c)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "invalid as_of_date", nil, nil)
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}
	search := strings.TrimSpace(c.Query("search"))

	res, total, err := h.uc.ARAging(c.Request.Context(), asOf, search, page, perPage)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "AR_AGING_FAILED", err.Error(), nil, nil)
		return
	}
	meta := &response.Meta{Pagination: response.NewPaginationMeta(page, perPage, int(total))}
	response.SuccessResponse(c, res, meta)
}

func (h *AgingReportHandler) APAging(c *gin.Context) {
	asOf, err := parseAsOfDate(c)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "invalid as_of_date", nil, nil)
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}
	search := strings.TrimSpace(c.Query("search"))

	res, total, err := h.uc.APAging(c.Request.Context(), asOf, search, page, perPage)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "AP_AGING_FAILED", err.Error(), nil, nil)
		return
	}
	meta := &response.Meta{Pagination: response.NewPaginationMeta(page, perPage, int(total))}
	response.SuccessResponse(c, res, meta)
}
