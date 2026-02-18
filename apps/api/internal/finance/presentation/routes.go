package presentation

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/mapper"
	"github.com/gilabs/gims/api/internal/finance/domain/usecase"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gilabs/gims/api/internal/finance/presentation/router"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type FinanceDeps struct {
	JournalUC usecase.JournalEntryUsecase
	CoaUC     usecase.ChartOfAccountUsecase
	AssetUC   usecase.AssetUsecase
}

func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
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
	financialClosingRepo := repositories.NewFinancialClosingRepository(db)
	taxInvoiceRepo := repositories.NewTaxInvoiceRepository(db)
	nonTradePayableRepo := repositories.NewNonTradePayableRepository(db)

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

	coaUC := usecase.NewChartOfAccountUsecase(db, coaRepo, coaMapper)
	journalUC := usecase.NewJournalEntryUsecase(db, coaRepo, journalRepo, journalMapper)
	paymentUC := usecase.NewPaymentUsecase(db, coaRepo, paymentRepo, paymentMapper)
	budgetUC := usecase.NewBudgetUsecase(db, coaRepo, budgetRepo, budgetMapper)
	cashBankUC := usecase.NewCashBankJournalUsecase(db, coaRepo, cashBankRepo, cashBankMapper)
	agingUC := usecase.NewAgingReportUsecase(agingRepo)
	assetCategoryUC := usecase.NewAssetCategoryUsecase(db, coaRepo, assetCategoryRepo, assetCategoryMapper)
	assetLocationUC := usecase.NewAssetLocationUsecase(db, assetLocationRepo, assetLocationMapper)
	assetUC := usecase.NewAssetUsecase(db, coaRepo, assetCategoryRepo, assetLocationRepo, assetRepo, assetMapper)
	financialClosingUC := usecase.NewFinancialClosingUsecase(db, financialClosingRepo, financialClosingMapper)
	taxInvoiceUC := usecase.NewTaxInvoiceUsecase(db, taxInvoiceRepo, taxInvoiceMapper)
	nonTradePayableUC := usecase.NewNonTradePayableUsecase(db, coaRepo, nonTradePayableRepo, nonTradePayableMapper)

	coaH := handler.NewChartOfAccountHandler(coaUC)
	journalH := handler.NewJournalEntryHandler(journalUC)
	paymentH := handler.NewPaymentHandler(paymentUC)
	budgetH := handler.NewBudgetHandler(budgetUC)
	cashBankH := handler.NewCashBankJournalHandler(cashBankUC)
	agingH := handler.NewAgingReportHandler(agingUC)
	assetCategoryH := handler.NewAssetCategoryHandler(assetCategoryUC)
	assetLocationH := handler.NewAssetLocationHandler(assetLocationUC)
	assetH := handler.NewAssetHandler(assetUC)
	financialClosingH := handler.NewFinancialClosingHandler(financialClosingUC)
	taxInvoiceH := handler.NewTaxInvoiceHandler(taxInvoiceUC)
	nonTradePayableH := handler.NewNonTradePayableHandler(nonTradePayableUC)

	group := api.Group("/finance")
	group.Use(middleware.AuthMiddleware(jwtManager, permService))

	router.RegisterChartOfAccountRoutes(group, coaH)
	router.RegisterJournalEntryRoutes(group, journalH)
	router.RegisterFinanceReportRoutes(group, journalH)
	router.RegisterPaymentRoutes(group, paymentH)
	router.RegisterBudgetRoutes(group, budgetH)
	router.RegisterCashBankJournalRoutes(group, cashBankH)
	router.RegisterFinanceAgingReportRoutes(group, agingH)
	router.RegisterAssetCategoryRoutes(group, assetCategoryH)
	router.RegisterAssetLocationRoutes(group, assetLocationH)
	router.RegisterAssetRoutes(group, assetH)
	router.RegisterFinancialClosingRoutes(group, financialClosingH)
	router.RegisterTaxInvoiceRoutes(group, taxInvoiceH)
	router.RegisterNonTradePayableRoutes(group, nonTradePayableH)

	return &FinanceDeps{
		JournalUC: journalUC,
		CoaUC:     coaUC,
		AssetUC:   assetUC,
	}
}
