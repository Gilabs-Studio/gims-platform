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
	g.GET("/:id", middleware.RequirePermission(assetRead), h.GetByID)
	g.PUT("/:id", middleware.RequirePermission(assetUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(assetDelete), h.Delete)
	g.POST("/:id/depreciate", middleware.RequirePermission(assetDepreciate), h.Depreciate)
	g.POST("/:id/transfer", middleware.RequirePermission(assetUpdate), h.Transfer)
	g.POST("/:id/dispose", middleware.RequirePermission(assetUpdate), h.Dispose)
}
