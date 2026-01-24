package presentation

import (
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/crm-healthcare/api/internal/core/middleware"
	productRepos "github.com/gilabs/crm-healthcare/api/internal/product/data/repositories"
	salesRepos "github.com/gilabs/crm-healthcare/api/internal/sales/data/repositories"
	"github.com/gilabs/crm-healthcare/api/internal/sales/domain/usecase"
	"github.com/gilabs/crm-healthcare/api/internal/sales/presentation/handler"
	"github.com/gilabs/crm-healthcare/api/internal/sales/presentation/router"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RegisterRoutes registers all sales routes
func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
}) {
	// Initialize repositories
	quotationRepo := salesRepos.NewSalesQuotationRepository(db)
	estimationRepo := salesRepos.NewSalesEstimationRepository(db)
	orderRepo := salesRepos.NewSalesOrderRepository(db)
	deliveryRepo := salesRepos.NewDeliveryOrderRepository(db)
	invoiceRepo := salesRepos.NewCustomerInvoiceRepository(db)
	visitRepo := salesRepos.NewSalesVisitRepository(db)
	yearlyTargetRepo := salesRepos.NewYearlyTargetRepository(db)
	productRepo := productRepos.NewProductRepository(db)

	// Initialize usecases
	quotationUC := usecase.NewSalesQuotationUsecase(quotationRepo, productRepo)
	estimationUC := usecase.NewSalesEstimationUsecase(estimationRepo, quotationRepo, productRepo)
	orderUC := usecase.NewSalesOrderUsecase(orderRepo, quotationRepo, productRepo)
	deliveryUC := usecase.NewDeliveryOrderUsecase(deliveryRepo, orderRepo, productRepo)
	invoiceUC := usecase.NewCustomerInvoiceUsecase(invoiceRepo, productRepo)
	visitUC := usecase.NewSalesVisitUsecase(visitRepo)
	yearlyTargetUC := usecase.NewYearlyTargetUsecase(yearlyTargetRepo)

	// Initialize handlers
	quotationHandler := handler.NewSalesQuotationHandler(quotationUC)
	estimationHandler := handler.NewSalesEstimationHandler(estimationUC)
	orderHandler := handler.NewSalesOrderHandler(orderUC)
	deliveryHandler := handler.NewDeliveryOrderHandler(deliveryUC)
	invoiceHandler := handler.NewCustomerInvoiceHandler(invoiceUC)
	visitHandler := handler.NewSalesVisitHandler(visitUC)
	yearlyTargetHandler := handler.NewYearlyTargetHandler(yearlyTargetUC)

	// Create sales group under API with auth middleware
	salesGroup := api.Group("/sales")
	salesGroup.Use(middleware.AuthMiddleware(jwtManager, permService))

	// Register routes
	router.RegisterSalesQuotationRoutes(salesGroup, quotationHandler)
	router.RegisterSalesEstimationRoutes(salesGroup, estimationHandler)
	router.RegisterSalesOrderRoutes(salesGroup, orderHandler)
	router.RegisterDeliveryOrderRoutes(salesGroup, deliveryHandler)
	router.RegisterCustomerInvoiceRoutes(salesGroup, invoiceHandler)
	router.RegisterSalesVisitRoutes(salesGroup, visitHandler)
	router.RegisterYearlyTargetRoutes(salesGroup, yearlyTargetHandler)
}

