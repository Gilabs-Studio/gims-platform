package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/usecase"
	"github.com/gin-gonic/gin"
)

type JournalEntryHandler struct {
	uc          usecase.JournalEntryUsecase
	valuationUC usecase.ValuationRunUsecase
	cashBankUC  usecase.CashBankJournalUsecase
}

func NewJournalEntryHandler(uc usecase.JournalEntryUsecase, valuationUC usecase.ValuationRunUsecase, cashBankUC usecase.CashBankJournalUsecase) *JournalEntryHandler {
	return &JournalEntryHandler{uc: uc, valuationUC: valuationUC, cashBankUC: cashBankUC}
}

func (h *JournalEntryHandler) Create(c *gin.Context) {
	var req dto.CreateJournalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.Create(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "JOURNAL_CREATE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponseCreated(c, res, nil)
}

func (h *JournalEntryHandler) Update(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.UpdateJournalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.Update(c.Request.Context(), id, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "JOURNAL_UPDATE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *JournalEntryHandler) Delete(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if err := h.uc.Delete(c.Request.Context(), id); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "JOURNAL_DELETE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponseDeleted(c, "journal_entry", id, nil)
}

func (h *JournalEntryHandler) GetByID(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	res, err := h.uc.GetByID(c.Request.Context(), id)
	if err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "JOURNAL_NOT_FOUND", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *JournalEntryHandler) List(c *gin.Context) {
	var req dto.ListJournalEntriesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
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
	req.Page = page
	req.PerPage = perPage

	items, total, err := h.uc.List(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "JOURNAL_LIST_FAILED", err.Error(), nil, nil)
		return
	}
	meta := &response.Meta{Pagination: response.NewPaginationMeta(page, perPage, int(total))}
	response.SuccessResponse(c, items, meta)
}

func (h *JournalEntryHandler) ListSalesJournals(c *gin.Context) {
	h.listByDomain(c, "sales")
}

func (h *JournalEntryHandler) ListPurchaseJournals(c *gin.Context) {
	h.listByDomain(c, "purchase")
}

func (h *JournalEntryHandler) ListInventoryJournals(c *gin.Context) {
	h.listByDomain(c, "inventory")
}

func (h *JournalEntryHandler) ListCashBankJournals(c *gin.Context) {
	h.listByDomain(c, "cash_bank")
}

func (h *JournalEntryHandler) ListAdjustmentJournals(c *gin.Context) {
	h.listByDomain(c, "adjustment")
}

// CreateAdjustment handles POST /finance/journal-entries/adjustment.
// Forces reference_type = MANUAL_ADJUSTMENT on the backend regardless of what the client sends.
func (h *JournalEntryHandler) CreateAdjustment(c *gin.Context) {
	var req dto.CreateAdjustmentJournalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.CreateAdjustmentJournal(c.Request.Context(), &req)
	if err != nil {
		errMsg := err.Error()
		switch errMsg {
		case "journal entry must be balanced (debit = credit)":
			response.ErrorResponse(c, http.StatusUnprocessableEntity, "JOURNAL_UNBALANCED", errMsg, nil, nil)
		case "invalid journal lines":
			response.ErrorResponse(c, http.StatusBadRequest, "JOURNAL_INVALID_LINES", errMsg, nil, nil)
		case "period is closed":
			response.ErrorResponse(c, http.StatusConflict, "PERIOD_CLOSED", errMsg, nil, nil)
		default:
			response.ErrorResponse(c, http.StatusBadRequest, "ADJUSTMENT_CREATE_FAILED", errMsg, nil, nil)
		}
		return
	}
	response.SuccessResponseCreated(c, res, nil)
}

// UpdateAdjustment handles PUT /finance/journal-entries/adjustment/:id.
func (h *JournalEntryHandler) UpdateAdjustment(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.UpdateJournalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.UpdateAdjustmentJournal(c.Request.Context(), id, &req)
	if err != nil {
		errMsg := err.Error()
		switch errMsg {
		case "journal entry must be balanced (debit = credit)":
			response.ErrorResponse(c, http.StatusUnprocessableEntity, "JOURNAL_UNBALANCED", errMsg, nil, nil)
		case "invalid journal lines":
			response.ErrorResponse(c, http.StatusBadRequest, "JOURNAL_INVALID_LINES", errMsg, nil, nil)
		case "period is closed":
			response.ErrorResponse(c, http.StatusConflict, "PERIOD_CLOSED", errMsg, nil, nil)
		default:
			response.ErrorResponse(c, http.StatusBadRequest, "ADJUSTMENT_UPDATE_FAILED", errMsg, nil, nil)
		}
		return
	}
	response.SuccessResponse(c, res, nil)
}

// PostAdjustment handles POST /finance/journal-entries/adjustment/:id/post.
func (h *JournalEntryHandler) PostAdjustment(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	res, err := h.uc.PostAdjustmentJournal(c.Request.Context(), id)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "ADJUSTMENT_POST_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

// ReverseAdjustment handles POST /finance/journal-entries/adjustment/:id/reverse.
func (h *JournalEntryHandler) ReverseAdjustment(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	res, err := h.uc.ReverseAdjustmentJournal(c.Request.Context(), id)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "ADJUSTMENT_REVERSE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *JournalEntryHandler) ListValuationJournals(c *gin.Context) {
	h.listByDomain(c, "valuation")
}

// ListCashBankSubLedger handles GET /finance/journal-entries/cash-bank
// This is a READ-ONLY sub-ledger endpoint that returns posted cash_bank_journals with KPI.
func (h *JournalEntryHandler) ListCashBankSubLedger(c *gin.Context) {
	var req dto.ListCashBankJournalsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
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
	req.Page = page
	req.PerPage = perPage

	items, total, kpi, err := h.cashBankUC.ListPosted(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "CASH_BANK_SUBLEDGER_FAILED", err.Error(), nil, nil)
		return
	}

	paginationMeta := response.NewPaginationMeta(page, perPage, int(total))
	meta := &response.Meta{
		Pagination: paginationMeta,
		Additional: map[string]interface{}{
			"kpi": kpi,
		},
	}
	response.SuccessResponse(c, items, meta)
}

// RunValuation handles POST /finance/journal-entries/valuation/run
// Enhanced: accepts RunValuationRequest with type, period, and optional reference_id.
func (h *JournalEntryHandler) RunValuation(c *gin.Context) {
	var req dto.RunValuationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.valuationUC.Run(c.Request.Context(), &req)
	if err != nil {
		if err.Error() == usecase.ErrValuationConflict.Error() {
			response.ErrorResponse(c, http.StatusConflict, "VALUATION_CONFLICT", err.Error(), nil, nil)
			return
		}
		response.ErrorResponse(c, http.StatusInternalServerError, "VALUATION_RUN_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponseCreated(c, res, nil)
}

// ListValuationRuns handles GET /finance/journal-entries/valuation/runs
func (h *JournalEntryHandler) ListValuationRuns(c *gin.Context) {
	var req dto.ListValuationRunsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
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
	req.Page = page
	req.PerPage = perPage

	items, total, kpi, err := h.valuationUC.List(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "VALUATION_LIST_FAILED", err.Error(), nil, nil)
		return
	}

	paginationMeta := response.NewPaginationMeta(page, perPage, int(total))
	meta := &response.Meta{
		Pagination: paginationMeta,
		Additional: map[string]interface{}{
			"kpi": kpi,
		},
	}
	response.SuccessResponse(c, items, meta)
}

// GetValuationRun handles GET /finance/journal-entries/valuation/runs/:id
func (h *JournalEntryHandler) GetValuationRun(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	res, err := h.valuationUC.GetByID(c.Request.Context(), id)
	if err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "VALUATION_RUN_NOT_FOUND", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *JournalEntryHandler) listByDomain(c *gin.Context, domain string) {
	var req dto.ListJournalEntriesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
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

	req.Page = page
	req.PerPage = perPage
	req.Domain = &domain

	items, total, err := h.uc.List(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "JOURNAL_LIST_FAILED", err.Error(), nil, nil)
		return
	}

	meta := &response.Meta{Pagination: response.NewPaginationMeta(page, perPage, int(total))}
	response.SuccessResponse(c, items, meta)
}

func (h *JournalEntryHandler) Post(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	res, err := h.uc.Post(c.Request.Context(), id)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "JOURNAL_POST_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *JournalEntryHandler) Reverse(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	res, err := h.uc.Reverse(c.Request.Context(), id)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "JOURNAL_REVERSE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *JournalEntryHandler) GetFormData(c *gin.Context) {
	res, err := h.uc.GetFormData(c.Request.Context())
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "JOURNAL_FORM_DATA_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}
