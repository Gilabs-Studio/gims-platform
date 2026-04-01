package handler

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/exportjob"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/service"
	"github.com/gilabs/gims/api/internal/finance/domain/usecase"
	"github.com/gin-gonic/gin"
)

type JournalEntryHandler struct {
	uc                usecase.JournalEntryUsecase
	valuationUC       usecase.ValuationRunUsecase
	cashBankUC        usecase.CashBankJournalUsecase
	reconciliationSvc usecase.ValuationReconciliationService
	exportSvc         service.ValuationExportService
}

func NewJournalEntryHandler(
	uc usecase.JournalEntryUsecase,
	valuationUC usecase.ValuationRunUsecase,
	cashBankUC usecase.CashBankJournalUsecase,
	reconciliationSvc usecase.ValuationReconciliationService,
	exportSvc service.ValuationExportService,
) *JournalEntryHandler {
	return &JournalEntryHandler{
		uc:                uc,
		valuationUC:       valuationUC,
		cashBankUC:        cashBankUC,
		reconciliationSvc: reconciliationSvc,
		exportSvc:         exportSvc,
	}
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
func (h *JournalEntryHandler) PreviewValuation(c *gin.Context) {
	var req dto.RunValuationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.valuationUC.Preview(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALUATION_PREVIEW_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

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

func (h *JournalEntryHandler) ApproveValuation(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.ApproveValuationRequest
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.valuationUC.Approve(c.Request.Context(), id, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALUATION_APPROVE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

// UnlockValuation handles POST /finance/journal-entries/valuation/runs/:id/unlock
// RBAC-gated admin operation to unlock a posted (locked) valuation run.
// Only allowed for corrections when errors are discovered post-posting.
func (h *JournalEntryHandler) UnlockValuation(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.UnlockValuationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	if strings.TrimSpace(req.UnlockReason) == "" {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "unlock_reason is required", nil, nil)
		return
	}
	res, err := h.valuationUC.Unlock(c.Request.Context(), id, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALUATION_UNLOCK_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
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

// GetValuationReconciliation handles GET /finance/journal-entries/valuation/runs/:id/reconciliation
// Returns reconciliation report comparing GL posting vs subledger for audit trail.
func (h *JournalEntryHandler) GetValuationReconciliation(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))

	if h.reconciliationSvc == nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "RECONCILIATION_SERVICE_UNAVAILABLE", "Reconciliation service not configured", nil, nil)
		return
	}

	report, err := h.reconciliationSvc.GenerateReconciliationReport(c.Request.Context(), id)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "RECONCILIATION_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, report, nil)
}

// ExportValuation handles GET /finance/journal-entries/valuation/runs/:id/export?format=csv|pdf
// Returns CSV or PDF export of valuation run for auditors and analysis.
func (h *JournalEntryHandler) ExportValuation(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	format := strings.ToLower(strings.TrimSpace(c.DefaultQuery("format", "csv")))

	if h.exportSvc == nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "EXPORT_SERVICE_UNAVAILABLE", "Export service not configured", nil, nil)
		return
	}

	if format != "csv" && format != "pdf" {
		response.ErrorResponse(c, http.StatusBadRequest, "INVALID_FORMAT", "format must be 'csv' or 'pdf'", nil, nil)
		return
	}

	generator := func(ctx context.Context) (*exportjob.GeneratedFile, error) {
		var file *service.ExportedFile
		var err error

		switch format {
		case "csv":
			file, err = h.exportSvc.ExportAsCSV(ctx, id)
		case "pdf":
			file, err = h.exportSvc.ExportAsPDF(ctx, id)
		default:
			return nil, fmt.Errorf("format must be 'csv' or 'pdf'")
		}

		if err != nil {
			return nil, err
		}

		return &exportjob.GeneratedFile{
			FileName:    file.FileName,
			ContentType: file.ContentType,
			Bytes:       file.Content,
		}, nil
	}

	if exportjob.QueueIfRequested(c, generator) {
		return
	}

	file, err := generator(c.Request.Context())
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "EXPORT_FAILED", err.Error(), nil, nil)
		return
	}

	exportjob.WriteSyncFile(c, file)
}

// BulkApproveValuation handles POST /finance/journal-entries/valuation/runs/bulk-approve
// Approves multiple valuation runs in batch for efficiency.
func (h *JournalEntryHandler) BulkApproveValuation(c *gin.Context) {
	var req dto.BulkApproveValuationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}

	if len(req.RunIDs) == 0 {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "at least one run_id is required", nil, nil)
		return
	}

	result, err := h.valuationUC.BulkApprove(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "BULK_APPROVE_FAILED", err.Error(), nil, nil)
		return
	}

	response.SuccessResponse(c, result, nil)
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
