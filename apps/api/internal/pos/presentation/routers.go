package presentation

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	orgRepo "github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/usecase"
	"github.com/gilabs/gims/api/internal/pos/presentation/handler"
	"github.com/gilabs/gims/api/internal/pos/presentation/router"
)

// RegisterRoutes registers all POS domain routes
func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
	GetPermissionsWithScope(roleCode string) (map[string]string, error)
}) {
	// Initialize repositories
	floorPlanRepo := repositories.NewFloorPlanRepository(db)
	companyRepo := orgRepo.NewCompanyRepository(db)

	// Initialize usecase
	floorPlanUC := usecase.NewFloorPlanUsecase(floorPlanRepo, companyRepo)

	// Initialize handler
	floorPlanHandler := handler.NewFloorPlanHandler(floorPlanUC)

	// Create group with auth middleware
	group := api.Group("/pos")
	group.Use(middleware.AuthMiddleware(jwtManager, permService))

	// Register routes
	router.RegisterFloorPlanRoutes(group, floorPlanHandler)
}
