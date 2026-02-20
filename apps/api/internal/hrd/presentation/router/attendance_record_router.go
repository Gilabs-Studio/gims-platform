package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/hrd/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterAttendanceRecordRoutes registers attendance record routes
func RegisterAttendanceRecordRoutes(rg *gin.RouterGroup, h *handler.AttendanceRecordHandler) {
	g := rg.Group("/attendance")

	// Employee self-service routes (no special permission needed beyond auth)
	g.GET("/today", h.GetTodayAttendance)
	g.POST("/clock-in", h.ClockIn)
	g.POST("/clock-out", h.ClockOut)
	g.GET("/my-stats", h.GetMonthlyStats)

	// Admin routes
	g.GET("/form-data", middleware.RequirePermission("attendance.read"), h.GetFormData)
	g.GET("", middleware.RequirePermission("attendance.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("attendance.read"), h.GetByID)
	g.POST("/manual", middleware.RequirePermission("attendance.create"), h.CreateManualEntry)
	g.PUT("/:id", middleware.RequirePermission("attendance.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("attendance.delete"), h.Delete)
}
