package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	paymentRead    = "payment.read"
	paymentCreate  = "payment.create"
	paymentUpdate  = "payment.update"
	paymentDelete  = "payment.delete"
	paymentApprove = "payment.approve"
)

func RegisterPaymentRoutes(r *gin.RouterGroup, h *handler.PaymentHandler) {
	g := r.Group("/payments")
	g.GET("", middleware.RequirePermission(paymentRead), h.List)
	g.GET("/", middleware.RequirePermission(paymentRead), h.List)
	g.POST("", middleware.RequirePermission(paymentCreate), h.Create)
	g.POST("/", middleware.RequirePermission(paymentCreate), h.Create)
	g.GET("/:id", middleware.RequirePermission(paymentRead), h.GetByID)
	g.PUT("/:id", middleware.RequirePermission(paymentUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(paymentDelete), h.Delete)
	g.POST("/:id/approve", middleware.RequirePermission(paymentApprove), h.Approve)
}
