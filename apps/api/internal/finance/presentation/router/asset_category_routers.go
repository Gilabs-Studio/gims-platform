package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	assetCategoryRead   = "asset.read"
	assetCategoryCreate = "asset.create"
	assetCategoryUpdate = "asset.update"
	assetCategoryDelete = "asset.delete"
)

func RegisterAssetCategoryRoutes(r *gin.RouterGroup, h *handler.AssetCategoryHandler) {
	g := r.Group("/asset-categories")
	g.GET("", middleware.RequirePermission(assetCategoryRead), h.List)
	g.GET("/", middleware.RequirePermission(assetCategoryRead), h.List)
	g.POST("", middleware.RequirePermission(assetCategoryCreate), h.Create)
	g.POST("/", middleware.RequirePermission(assetCategoryCreate), h.Create)
	g.GET("/:id", middleware.RequirePermission(assetCategoryRead), h.GetByID)
	g.PUT("/:id", middleware.RequirePermission(assetCategoryUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(assetCategoryDelete), h.Delete)
}
