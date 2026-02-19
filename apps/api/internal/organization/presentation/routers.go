package presentation

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/gilabs/gims/api/internal/organization/domain/usecase"
	"github.com/gilabs/gims/api/internal/organization/presentation/handler"
	"github.com/gilabs/gims/api/internal/organization/presentation/router"
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
	companyRepo := repositories.NewCompanyRepository(db)
	employeeRepo := repositories.NewEmployeeRepository(db)
	employeeAreaRepo := repositories.NewEmployeeAreaRepository(db)

	// Initialize usecases
	divisionUC := usecase.NewDivisionUsecase(divisionRepo)
	jobPositionUC := usecase.NewJobPositionUsecase(jobPositionRepo)
	businessUnitUC := usecase.NewBusinessUnitUsecase(businessUnitRepo)
	businessTypeUC := usecase.NewBusinessTypeUsecase(businessTypeRepo)
	// Pass employeeAreaRepo so the usecase can manage supervisor/member assignments.
	areaUC := usecase.NewAreaUsecase(areaRepo, employeeAreaRepo)
	companyUC := usecase.NewCompanyUsecase(companyRepo)
	employeeUC := usecase.NewEmployeeUsecase(employeeRepo, employeeAreaRepo)

	// Initialize handlers
	divisionH := handler.NewDivisionHandler(divisionUC)
	jobPositionH := handler.NewJobPositionHandler(jobPositionUC)
	businessUnitH := handler.NewBusinessUnitHandler(businessUnitUC)
	businessTypeH := handler.NewBusinessTypeHandler(businessTypeUC)
	areaH := handler.NewAreaHandler(areaUC)
	companyH := handler.NewCompanyHandler(companyUC)
	employeeH := handler.NewEmployeeHandler(employeeUC)

	// Create organization group under API with auth middleware
	group := api.Group("/organization")
	group.Use(middleware.AuthMiddleware(jwtManager, permService))

	// Register routes
	router.RegisterDivisionRoutes(group, divisionH)
	router.RegisterJobPositionRoutes(group, jobPositionH)
	router.RegisterBusinessUnitRoutes(group, businessUnitH)
	router.RegisterBusinessTypeRoutes(group, businessTypeH)
	router.RegisterAreaRoutes(group, areaH)
	router.RegisterCompanyRoutes(group, companyH)
	router.RegisterEmployeeRoutes(group, employeeH)
}
