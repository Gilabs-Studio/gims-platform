package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/purchase/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	purchaseRequisitionRead = "purchase_requisition.read"
)

func RegisterPurchaseRequisitionRoutes(rg *gin.RouterGroup, h *handler.PurchaseRequisitionHandler) {
	g := rg.Group("/purchase-requisitions")
	{
		g.GET("", middleware.RequirePermission(purchaseRequisitionRead), h.List)
	}
}
