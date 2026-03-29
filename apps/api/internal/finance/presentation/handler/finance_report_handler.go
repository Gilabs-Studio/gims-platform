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

type FinanceReportHandler struct {
	uc usecase.FinanceReportUsecase
}

func NewFinanceReportHandler(uc usecase.FinanceReportUsecase) *FinanceReportHandler {
	return &FinanceReportHandler{uc: uc}
}

func parseDateOrDefault(c *gin.Context, key string, def time.Time) time.Time {
	val := c.Query(key)
	if val == "" {
		return def
	}
	t, err := time.Parse("2006-01-02", val)
	if err != nil {
		return def
	}
	return t
}

func parseOptionalCompanyID(c *gin.Context) *string {
	value := strings.TrimSpace(c.Query("company_id"))
	if value == "" {
		return nil
	}
	return &value
}

func parseIncludeZero(c *gin.Context) bool {
	raw := strings.TrimSpace(c.Query("include_zero"))
	if raw == "" {
		return false
	}
	parsed, err := strconv.ParseBool(raw)
	if err == nil {
		return parsed
	}
	return raw == "1"
}

func (h *FinanceReportHandler) GeneralLedger(c *gin.Context) {
	startDate := parseDateOrDefault(c, "start_date", apptime.Now().AddDate(0, -1, 0))
	endDate := parseDateOrDefault(c, "end_date", apptime.Now())
	companyID := parseOptionalCompanyID(c)

	res, err := h.uc.GetGeneralLedger(c.Request.Context(), startDate, endDate, companyID)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "GENERAL_LEDGER_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *FinanceReportHandler) BalanceSheet(c *gin.Context) {
	startDate := parseDateOrDefault(c, "start_date", apptime.Now().AddDate(0, -1, 0))
	endDate := parseDateOrDefault(c, "end_date", apptime.Now())
	companyID := parseOptionalCompanyID(c)
	includeZero := parseIncludeZero(c)

	res, err := h.uc.GetBalanceSheet(c.Request.Context(), startDate, endDate, companyID, includeZero)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "BALANCE_SHEET_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *FinanceReportHandler) ProfitAndLoss(c *gin.Context) {
	startDate := parseDateOrDefault(c, "start_date", apptime.Now().AddDate(0, -1, 0))
	endDate := parseDateOrDefault(c, "end_date", apptime.Now())
	companyID := parseOptionalCompanyID(c)

	res, err := h.uc.GetProfitAndLoss(c.Request.Context(), startDate, endDate, companyID)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "PROFIT_LOSS_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *FinanceReportHandler) TrialBalance(c *gin.Context) {
	startDate := parseDateOrDefault(c, "start_date", apptime.Now().AddDate(0, -1, 0))
	endDate := parseDateOrDefault(c, "end_date", apptime.Now())
	companyID := parseOptionalCompanyID(c)

	res, err := h.uc.GetTrialBalance(c.Request.Context(), startDate, endDate, companyID)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "TRIAL_BALANCE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *FinanceReportHandler) ExportGeneralLedger(c *gin.Context) {
	startDate := parseDateOrDefault(c, "start_date", apptime.Now().AddDate(0, -1, 0))
	endDate := parseDateOrDefault(c, "end_date", apptime.Now())
	companyID := parseOptionalCompanyID(c)

	bytes, err := h.uc.ExportGeneralLedger(c.Request.Context(), startDate, endDate, companyID)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "EXPORT_FAILED", err.Error(), nil, nil)
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=general_ledger.xlsx")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes)
}

func (h *FinanceReportHandler) ExportBalanceSheet(c *gin.Context) {
	startDate := parseDateOrDefault(c, "start_date", apptime.Now().AddDate(0, -1, 0))
	endDate := parseDateOrDefault(c, "end_date", apptime.Now())
	companyID := parseOptionalCompanyID(c)
	includeZero := parseIncludeZero(c)

	bytes, err := h.uc.ExportBalanceSheet(c.Request.Context(), startDate, endDate, companyID, includeZero)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "EXPORT_FAILED", err.Error(), nil, nil)
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=balance_sheet.xlsx")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes)
}

func (h *FinanceReportHandler) ExportProfitAndLoss(c *gin.Context) {
	startDate := parseDateOrDefault(c, "start_date", apptime.Now().AddDate(0, -1, 0))
	endDate := parseDateOrDefault(c, "end_date", apptime.Now())
	companyID := parseOptionalCompanyID(c)

	bytes, err := h.uc.ExportProfitAndLoss(c.Request.Context(), startDate, endDate, companyID)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "EXPORT_FAILED", err.Error(), nil, nil)
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=profit_and_loss.xlsx")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes)
}
