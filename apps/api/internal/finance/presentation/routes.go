package presentation

import (
	"context"

	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/accounting"
	"github.com/gilabs/gims/api/internal/finance/domain/financesettings"
	"github.com/gilabs/gims/api/internal/finance/domain/mapper"
	"github.com/gilabs/gims/api/internal/finance/domain/service"
	"github.com/gilabs/gims/api/internal/finance/domain/usecase"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gilabs/gims/api/internal/finance/presentation/router"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type FinanceDeps struct {
	JournalUC    usecase.JournalEntryUsecase
	CoaUC        usecase.ChartOfAccountUsecase
	AssetUC      usecase.AssetUsecase
	PaymentUC    usecase.PaymentUsecase
	BudgetUC     usecase.BudgetUsecase
	CashBankUC   usecase.CashBankJournalUsecase
	TaxInvoiceUC usecase.TaxInvoiceUsecase
	SalaryUC     usecase.SalaryStructureUsecase
	SettingsUC   financesettings.SettingsService
	Engine       accounting.AccountingEngine
}

func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, auditService interface {
	Log(ctx context.Context, action string, targetID string, metadata map[string]interface{})
	LogWithReason(ctx context.Context, action string, targetID string, reason string, metadata map[string]interface{})
	LogWithChanges(ctx context.Context, action string, targetID string, metadata map[string]interface{}, changes interface{})
	LogWithChangesFull(ctx context.Context, action string, targetID string, reason string, metadata map[string]interface{}, changes interface{})
}, permService interface {
	GetPermissions(roleCode string) ([]string, error)
	GetPermissionsWithScope(roleCode string) (map[string]string, error)
}) *FinanceDeps {
	_ = r

	coaRepo := repositories.NewChartOfAccountRepository(db)
	journalRepo := repositories.NewJournalEntryRepository(db)
	paymentRepo := repositories.NewPaymentRepository(db)
	budgetRepo := repositories.NewBudgetRepository(db)
	cashBankRepo := repositories.NewCashBankJournalRepository(db)
	agingRepo := repositories.NewAgingReportRepository(db)
	assetCategoryRepo := repositories.NewAssetCategoryRepository(db)
	assetLocationRepo := repositories.NewAssetLocationRepository(db)
	assetRepo := repositories.NewAssetRepository(db)
	assetAttachmentRepo := repositories.NewAssetAttachmentRepository(db)
	assetAuditLogRepo := repositories.NewAssetAuditLogRepository(db)
	assetAssignmentRepo := repositories.NewAssetAssignmentRepository(db)
	financialClosingRepo := repositories.NewFinancialClosingRepository(db)
	accountingPeriodRepo := repositories.NewAccountingPeriodRepository(db)
	financialClosingSnapshotRepo := repositories.NewFinancialClosingSnapshotRepository(db)
	financialClosingLogRepo := repositories.NewFinancialClosingLogRepository(db)
	taxInvoiceRepo := repositories.NewTaxInvoiceRepository(db)
	nonTradePayableRepo := repositories.NewNonTradePayableRepository(db)
	salaryRepo := repositories.NewSalaryStructureRepository(db)
	reportRepo := repositories.NewFinanceReportRepository(db)
	valuationRunRepo := repositories.NewValuationRunRepository(db)

	coaMapper := mapper.NewChartOfAccountMapper()
	journalMapper := mapper.NewJournalEntryMapper(coaMapper)
	paymentMapper := mapper.NewPaymentMapper(coaMapper)
	budgetMapper := mapper.NewBudgetMapper(coaMapper)
	cashBankMapper := mapper.NewCashBankJournalMapper(coaMapper)
	_ = cashBankMapper
	assetCategoryMapper := mapper.NewAssetCategoryMapper()
	assetLocationMapper := mapper.NewAssetLocationMapper()
	assetMapper := mapper.NewAssetMapper(assetCategoryMapper, assetLocationMapper)
	financialClosingMapper := mapper.NewFinancialClosingMapper()
	taxInvoiceMapper := mapper.NewTaxInvoiceMapper()
	nonTradePayableMapper := mapper.NewNonTradePayableMapper()
	salaryMapper := mapper.NewSalaryStructureMapper()

	// Settings & Accounting Engine
	financeSettingRepo := repositories.NewFinanceSettingRepository(db)
	systemAccountMappingRepo := repositories.NewSystemAccountMappingRepository(db)
	settingsService := financesettings.NewSettingsService(financeSettingRepo, systemAccountMappingRepo)
	coaValidationSvc := service.NewCOAValidationService(financeSettingRepo)
	accountingEngine := accounting.NewAccountingEngine(settingsService, coaRepo, coaValidationSvc)

	journalUC := usecase.NewJournalEntryUsecase(db, coaRepo, journalRepo, journalMapper, auditService, settingsService)
	coaUC := usecase.NewChartOfAccountUsecase(db, coaRepo, coaMapper, journalUC)
	systemAccountMappingUC := usecase.NewSystemAccountMappingUsecase(systemAccountMappingRepo, coaUC, auditService)
	paymentUC := usecase.NewPaymentUsecase(db, coaRepo, paymentRepo, journalUC, paymentMapper)
	budgetUC := usecase.NewBudgetUsecase(db, coaRepo, budgetRepo, budgetMapper)
	cashBankUC := usecase.NewCashBankJournalUsecase(db, coaRepo, cashBankRepo, journalUC, cashBankMapper, settingsService, accountingEngine)
	agingUC := usecase.NewAgingReportUsecase(agingRepo)
	assetCategoryUC := usecase.NewAssetCategoryUsecase(db, coaRepo, assetCategoryRepo, assetCategoryMapper)
	assetLocationUC := usecase.NewAssetLocationUsecase(db, assetLocationRepo, assetLocationMapper)
	assetUC := usecase.NewAssetUsecase(db, coaRepo, assetCategoryRepo, assetLocationRepo, assetRepo, assetMapper, assetAttachmentRepo, assetAuditLogRepo, assetAssignmentRepo, journalUC)
	financialClosingUC := usecase.NewFinancialClosingUsecase(
		db,
		coaRepo,
		financialClosingRepo,
		accountingPeriodRepo,
		financialClosingSnapshotRepo,
		financialClosingLogRepo,
		journalUC,
		financialClosingMapper,
	)
	taxInvoiceUC := usecase.NewTaxInvoiceUsecase(db, taxInvoiceRepo, taxInvoiceMapper)
	nonTradePayableUC := usecase.NewNonTradePayableUsecase(db, coaRepo, nonTradePayableRepo, journalUC, nonTradePayableMapper, settingsService, accountingEngine)
	salaryUC := usecase.NewSalaryStructureUsecase(db, salaryRepo, salaryMapper)
	reportUC := usecase.NewFinanceReportUsecase(db, coaRepo, reportRepo)
	valuationRunUC := usecase.NewValuationRunUsecase(db, valuationRunRepo, journalUC, settingsService, accountingEngine)

	arapReconciliationUC := usecase.NewARAPReconciliationUsecase(db, agingRepo, coaRepo, settingsService, accountingEngine)

	// Reconciliation service for GL vs subledger validation
	reconciliationSvc := usecase.NewValuationReconciliationService(
		db,
		valuationRunRepo,
		coaRepo,
		accountingEngine,
		settingsService,
	)

	// Export service for audit-ready CSV/PDF generation
	exportSvc := service.NewValuationExportService(valuationRunRepo)

	settingsH := handler.NewFinanceSettingsHandler(settingsService)
	systemAccountMappingH := handler.NewSystemAccountMappingHandler(systemAccountMappingUC)
	coaH := handler.NewChartOfAccountHandler(coaUC)
	journalH := handler.NewJournalEntryHandler(journalUC, valuationRunUC, cashBankUC, reconciliationSvc, exportSvc)
	budgetH := handler.NewBudgetHandler(budgetUC)
	agingH := handler.NewAgingReportHandler(agingUC)
	assetCategoryH := handler.NewAssetCategoryHandler(assetCategoryUC)
	assetLocationH := handler.NewAssetLocationHandler(assetLocationUC)
	assetH := handler.NewAssetHandler(assetUC)
	financialClosingH := handler.NewFinancialClosingHandler(financialClosingUC)
	taxInvoiceH := handler.NewTaxInvoiceHandler(taxInvoiceUC)
	nonTradePayableH := handler.NewNonTradePayableHandler(nonTradePayableUC)
	reportH := handler.NewFinanceReportHandler(reportUC)
	arapReconciliationH := handler.NewARAPReconciliationHandler(arapReconciliationUC)

	group := api.Group("/finance")
	group.Use(middleware.AuthMiddleware(jwtManager, permService))
	group.Use(middleware.ScopeMiddleware(db))

	router.RegisterChartOfAccountRoutes(group, coaH)
	router.RegisterJournalEntryRoutes(group, journalH)
	router.RegisterBudgetRoutes(group, budgetH)
	router.RegisterFinanceAgingReportRoutes(group, agingH)
	router.RegisterAssetCategoryRoutes(group, assetCategoryH)
	router.RegisterAssetLocationRoutes(group, assetLocationH)
	router.RegisterAssetRoutes(group, assetH)
	router.RegisterFinancialClosingRoutes(group, financialClosingH)
	router.RegisterTaxInvoiceRoutes(group, taxInvoiceH)
	router.RegisterNonTradePayableRoutes(group, nonTradePayableH)
	router.RegisterFinanceReportExRoutes(group, reportH)
	router.RegisterARAPReconciliationRoutes(group, arapReconciliationH)
	router.RegisterFinanceSettingsRoutes(group, settingsH)
	router.RegisterSystemAccountMappingRoutes(group, systemAccountMappingH)
	router.RegisterLegacyFinanceRouteBridges(group)

	return &FinanceDeps{
		JournalUC:    journalUC,
		CoaUC:        coaUC,
		AssetUC:      assetUC,
		PaymentUC:    paymentUC,
		BudgetUC:     budgetUC,
		CashBankUC:   cashBankUC,
		TaxInvoiceUC: taxInvoiceUC,
		SalaryUC:     salaryUC,
		SettingsUC:   settingsService,
		Engine:       accountingEngine,
	}
}
