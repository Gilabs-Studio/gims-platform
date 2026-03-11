package presentation

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/general/data/repositories"
	"github.com/gilabs/gims/api/internal/general/domain/usecase"
	"github.com/gilabs/gims/api/internal/general/presentation/handler"
	"github.com/gilabs/gims/api/internal/general/presentation/router"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RegisterRoutes registers all general domain routes
func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
	GetPermissionsWithScope(roleCode string) (map[string]string, error)
}) {
	// Initialize repositories
	dashboardRepo := repositories.NewDashboardRepository(db)
	layoutRepo := repositories.NewDashboardLayoutRepository(db)

	// Initialize usecase
	dashboardUC := usecase.NewDashboardUsecase(dashboardRepo, layoutRepo)

	// Initialize handler
	dashboardHandler := handler.NewDashboardHandler(dashboardUC)

	// Create group with auth middleware
	group := api.Group("/general")
	group.Use(middleware.AuthMiddleware(jwtManager, permService))

	// Register routes
	router.RegisterDashboardRoutes(group, dashboardHandler)
}
