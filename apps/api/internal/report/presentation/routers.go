package presentation

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/report/data/repositories"
	"github.com/gilabs/gims/api/internal/report/domain/usecase"
	"github.com/gilabs/gims/api/internal/report/presentation/handler"
	"github.com/gilabs/gims/api/internal/report/presentation/router"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RegisterRoutes registers all report routes
func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
	GetPermissionsWithScope(roleCode string) (map[string]string, error)
}) {
	// Initialize repositories
	salesOverviewRepo := repositories.NewSalesOverviewRepository(db)

	// Initialize usecases
	salesOverviewUC := usecase.NewSalesOverviewUsecase(salesOverviewRepo)

	// Initialize handlers
	salesOverviewHandler := handler.NewSalesOverviewHandler(salesOverviewUC)

	// Create reports group under API with auth middleware
	reportGroup := api.Group("/reports")
	reportGroup.Use(middleware.AuthMiddleware(jwtManager, permService))
	reportGroup.Use(middleware.ScopeMiddleware(db))

	// Register routes
	router.RegisterSalesOverviewRoutes(reportGroup, salesOverviewHandler)
}
