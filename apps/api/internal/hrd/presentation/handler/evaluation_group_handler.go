package handler

import (
	"net/http"
	"strconv"

	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/usecase"
	"github.com/gin-gonic/gin"
)

type EvaluationGroupHandler struct {
	usecase usecase.EvaluationGroupUsecase
}

// NewEvaluationGroupHandler creates a new instance of EvaluationGroupHandler
func NewEvaluationGroupHandler(usecase usecase.EvaluationGroupUsecase) *EvaluationGroupHandler {
	return &EvaluationGroupHandler{
		usecase: usecase,
	}
}

// GetAll retrieves all evaluation groups with pagination and filters
// GET /hrd/evaluation-groups?page=1&per_page=20&search=performance&is_active=true
func (h *EvaluationGroupHandler) GetAll(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	search := c.Query("search")

	var isActive *bool
	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		val := isActiveStr == "true"
		isActive = &val
	}

	groups, meta, err := h.usecase.GetAll(c.Request.Context(), page, perPage, search, isActive)
	if err != nil {
		handleEvaluationGroupError(c, err)
		return
	}

	response.SuccessResponse(c, groups, &response.Meta{Pagination: meta})
}

// GetByID retrieves an evaluation group by ID (with criteria)
// GET /hrd/evaluation-groups/:id
func (h *EvaluationGroupHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	group, err := h.usecase.GetByID(c.Request.Context(), id)
	if err != nil {
		handleEvaluationGroupError(c, err)
		return
	}

	response.SuccessResponse(c, group, nil)
}

// Create creates a new evaluation group
// POST /hrd/evaluation-groups
func (h *EvaluationGroupHandler) Create(c *gin.Context) {
	var req dto.CreateEvaluationGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body", err.Error(), nil)
		return
	}

	group, err := h.usecase.Create(c.Request.Context(), &req)
	if err != nil {
		handleEvaluationGroupError(c, err)
		return
	}

	response.SuccessResponse(c, group, nil)
}

// Update updates an existing evaluation group
// PUT /hrd/evaluation-groups/:id
func (h *EvaluationGroupHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateEvaluationGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body", err.Error(), nil)
		return
	}

	group, err := h.usecase.Update(c.Request.Context(), id, &req)
	if err != nil {
		handleEvaluationGroupError(c, err)
		return
	}

	response.SuccessResponse(c, group, nil)
}

// Delete performs soft delete on an evaluation group
// DELETE /hrd/evaluation-groups/:id
func (h *EvaluationGroupHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.usecase.Delete(c.Request.Context(), id); err != nil {
		handleEvaluationGroupError(c, err)
		return
	}

	response.SuccessResponse(c, gin.H{"message": "Evaluation group deleted successfully"}, nil)
}

// handleEvaluationGroupError handles errors and returns appropriate HTTP responses
func handleEvaluationGroupError(c *gin.Context, err error) {
	switch err.Error() {
	case "evaluation group not found":
		errors.ErrorResponse(c, "EVALUATION_GROUP_NOT_FOUND", map[string]interface{}{"message": "Evaluation group not found"}, nil)
	default:
		errors.ErrorResponse(c, "INTERNAL_ERROR", map[string]interface{}{"message": "An unexpected error occurred"}, nil)
	}
}
