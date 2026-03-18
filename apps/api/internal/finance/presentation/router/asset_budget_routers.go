package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	assetBudgetRead   = "asset_budget.read"
	assetBudgetCreate = "asset_budget.create"
	assetBudgetUpdate = "asset_budget.update"
	assetBudgetDelete = "asset_budget.delete"
)

func RegisterAssetBudgetRoutes(r *gin.RouterGroup, h *handler.AssetBudgetHandler) {
	g := r.Group("/budgets")
	g.GET("", middleware.RequirePermission(assetBudgetRead), h.List)
	g.GET("/", middleware.RequirePermission(assetBudgetRead), h.List)
	g.POST("", middleware.RequirePermission(assetBudgetCreate), h.Create)
	g.POST("/", middleware.RequirePermission(assetBudgetCreate), h.Create)
	// CRITICAL: Place form-data BEFORE parameterized routes (/:id) for route specificity
	g.GET("/form-data", middleware.RequirePermission(assetBudgetRead), h.GetFormData)
	g.GET("/code/:code", middleware.RequirePermission(assetBudgetRead), h.GetByCode)
	g.GET("/:id", middleware.RequirePermission(assetBudgetRead), h.GetByID)
	g.PUT("/:id", middleware.RequirePermission(assetBudgetUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(assetBudgetDelete), h.Delete)
	g.PATCH("/:id/status", middleware.RequirePermission(assetBudgetUpdate), h.ChangeStatus)
}
