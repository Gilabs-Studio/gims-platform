package presentation

import (
	"github.com/gilabs/crm-healthcare/api/internal/core/data/repositories"
	"github.com/gilabs/crm-healthcare/api/internal/core/domain/usecase"
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/crm-healthcare/api/internal/core/middleware"
	"github.com/gilabs/crm-healthcare/api/internal/core/presentation/handler"
	"github.com/gilabs/crm-healthcare/api/internal/core/presentation/router"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RegisterMasterDataRoutes registers all core master data routes
func RegisterMasterDataRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
}) {
	// Initialize repositories
	paymentTermsRepo := repositories.NewPaymentTermsRepository(db)
	courierAgencyRepo := repositories.NewCourierAgencyRepository(db)
	soSourceRepo := repositories.NewSOSourceRepository(db)
	leaveTypeRepo := repositories.NewLeaveTypeRepository(db)

	// Initialize usecases
	paymentTermsUC := usecase.NewPaymentTermsUsecase(paymentTermsRepo)
	courierAgencyUC := usecase.NewCourierAgencyUsecase(courierAgencyRepo)
	soSourceUC := usecase.NewSOSourceUsecase(soSourceRepo)
	leaveTypeUC := usecase.NewLeaveTypeUsecase(leaveTypeRepo)

	// Initialize handlers
	paymentTermsH := handler.NewPaymentTermsHandler(paymentTermsUC)
	courierAgencyH := handler.NewCourierAgencyHandler(courierAgencyUC)
	soSourceH := handler.NewSOSourceHandler(soSourceUC)
	leaveTypeH := handler.NewLeaveTypeHandler(leaveTypeUC)

	// Create master-data group under API with auth middleware
	group := api.Group("/master-data")
	group.Use(middleware.AuthMiddleware(jwtManager, permService))

	// Register routes
	router.RegisterPaymentTermsRoutes(group, paymentTermsH)
	router.RegisterCourierAgencyRoutes(group, courierAgencyH)
	router.RegisterSOSourceRoutes(group, soSourceH)
	router.RegisterLeaveTypeRoutes(group, leaveTypeH)
}

