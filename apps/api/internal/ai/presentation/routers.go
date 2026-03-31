package presentation

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/gilabs/gims/api/internal/ai/data/repositories"
	"github.com/gilabs/gims/api/internal/ai/domain/mapper"
	"github.com/gilabs/gims/api/internal/ai/domain/usecase"
	"github.com/gilabs/gims/api/internal/ai/presentation/handler"
	"github.com/gilabs/gims/api/internal/ai/presentation/router"
	coreUsecase "github.com/gilabs/gims/api/internal/core/domain/usecase"
	"github.com/gilabs/gims/api/internal/core/infrastructure/cerebras"
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	financeUsecase "github.com/gilabs/gims/api/internal/finance/domain/usecase"

	hrdUsecase "github.com/gilabs/gims/api/internal/hrd/domain/usecase"
	inventoryUsecase "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	purchaseUsecase "github.com/gilabs/gims/api/internal/purchase/domain/usecase"
	salesUsecase "github.com/gilabs/gims/api/internal/sales/domain/usecase"
)

// AIDeps holds the resolved domain usecase dependencies for AI actions
type AIDeps struct {
	HolidayUC         hrdUsecase.HolidayUsecase
	LeaveRequestUC    hrdUsecase.LeaveRequestUsecase
	AttendanceUC      hrdUsecase.AttendanceRecordUsecase
	SalesQuotationUC  salesUsecase.SalesQuotationUsecase
	SalesOrderUC      salesUsecase.SalesOrderUsecase
	DeliveryOrderUC   salesUsecase.DeliveryOrderUsecase
	CustomerInvoiceUC salesUsecase.CustomerInvoiceUsecase
	YearlyTargetUC    salesUsecase.YearlyTargetUsecase
	InventoryUC       inventoryUsecase.InventoryUsecase
	PurchaseOrderUC   purchaseUsecase.PurchaseOrderUsecase
	PurchaseReqUC     purchaseUsecase.PurchaseRequisitionUsecase
	GoodsReceiptUC    purchaseUsecase.GoodsReceiptUsecase
	SupplierInvoiceUC purchaseUsecase.SupplierInvoiceUsecase
	CoaUC             financeUsecase.ChartOfAccountUsecase
	JournalUC         financeUsecase.JournalEntryUsecase
	FinancePaymentUC  financeUsecase.PaymentUsecase
	BudgetUC          financeUsecase.BudgetUsecase
	CashBankUC        financeUsecase.CashBankJournalUsecase
	TaxInvoiceUC      financeUsecase.TaxInvoiceUsecase
	AssetUC           financeUsecase.AssetUsecase
	SalaryUC          financeUsecase.SalaryStructureUsecase
	BankAccountUC     coreUsecase.BankAccountUsecase
}

// RegisterRoutes registers all AI assistant routes
func RegisterRoutes(
	_ *gin.Engine,
	api *gin.RouterGroup,
	db *gorm.DB,
	jwtManager *jwt.JWTManager,
	permService interface {
		GetPermissions(roleCode string) ([]string, error)
		GetPermissionsWithScope(roleCode string) (map[string]string, error)
	},
	cerebrasClient *cerebras.Client,
	deps *AIDeps,
) {
	// Initialize AI repositories
	sessionRepo := repositories.NewChatSessionRepository(db)
	messageRepo := repositories.NewChatMessageRepository(db)
	actionRepo := repositories.NewActionLogRepository(db)
	intentRepo := repositories.NewIntentRegistryRepository(db)

	// Initialize AI domain components
	chatMapper := mapper.NewChatMapper()
	intentResolver := usecase.NewIntentResolver(cerebrasClient, intentRepo)
	paramExtractor := usecase.NewParameterExtractor(cerebrasClient, intentRepo)
	permValidator := usecase.NewPermissionValidator(intentRepo)
	entityResolver := usecase.NewEntityResolver(db)
	requestValidator := usecase.NewRequestValidator(db, entityResolver)

	executorDeps := &usecase.ActionExecutorDeps{}
	if deps != nil {
		executorDeps.HolidayUsecase = deps.HolidayUC
		executorDeps.LeaveRequestUsecase = deps.LeaveRequestUC
		executorDeps.AttendanceUsecase = deps.AttendanceUC
		executorDeps.SalesQuotationUsecase = deps.SalesQuotationUC
		executorDeps.SalesOrderUsecase = deps.SalesOrderUC
		executorDeps.DeliveryOrderUsecase = deps.DeliveryOrderUC
		executorDeps.CustomerInvoiceUsecase = deps.CustomerInvoiceUC
		executorDeps.YearlyTargetUsecase = deps.YearlyTargetUC
		executorDeps.InventoryUsecase = deps.InventoryUC
		executorDeps.PurchaseOrderUsecase = deps.PurchaseOrderUC
		executorDeps.PurchaseRequisitionUsecase = deps.PurchaseReqUC
		executorDeps.GoodsReceiptUsecase = deps.GoodsReceiptUC
		executorDeps.SupplierInvoiceUsecase = deps.SupplierInvoiceUC
		executorDeps.CoaUsecase = deps.CoaUC
		executorDeps.JournalUsecase = deps.JournalUC
		executorDeps.FinancePaymentUsecase = deps.FinancePaymentUC
		executorDeps.BudgetUsecase = deps.BudgetUC
		executorDeps.CashBankUsecase = deps.CashBankUC
		executorDeps.TaxInvoiceUsecase = deps.TaxInvoiceUC
		executorDeps.AssetUsecase = deps.AssetUC
		executorDeps.SalaryUsecase = deps.SalaryUC
		executorDeps.BankAccountUsecase = deps.BankAccountUC
	}
	actionExecutor := usecase.NewActionExecutor(executorDeps, entityResolver)

	// Initialize usecase
	aiChatUC := usecase.NewAIChatUsecase(
		sessionRepo,
		messageRepo,
		actionRepo,
		intentRepo,
		cerebrasClient,
		chatMapper,
		intentResolver,
		paramExtractor,
		requestValidator,
		permValidator,
		entityResolver,
		actionExecutor,
	)

	// Initialize handlers
	chatHandler := handler.NewChatHandler(aiChatUC, cerebrasClient)
	sessionHandler := handler.NewSessionHandler(aiChatUC)
	adminHandler := handler.NewAdminHandler(aiChatUC)

	// Create AI group under API with auth middleware
	aiGroup := api.Group("/ai")
	aiGroup.Use(middleware.AuthMiddleware(jwtManager, permService))
	aiGroup.Use(middleware.ScopeMiddleware(db))

	// Register routes
	router.RegisterChatRoutes(aiGroup, chatHandler)
	router.RegisterSessionRoutes(aiGroup, sessionHandler)
	router.RegisterAdminRoutes(aiGroup, adminHandler)
}
