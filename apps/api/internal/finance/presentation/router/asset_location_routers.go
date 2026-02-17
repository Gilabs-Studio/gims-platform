package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	assetLocationRead   = "asset.read"
	assetLocationCreate = "asset.create"
	assetLocationUpdate = "asset.update"
	assetLocationDelete = "asset.delete"
)

func RegisterAssetLocationRoutes(r *gin.RouterGroup, h *handler.AssetLocationHandler) {
	g := r.Group("/asset-locations")
	g.GET("", middleware.RequirePermission(assetLocationRead), h.List)
	g.GET("/", middleware.RequirePermission(assetLocationRead), h.List)
	g.POST("", middleware.RequirePermission(assetLocationCreate), h.Create)
	g.POST("/", middleware.RequirePermission(assetLocationCreate), h.Create)
	g.GET("/:id", middleware.RequirePermission(assetLocationRead), h.GetByID)
	g.PUT("/:id", middleware.RequirePermission(assetLocationUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(assetLocationDelete), h.Delete)
}
