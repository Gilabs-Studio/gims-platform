package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	coreErrors "github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/gilabs/gims/api/internal/pos/domain/usecase"
)

// FloorPlanHandler handles HTTP requests for floor plans
type FloorPlanHandler struct {
	uc usecase.FloorPlanUsecase
}

// NewFloorPlanHandler creates a new handler
func NewFloorPlanHandler(uc usecase.FloorPlanUsecase) *FloorPlanHandler {
	return &FloorPlanHandler{uc: uc}
}

type userContext struct {
	userID        string
	companyID     string
	isOwner       bool
}

func extractUserContext(c *gin.Context) (*userContext, bool) {
	uid, exists := c.Get("user_id")
	if !exists {
		coreErrors.UnauthorizedResponse(c, "missing user context")
		return nil, false
	}

	scope, _ := c.Get("permission_scope")
	scopeStr, _ := scope.(string)

	companyID, _ := c.Get("user_company_id")
	companyIDStr, _ := companyID.(string)

	return &userContext{
		userID:    uid.(string),
		companyID: companyIDStr,
		isOwner:   scopeStr == "ALL",
	}, true
}

func handleFloorPlanError(c *gin.Context, err error) {
	switch err {
	case usecase.ErrFloorPlanNotFound:
		coreErrors.NotFoundResponse(c, "floor_plan", "")
	case usecase.ErrFloorPlanForbidden:
		coreErrors.ForbiddenResponse(c, "pos.layout.manage", nil)
	case usecase.ErrVersionNotFound:
		coreErrors.NotFoundResponse(c, "layout_version", "")
	default:
		coreErrors.InternalServerErrorResponse(c, "")
	}
}

// GetFormData returns dropdown options for floor plan forms
func (h *FloorPlanHandler) GetFormData(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	formData, err := h.uc.GetFormData(c.Request.Context(), uc.companyID, uc.isOwner)
	if err != nil {
		handleFloorPlanError(c, err)
		return
	}

	response.SuccessResponse(c, formData, nil)
}

// Create handles floor plan creation
func (h *FloorPlanHandler) Create(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	var req dto.CreateFloorPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		coreErrors.HandleValidationError(c, err)
		return
	}

	result, err := h.uc.Create(c.Request.Context(), &req, uc.userID, uc.companyID, uc.isOwner)
	if err != nil {
		handleFloorPlanError(c, err)
		return
	}

	response.SuccessResponseCreated(c, result, nil)
}

// List handles listing floor plans
func (h *FloorPlanHandler) List(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage > 100 {
		perPage = 100
	}
	if page < 1 {
		page = 1
	}

	params := repositories.FloorPlanListParams{
		CompanyID: c.Query("company_id"),
		Search:    c.Query("search"),
		Status:    c.Query("status"),
		SortBy:    c.Query("sort_by"),
		SortDir:   c.Query("sort_dir"),
		Limit:     perPage,
		Offset:    (page - 1) * perPage,
	}

	plans, total, err := h.uc.List(c.Request.Context(), params, uc.companyID, uc.isOwner)
	if err != nil {
		handleFloorPlanError(c, err)
		return
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	hasNext := page < totalPages
	hasPrev := page > 1
	var nextPage, prevPage *int
	if hasNext {
		n := page + 1
		nextPage = &n
	}
	if hasPrev {
		p := page - 1
		prevPage = &p
	}

	meta := &response.Meta{
		Pagination: &response.PaginationMeta{
			Page:       page,
			PerPage:    perPage,
			Total:      int(total),
			TotalPages: totalPages,
			HasNext:    hasNext,
			HasPrev:    hasPrev,
			NextPage:   nextPage,
			PrevPage:   prevPage,
		},
	}

	response.SuccessResponse(c, plans, meta)
}

// GetByID handles getting a single floor plan
func (h *FloorPlanHandler) GetByID(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	id := c.Param("id")
	result, err := h.uc.GetByID(c.Request.Context(), id, uc.companyID, uc.isOwner)
	if err != nil {
		handleFloorPlanError(c, err)
		return
	}

	response.SuccessResponse(c, result, nil)
}

// Update handles floor plan metadata update
func (h *FloorPlanHandler) Update(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	id := c.Param("id")
	var req dto.UpdateFloorPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		coreErrors.HandleValidationError(c, err)
		return
	}

	result, err := h.uc.Update(c.Request.Context(), id, &req, uc.companyID, uc.isOwner)
	if err != nil {
		handleFloorPlanError(c, err)
		return
	}

	response.SuccessResponse(c, result, nil)
}

// SaveLayoutData handles saving canvas layout data
func (h *FloorPlanHandler) SaveLayoutData(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	id := c.Param("id")
	var req dto.SaveLayoutDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		coreErrors.HandleValidationError(c, err)
		return
	}

	result, err := h.uc.SaveLayoutData(c.Request.Context(), id, &req, uc.companyID, uc.isOwner)
	if err != nil {
		handleFloorPlanError(c, err)
		return
	}

	response.SuccessResponse(c, result, nil)
}

// Delete handles floor plan deletion
func (h *FloorPlanHandler) Delete(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	id := c.Param("id")
	if err := h.uc.Delete(c.Request.Context(), id, uc.companyID, uc.isOwner); err != nil {
		handleFloorPlanError(c, err)
		return
	}

	response.SuccessResponseDeleted(c, "floor_plan", id, nil)
}

// Publish handles publishing a floor plan
func (h *FloorPlanHandler) Publish(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	id := c.Param("id")
	result, err := h.uc.Publish(c.Request.Context(), id, uc.userID, uc.companyID, uc.isOwner)
	if err != nil {
		handleFloorPlanError(c, err)
		return
	}

	response.SuccessResponse(c, result, nil)
}

// ListVersions handles listing layout versions
func (h *FloorPlanHandler) ListVersions(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	id := c.Param("id")
	versions, err := h.uc.ListVersions(c.Request.Context(), id, uc.companyID, uc.isOwner)
	if err != nil {
		handleFloorPlanError(c, err)
		return
	}

	response.SuccessResponse(c, versions, nil)
}
