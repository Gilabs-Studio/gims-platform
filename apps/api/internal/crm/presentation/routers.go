package presentation

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/crm/data/repositories"
	"github.com/gilabs/gims/api/internal/crm/domain/usecase"
	"github.com/gilabs/gims/api/internal/crm/presentation/handler"
	"github.com/gilabs/gims/api/internal/crm/presentation/router"
	customerRepos "github.com/gilabs/gims/api/internal/customer/data/repositories"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RegisterRoutes registers all CRM domain routes
func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
	GetPermissionsWithScope(roleCode string) (map[string]string, error)
}) {
	// Initialize repositories
	pipelineStageRepo := repositories.NewPipelineStageRepository(db)
	leadSourceRepo := repositories.NewLeadSourceRepository(db)
	leadStatusRepo := repositories.NewLeadStatusRepository(db)
	contactRoleRepo := repositories.NewContactRoleRepository(db)
	activityTypeRepo := repositories.NewActivityTypeRepository(db)
	contactRepo := repositories.NewContactRepository(db)
	customerRepo := customerRepos.NewCustomerRepository(db)

	// Initialize usecases
	pipelineStageUC := usecase.NewPipelineStageUsecase(pipelineStageRepo)
	leadSourceUC := usecase.NewLeadSourceUsecase(leadSourceRepo)
	leadStatusUC := usecase.NewLeadStatusUsecase(leadStatusRepo)
	contactRoleUC := usecase.NewContactRoleUsecase(contactRoleRepo)
	activityTypeUC := usecase.NewActivityTypeUsecase(activityTypeRepo)
	contactUC := usecase.NewContactUsecase(contactRepo, contactRoleRepo, customerRepo)

	// Initialize handlers
	pipelineStageH := handler.NewPipelineStageHandler(pipelineStageUC)
	leadSourceH := handler.NewLeadSourceHandler(leadSourceUC)
	leadStatusH := handler.NewLeadStatusHandler(leadStatusUC)
	contactRoleH := handler.NewContactRoleHandler(contactRoleUC)
	activityTypeH := handler.NewActivityTypeHandler(activityTypeUC)
	contactH := handler.NewContactHandler(contactUC)

	// Create CRM group under API with auth middleware
	group := api.Group("/crm")
	group.Use(middleware.AuthMiddleware(jwtManager, permService))

	// Register routes
	router.RegisterPipelineStageRoutes(group, pipelineStageH)
	router.RegisterLeadSourceRoutes(group, leadSourceH)
	router.RegisterLeadStatusRoutes(group, leadStatusH)
	router.RegisterContactRoleRoutes(group, contactRoleH)
	router.RegisterActivityTypeRoutes(group, activityTypeH)
	router.RegisterContactRoutes(group, contactH)
}
