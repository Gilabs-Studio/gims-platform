package presentation

import (
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/crm-healthcare/api/internal/core/middleware"
	"github.com/gilabs/crm-healthcare/api/internal/organization/data/repositories"
	"github.com/gilabs/crm-healthcare/api/internal/organization/domain/usecase"
	"github.com/gilabs/crm-healthcare/api/internal/organization/presentation/handler"
	"github.com/gilabs/crm-healthcare/api/internal/organization/presentation/router"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RegisterRoutes registers all organization domain routes
func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
}) {
	// Initialize repositories
	divisionRepo := repositories.NewDivisionRepository(db)
	jobPositionRepo := repositories.NewJobPositionRepository(db)
	businessUnitRepo := repositories.NewBusinessUnitRepository(db)
	businessTypeRepo := repositories.NewBusinessTypeRepository(db)
	areaRepo := repositories.NewAreaRepository(db)
	areaSupervisorRepo := repositories.NewAreaSupervisorRepository(db)
	companyRepo := repositories.NewCompanyRepository(db)

	// Initialize usecases
	divisionUC := usecase.NewDivisionUsecase(divisionRepo)
	jobPositionUC := usecase.NewJobPositionUsecase(jobPositionRepo)
	businessUnitUC := usecase.NewBusinessUnitUsecase(businessUnitRepo)
	businessTypeUC := usecase.NewBusinessTypeUsecase(businessTypeRepo)
	areaUC := usecase.NewAreaUsecase(areaRepo)
	areaSupervisorUC := usecase.NewAreaSupervisorUsecase(areaSupervisorRepo, areaRepo)
	companyUC := usecase.NewCompanyUsecase(companyRepo)

	// Initialize handlers
	divisionH := handler.NewDivisionHandler(divisionUC)
	jobPositionH := handler.NewJobPositionHandler(jobPositionUC)
	businessUnitH := handler.NewBusinessUnitHandler(businessUnitUC)
	businessTypeH := handler.NewBusinessTypeHandler(businessTypeUC)
	areaH := handler.NewAreaHandler(areaUC)
	areaSupervisorH := handler.NewAreaSupervisorHandler(areaSupervisorUC)
	companyH := handler.NewCompanyHandler(companyUC)

	// Create organization group under API
	group := api.Group("/organization")
	group.Use(middleware.AuthMiddleware(jwtManager, permService))

	// Register routes
	router.RegisterDivisionRoutes(group, divisionH)
	router.RegisterJobPositionRoutes(group, jobPositionH)
	router.RegisterBusinessUnitRoutes(group, businessUnitH)
	router.RegisterBusinessTypeRoutes(group, businessTypeH)
	router.RegisterAreaRoutes(group, areaH)
	router.RegisterAreaSupervisorRoutes(group, areaSupervisorH)
	router.RegisterCompanyRoutes(group, companyH)
}
