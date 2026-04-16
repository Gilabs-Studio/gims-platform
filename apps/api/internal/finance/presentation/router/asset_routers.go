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
	registerAssetRoutesInGroup(r.Group("/assets"), h)
	registerAssetRoutesInGroup(r.Group("/fixed-assets/assets"), h)
}

func registerAssetRoutesInGroup(g *gin.RouterGroup, h *handler.AssetHandler) {
	g.GET("", middleware.RequirePermission(assetRead), h.List)
	g.GET("/", middleware.RequirePermission(assetRead), h.List)
	// Available assets for employee borrowing
	g.GET("/available", middleware.RequirePermission(assetRead), h.GetAvailableAssets)
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

	// Phase 2: Attachments
	g.GET("/:id/attachments", middleware.RequirePermission(assetRead), h.ListAttachments)
	g.POST("/:id/attachments", middleware.RequirePermission(assetUpdate), h.CreateAttachment)
	g.DELETE("/:id/attachments/:attachment_id", middleware.RequirePermission(assetDelete), h.DeleteAttachment)

	// Phase 2: Assignments
	g.POST("/:id/assign", middleware.RequirePermission(assetUpdate), h.AssignAsset)
	g.POST("/:id/return", middleware.RequirePermission(assetUpdate), h.ReturnAsset)

	// Phase 2: Audit Logs & Assignment History
	g.GET("/:id/audit-logs", middleware.RequirePermission(assetRead), h.ListAuditLogs)
	g.GET("/:id/assignment-history", middleware.RequirePermission(assetRead), h.ListAssignmentHistory)
}
