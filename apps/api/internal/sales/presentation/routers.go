package presentation

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	inventoryUsecase "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	organizationRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	productRepos "github.com/gilabs/gims/api/internal/product/data/repositories"
	salesRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/domain/usecase"
	"github.com/gilabs/gims/api/internal/sales/presentation/handler"
	"github.com/gilabs/gims/api/internal/sales/presentation/router"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SalesDeps holds exported Sales usecases for cross-module consumption
type SalesDeps struct {
	QuotationUC usecase.SalesQuotationUsecase
	OrderUC     usecase.SalesOrderUsecase
}

// RegisterRoutes registers all sales routes and returns shared dependencies
func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
	GetPermissionsWithScope(roleCode string) (map[string]string, error)
}, invUC inventoryUsecase.InventoryUsecase) *SalesDeps {
	// Initialize repositories
	quotationRepo := salesRepos.NewSalesQuotationRepository(db)
	estimationRepo := salesRepos.NewSalesEstimationRepository(db)
	orderRepo := salesRepos.NewSalesOrderRepository(db)
	deliveryRepo := salesRepos.NewDeliveryOrderRepository(db)
	invoiceRepo := salesRepos.NewCustomerInvoiceRepository(db)
	visitRepo := salesRepos.NewSalesVisitRepository(db)
	yearlyTargetRepo := salesRepos.NewYearlyTargetRepository(db)
	productRepo := productRepos.NewProductRepository(db)
	employeeRepo := organizationRepos.NewEmployeeRepository(db)

	// Initialize usecases
	quotationUC := usecase.NewSalesQuotationUsecase(quotationRepo, productRepo)
	estimationUC := usecase.NewSalesEstimationUsecase(estimationRepo, quotationRepo, productRepo)
	orderUC := usecase.NewSalesOrderUsecase(db, orderRepo, deliveryRepo, quotationRepo, productRepo, invUC, employeeRepo)
	deliveryUC := usecase.NewDeliveryOrderUsecase(db, deliveryRepo, orderRepo, productRepo, invUC)
	invoiceUC := usecase.NewCustomerInvoiceUsecase(db, invoiceRepo, productRepo)
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
	salesGroup.Use(middleware.ScopeMiddleware(db))

	// Register routes
	router.RegisterSalesQuotationRoutes(salesGroup, quotationHandler)
	router.RegisterSalesEstimationRoutes(salesGroup, estimationHandler)
	router.RegisterSalesOrderRoutes(salesGroup, orderHandler)
	router.RegisterDeliveryOrderRoutes(salesGroup, deliveryHandler)
	router.RegisterCustomerInvoiceRoutes(salesGroup, invoiceHandler)
	router.RegisterSalesVisitRoutes(salesGroup, visitHandler)
	router.RegisterYearlyTargetRoutes(salesGroup, yearlyTargetHandler)

	return &SalesDeps{
		QuotationUC: quotationUC,
		OrderUC:     orderUC,
	}
}

