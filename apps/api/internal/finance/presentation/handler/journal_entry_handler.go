package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/usecase"
	"github.com/gin-gonic/gin"
)

type JournalEntryHandler struct {
	uc usecase.JournalEntryUsecase
}

func NewJournalEntryHandler(uc usecase.JournalEntryUsecase) *JournalEntryHandler {
	return &JournalEntryHandler{uc: uc}
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

func (h *JournalEntryHandler) TrialBalance(c *gin.Context) {
	var startDate *time.Time
	if v := strings.TrimSpace(c.Query("start_date")); v != "" {
		parsed, err := time.Parse("2006-01-02", v)
		if err != nil {
			response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "invalid start_date", nil, nil)
			return
		}
		startDate = &parsed
	}
	var endDate *time.Time
	if v := strings.TrimSpace(c.Query("end_date")); v != "" {
		parsed, err := time.Parse("2006-01-02", v)
		if err != nil {
			response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "invalid end_date", nil, nil)
			return
		}
		endDate = &parsed
	}

	res, err := h.uc.TrialBalance(c.Request.Context(), startDate, endDate)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "TRIAL_BALANCE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}
