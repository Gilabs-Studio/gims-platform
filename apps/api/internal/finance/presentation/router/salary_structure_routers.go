package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	salaryRead    = "salary.read"
	salaryCreate  = "salary.create"
	salaryUpdate  = "salary.update"
	salaryDelete  = "salary.delete"
	salaryApprove = "salary.approve"
)

func RegisterSalaryStructureRoutes(r *gin.RouterGroup, h *handler.SalaryStructureHandler) {
	g := r.Group("/salary-structures")
	{
		g.GET("", middleware.RequirePermission(salaryRead), h.List)
		g.POST("", middleware.RequirePermission(salaryCreate), h.Create)
		g.GET("/:id", middleware.RequirePermission(salaryRead), h.GetByID)
		g.PUT("/:id", middleware.RequirePermission(salaryUpdate), h.Update)
		g.DELETE("/:id", middleware.RequirePermission(salaryDelete), h.Delete)
		g.POST("/:id/approve", middleware.RequirePermission(salaryApprove), h.Approve)
	}
}
