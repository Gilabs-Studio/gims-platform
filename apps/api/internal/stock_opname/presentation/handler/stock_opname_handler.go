package handler

import (
	"net/http"
	"strings"

	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/stock_opname/domain/dto"
	"github.com/gilabs/gims/api/internal/stock_opname/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type StockOpnameHandler struct {
	usecase usecase.StockOpnameUsecase
}

func NewStockOpnameHandler(u usecase.StockOpnameUsecase) *StockOpnameHandler {
	return &StockOpnameHandler{usecase: u}
}

func (h *StockOpnameHandler) Create(c *gin.Context) {
	var req dto.CreateStockOpnameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	var createdBy *string
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(string); ok {
			createdBy = &id
		}
	}

	res, err := h.usecase.Create(c.Request.Context(), &req, createdBy)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponseCreated(c, res, nil)
}

func (h *StockOpnameHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateStockOpnameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	res, err := h.usecase.Update(c.Request.Context(), id, &req)
	if err != nil {
		if err == usecase.ErrStockOpnameNotFound {
			errors.ErrorResponse(c, "STOCK_OPNAME_NOT_FOUND", map[string]interface{}{"id": id}, nil)
			return
		}
		if err == usecase.ErrInvalidStatus {
			errors.ErrorResponse(c, "INVALID_STATUS", map[string]interface{}{"message": err.Error()}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, res, nil)
}

func handleStockOpnameStandardError(c *gin.Context, err error) bool {
	errMsg := strings.ToLower(strings.TrimSpace(err.Error()))

	switch {
	case strings.Contains(errMsg, "not postable"):
		response.StandardErrorResponse(c, http.StatusUnprocessableEntity, response.ErrCodeAccountNotPostable, err.Error(), nil)
		return true
	case strings.Contains(errMsg, "inactive") && strings.Contains(errMsg, "account"):
		response.StandardErrorResponse(c, http.StatusUnprocessableEntity, response.ErrCodeAccountInactive, err.Error(), nil)
		return true
	case strings.Contains(errMsg, "period") && strings.Contains(errMsg, "closed"):
		response.StandardErrorResponse(c, http.StatusUnprocessableEntity, response.ErrCodePeriodClosed, err.Error(), nil)
		return true
	case strings.Contains(errMsg, "mapping") && (strings.Contains(errMsg, "not configured") || strings.Contains(errMsg, "belum dikonfigurasi")):
		response.StandardErrorResponse(c, http.StatusUnprocessableEntity, response.ErrCodeMappingNotConfigured, err.Error(), nil)
		return true
	case strings.Contains(errMsg, "lock") || strings.Contains(errMsg, "deadlock") || strings.Contains(errMsg, "concurrent") || strings.Contains(errMsg, "serialization"):
		response.StandardErrorResponse(c, http.StatusConflict, response.ErrCodeConcurrentLockConflict, err.Error(), nil)
		return true
	default:
		return false
	}
}

func (h *StockOpnameHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.usecase.Delete(c.Request.Context(), id); err != nil {
		if err == usecase.ErrStockOpnameNotFound {
			errors.ErrorResponse(c, "STOCK_OPNAME_NOT_FOUND", map[string]interface{}{"id": id}, nil)
			return
		}
		if err == usecase.ErrInvalidStatus {
			errors.ErrorResponse(c, "INVALID_STATUS", map[string]interface{}{"message": err.Error()}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}
	response.SuccessResponseDeleted(c, "stock_opname", id, nil)
}

func (h *StockOpnameHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	res, err := h.usecase.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrStockOpnameNotFound {
			errors.ErrorResponse(c, "STOCK_OPNAME_NOT_FOUND", map[string]interface{}{"id": id}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *StockOpnameHandler) List(c *gin.Context) {
	var req dto.ListStockOpnamesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		errors.InvalidQueryParamResponse(c)
		return
	}

	res, pagination, err := h.usecase.List(c.Request.Context(), &req)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{
		Pagination: &response.PaginationMeta{
			Page:       pagination.Page,
			PerPage:    pagination.PerPage,
			Total:      pagination.Total,
			TotalPages: pagination.TotalPages,
			HasNext:    pagination.Page < pagination.TotalPages,
			HasPrev:    pagination.Page > 1,
		},
	}
	response.SuccessResponse(c, res, meta)
}

func (h *StockOpnameHandler) SaveItems(c *gin.Context) {
	id := c.Param("id")
	var req dto.SaveStockOpnameItemsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	res, err := h.usecase.SaveItems(c.Request.Context(), id, &req)
	if err != nil {
		if err == usecase.ErrStockOpnameNotFound {
			errors.ErrorResponse(c, "STOCK_OPNAME_NOT_FOUND", map[string]interface{}{"id": id}, nil)
			return
		}
		if err == usecase.ErrInvalidStatus {
			errors.ErrorResponse(c, "INVALID_STATUS", map[string]interface{}{"message": err.Error()}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *StockOpnameHandler) ListItems(c *gin.Context) {
	id := c.Param("id")
	res, err := h.usecase.ListItems(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrStockOpnameNotFound {
			errors.ErrorResponse(c, "STOCK_OPNAME_NOT_FOUND", map[string]interface{}{"id": id}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *StockOpnameHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateStockOpnameStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	perms, exists := c.Get("user_permissions")
	if !exists {
		errors.ForbiddenResponse(c, "permission check failed", nil)
		return
	}

	permMap, ok := perms.(map[string]bool)
	if !ok {
		errors.ForbiddenResponse(c, "permission format error", nil)
		return
	}

	requiredPermission := ""
	switch req.Status {
	case "pending":
		requiredPermission = "stock_opname.update"
	case "approved":
		requiredPermission = "stock_opname.approve"
	case "rejected":
		requiredPermission = "stock_opname.reject"
	case "posted":
		requiredPermission = "stock_opname.post"
	default:
		errors.ErrorResponse(c, "INVALID_STATUS", map[string]interface{}{"message": "Status action not found"}, nil)
		return
	}

	if !permMap[requiredPermission] {
		errors.ForbiddenResponse(c, requiredPermission, nil)
		return
	}

	var userID *string
	if uid, exists := c.Get("user_id"); exists {
		if u, ok := uid.(string); ok {
			userID = &u
		}
	}

	var res *dto.StockOpnameResponse
	var err error

	switch req.Status {
	case "pending":
		res, err = h.usecase.Submit(c.Request.Context(), id)
	case "approved":
		res, err = h.usecase.Approve(c.Request.Context(), id, userID)
	case "rejected":
		res, err = h.usecase.Reject(c.Request.Context(), id, userID)
	case "posted":
		res, err = h.usecase.Post(c.Request.Context(), id, userID)
	}

	if err != nil {
		if err == usecase.ErrStockOpnameNotFound {
			errors.ErrorResponse(c, "STOCK_OPNAME_NOT_FOUND", map[string]interface{}{"id": id}, nil)
			return
		}
		if err == usecase.ErrInvalidStatus {
			errors.ErrorResponse(c, "INVALID_STATUS", map[string]interface{}{"message": err.Error()}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, res, nil)
}
