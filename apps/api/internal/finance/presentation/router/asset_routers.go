package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	assetRead       = "asset.read"
	assetCreate     = "asset.create"
	assetUpdate     = "asset.update"
	assetDelete     = "asset.delete"
	assetDepreciate = "asset.depreciate"
)

func RegisterAssetRoutes(r *gin.RouterGroup, h *handler.AssetHandler) {
	g := r.Group("/assets")
	g.GET("", middleware.RequirePermission(assetRead), h.List)
	g.GET("/", middleware.RequirePermission(assetRead), h.List)
	g.POST("", middleware.RequirePermission(assetCreate), h.Create)
	g.POST("/", middleware.RequirePermission(assetCreate), h.Create)
	// CRITICAL: Place form-data BEFORE parameterized routes (/:id) for route specificity
	g.GET("/form-data", middleware.RequirePermission(assetRead), h.GetFormData)
	g.GET("/:id", middleware.RequirePermission(assetRead), h.GetByID)
	g.PUT("/:id", middleware.RequirePermission(assetUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(assetDelete), h.Delete)
	g.POST("/:id/depreciate", middleware.RequirePermission(assetDepreciate), h.Depreciate)
	g.POST("/depreciations/:dep_id/approve", middleware.RequirePermission(assetDepreciate), h.ApproveDepreciation)
	g.POST("/:id/transfer", middleware.RequirePermission(assetUpdate), h.Transfer)
	g.POST("/:id/dispose", middleware.RequirePermission(assetUpdate), h.Dispose)
	g.POST("/:id/sell", middleware.RequirePermission(assetUpdate), h.Sell)
	g.POST("/:id/revalue", middleware.RequirePermission(assetUpdate), h.Revalue)
	g.POST("/:id/adjust", middleware.RequirePermission(assetUpdate), h.Adjust)
	g.POST("/transactions/:tx_id/approve", middleware.RequirePermission(assetUpdate), h.ApproveTransaction)
}
