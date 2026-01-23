package presentation

import (
	"github.com/gin-gonic/gin"
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/crm-healthcare/api/internal/core/middleware"
	productRepos "github.com/gilabs/crm-healthcare/api/internal/product/data/repositories"
	salesRepos "github.com/gilabs/crm-healthcare/api/internal/sales/data/repositories"
	"github.com/gilabs/crm-healthcare/api/internal/sales/domain/usecase"
	"github.com/gilabs/crm-healthcare/api/internal/sales/presentation/handler"
	"github.com/gilabs/crm-healthcare/api/internal/sales/presentation/router"
	"gorm.io/gorm"
)

// RegisterRoutes registers all sales routes
func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
}) {
	// Initialize repositories
	quotationRepo := salesRepos.NewSalesQuotationRepository(db)
	orderRepo := salesRepos.NewSalesOrderRepository(db)
	deliveryRepo := salesRepos.NewDeliveryOrderRepository(db)
	productRepo := productRepos.NewProductRepository(db)

	// Initialize usecases
	quotationUC := usecase.NewSalesQuotationUsecase(quotationRepo, productRepo)
	orderUC := usecase.NewSalesOrderUsecase(orderRepo, quotationRepo, productRepo)
	deliveryUC := usecase.NewDeliveryOrderUsecase(deliveryRepo, orderRepo, productRepo)

	// Initialize handlers
	quotationHandler := handler.NewSalesQuotationHandler(quotationUC)
	orderHandler := handler.NewSalesOrderHandler(orderUC)
	deliveryHandler := handler.NewDeliveryOrderHandler(deliveryUC)

	// Create sales group under API with auth middleware
	salesGroup := api.Group("/sales")
	salesGroup.Use(middleware.AuthMiddleware(jwtManager, permService))

	// Register routes
	router.RegisterSalesQuotationRoutes(salesGroup, quotationHandler)
	router.RegisterSalesOrderRoutes(salesGroup, orderHandler)
	router.RegisterDeliveryOrderRoutes(salesGroup, deliveryHandler)
}
