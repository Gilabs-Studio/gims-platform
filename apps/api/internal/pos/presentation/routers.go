package presentation

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	coreRepos "github.com/gilabs/gims/api/internal/core/data/repositories"
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	invDataRepos "github.com/gilabs/gims/api/internal/inventory/data/repositories"
	invUsecase "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	orgRepo "github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/usecase"
	"github.com/gilabs/gims/api/internal/pos/presentation/handler"
	"github.com/gilabs/gims/api/internal/pos/presentation/router"
	salesRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
)

// RegisterRoutes registers all POS domain routes under /api/v1/pos.
func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
	GetPermissionsWithScope(roleCode string) (map[string]string, error)
}) {
	// ─── Repositories ────────────────────────────────────────────────────────

	floorPlanRepo := repositories.NewFloorPlanRepository(db)
	orderRepo := repositories.NewPosOrderRepository(db)
	productRepo := repositories.NewPOSProductRepository(db)
	paymentRepo := repositories.NewPOSPaymentRepository(db)
	configRepo := repositories.NewPOSConfigRepository(db)
	midtransRepo := repositories.NewMidtransConfigRepository(db)
	bankAccountRepo := coreRepos.NewBankAccountRepository(db)

	outletRepo := orgRepo.NewOutletRepository(db)
	salesOrderRepo := salesRepos.NewSalesOrderRepository(db)
	invoiceRepo := salesRepos.NewCustomerInvoiceRepository(db)
	salesPaymentRepo := salesRepos.NewSalesPaymentRepository(db)

	invRepo := invDataRepos.NewInventoryRepository(db)
	recipeService := invUsecase.NewRecipeConsumptionService(db, invRepo)

	// ─── Usecases ────────────────────────────────────────────────────────────

	floorPlanUC := usecase.NewFloorPlanUsecase(floorPlanRepo, outletRepo)
	orderUC := usecase.NewPOSOrderUsecase(db, orderRepo, outletRepo, productRepo, recipeService)
	paymentUC := usecase.NewPOSPaymentUsecase(paymentRepo, orderRepo, configRepo, midtransRepo, orderUC, salesOrderRepo, invoiceRepo, salesPaymentRepo, bankAccountRepo)
	configUC := usecase.NewPOSConfigUsecase(configRepo)
	midtransUC := usecase.NewMidtransConfigUsecase(midtransRepo)

	// ─── Handlers ────────────────────────────────────────────────────────────

	floorPlanH := handler.NewFloorPlanHandler(floorPlanUC)
	orderH := handler.NewPOSOrderHandler(orderUC)
	receiptH := handler.NewPOSReceiptHandler(orderUC, paymentRepo, configRepo, outletRepo)
	paymentH := handler.NewPOSPaymentHandler(paymentUC)
	configH := handler.NewPOSConfigHandler(configUC)
	midtransH := handler.NewMidtransConfigHandler(midtransUC)

	// ─── Route group ─────────────────────────────────────────────────────────

	group := api.Group("/pos")
	group.Use(middleware.AuthMiddleware(jwtManager, permService))

	router.RegisterFloorPlanRoutes(group, floorPlanH)
	router.RegisterPOSOrderRoutes(group, orderH, receiptH)
	router.RegisterPOSPaymentRoutes(group, paymentH)
	router.RegisterPOSConfigRoutes(group, configH)
	router.RegisterMidtransConfigRoutes(group, midtransH)

	// Midtrans webhook is unauthenticated (signature verified inside the handler)
	r.POST("/api/v1/pos/payments/midtrans/webhook", paymentH.MidtransWebhook)
}
