package presentation

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	finUsecase "github.com/gilabs/gims/api/internal/finance/domain/usecase"
	inventoryUsecase "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	"github.com/gilabs/gims/api/internal/finance/domain/accounting"
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
	QuotationUC       usecase.SalesQuotationUsecase
	OrderUC           usecase.SalesOrderUsecase
	DeliveryOrderUC   usecase.DeliveryOrderUsecase
	CustomerInvoiceUC usecase.CustomerInvoiceUsecase
	YearlyTargetUC    usecase.YearlyTargetUsecase
}

type PermissionService interface {
	GetPermissions(roleCode string) ([]string, error)
	GetPermissionsWithScope(roleCode string) (map[string]string, error)
}

type SalesRouteDeps struct {
	InventoryUC inventoryUsecase.InventoryUsecase
	JournalUC   finUsecase.JournalEntryUsecase
	CoaUC       finUsecase.ChartOfAccountUsecase
	Engine      accounting.AccountingEngine
}

// RegisterRoutes registers all sales routes and returns shared dependencies
func RegisterRoutes(
	r *gin.Engine,
	api *gin.RouterGroup,
	db *gorm.DB,
	jwtManager *jwt.JWTManager,
	permService PermissionService,
	deps SalesRouteDeps,
) *SalesDeps {
	// Initialize repositories
	quotationRepo := salesRepos.NewSalesQuotationRepository(db)
	orderRepo := salesRepos.NewSalesOrderRepository(db)
	deliveryRepo := salesRepos.NewDeliveryOrderRepository(db)
	invoiceRepo := salesRepos.NewCustomerInvoiceRepository(db)
	visitRepo := salesRepos.NewSalesVisitRepository(db)
	yearlyTargetRepo := salesRepos.NewYearlyTargetRepository(db)
	salesReturnRepo := salesRepos.NewSalesReturnRepository(db)
	productRepo := productRepos.NewProductRepository(db)
	employeeRepo := organizationRepos.NewEmployeeRepository(db)
	auditService := audit.NewAuditService(db)

	// Initialize usecases
	quotationUC := usecase.NewSalesQuotationUsecase(db, quotationRepo, productRepo, auditService)
	orderUC := usecase.NewSalesOrderUsecase(db, orderRepo, deliveryRepo, quotationRepo, productRepo, deps.InventoryUC, employeeRepo)
	deliveryUC := usecase.NewDeliveryOrderUsecase(db, deliveryRepo, orderRepo, productRepo, deps.InventoryUC, auditService)
	invoiceUC := usecase.NewCustomerInvoiceUsecase(db, invoiceRepo, productRepo, orderRepo, deps.JournalUC, deps.CoaUC, auditService, deps.Engine)
	invoiceDpUC := usecase.NewCustomerInvoiceDownPaymentUsecase(db, invoiceRepo, orderRepo, auditService, deps.JournalUC, deps.CoaUC, deps.Engine)
	visitUC := usecase.NewSalesVisitUsecase(visitRepo)
	yearlyTargetUC := usecase.NewYearlyTargetUsecase(db, yearlyTargetRepo, auditService)
	salesReturnUC := usecase.NewSalesReturnUsecase(db, salesReturnRepo, deps.InventoryUC, deps.JournalUC, deps.CoaUC, auditService, deps.Engine)

	// Sales Payment
	salesPaymentRepo := salesRepos.NewSalesPaymentRepository(db)
	salesPaymentUC := usecase.NewSalesPaymentUsecase(db, salesPaymentRepo, auditService, deps.JournalUC, deps.CoaUC, deps.Engine)

	// Receivables Recap
	recapRepo := salesRepos.NewReceivablesRecapRepository(db)
	recapUC := usecase.NewReceivablesRecapUsecase(recapRepo)

	// Initialize handlers
	quotationHandler := handler.NewSalesQuotationHandler(quotationUC)
	quotationPrintHandler := handler.NewSalesQuotationPrintHandler(quotationUC, db)
	orderHandler := handler.NewSalesOrderHandler(orderUC)
	orderPrintHandler := handler.NewSalesOrderPrintHandler(orderUC, db)
	deliveryHandler := handler.NewDeliveryOrderHandler(deliveryUC)
	invoiceHandler := handler.NewCustomerInvoiceHandler(invoiceUC)
	invoicePrintHandler := handler.NewCustomerInvoicePrintHandler(invoiceUC, db)
	invoiceDpHandler := handler.NewCustomerInvoiceDownPaymentHandler(invoiceDpUC)
	invoiceDpPrintHandler := handler.NewCustomerInvoiceDPPrintHandler(invoiceDpUC, db)
	visitHandler := handler.NewSalesVisitHandler(visitUC)
	yearlyTargetHandler := handler.NewYearlyTargetHandler(yearlyTargetUC)
	salesReturnHandler := handler.NewSalesReturnHandler(salesReturnUC)
	salesPaymentHandler := handler.NewSalesPaymentHandler(salesPaymentUC)
	salesPaymentPrintHandler := handler.NewSalesPaymentPrintHandler(salesPaymentUC, db)
	recapHandler := handler.NewReceivablesRecapHandler(recapUC)

	// Create sales group under API with auth middleware
	salesGroup := api.Group("/sales")
	salesGroup.Use(middleware.AuthMiddleware(jwtManager, permService))
	salesGroup.Use(middleware.ScopeMiddleware(db))

	// Register routes
	router.RegisterSalesQuotationRoutes(salesGroup, quotationHandler, quotationPrintHandler)
	router.RegisterSalesOrderRoutes(salesGroup, orderHandler, orderPrintHandler)
	router.RegisterDeliveryOrderRoutes(salesGroup, deliveryHandler)
	router.RegisterCustomerInvoiceRoutes(salesGroup, invoiceHandler, invoicePrintHandler)
	router.RegisterCustomerInvoiceDownPaymentRoutes(salesGroup, invoiceDpHandler, invoiceDpPrintHandler)
	router.RegisterSalesVisitRoutes(salesGroup, visitHandler)
	router.RegisterYearlyTargetRoutes(salesGroup, yearlyTargetHandler)
	router.RegisterSalesReturnRoutes(salesGroup, salesReturnHandler)
	router.RegisterSalesPaymentRoutes(salesGroup, salesPaymentHandler, salesPaymentPrintHandler)
	router.RegisterReceivablesRecapRoutes(salesGroup, recapHandler)

	return &SalesDeps{
		QuotationUC:       quotationUC,
		OrderUC:           orderUC,
		DeliveryOrderUC:   deliveryUC,
		CustomerInvoiceUC: invoiceUC,
		YearlyTargetUC:    yearlyTargetUC,
	}
}
