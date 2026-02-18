package presentation

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	finUsecase "github.com/gilabs/gims/api/internal/finance/domain/usecase"
	invUsecase "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	"github.com/gilabs/gims/api/internal/purchase/data/repositories"
	"github.com/gilabs/gims/api/internal/purchase/domain/usecase"
	"github.com/gilabs/gims/api/internal/purchase/presentation/handler"
	"github.com/gilabs/gims/api/internal/purchase/presentation/router"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
}, invUC invUsecase.InventoryUsecase, journalUC finUsecase.JournalEntryUsecase, coaUC finUsecase.ChartOfAccountUsecase, assetUC finUsecase.AssetUsecase) {
	_ = r

	prRepo := repositories.NewPurchaseRequisitionRepository(db)
	poRepo := repositories.NewPurchaseOrderRepository(db)
	grRepo := repositories.NewGoodsReceiptRepository(db)
	siRepo := repositories.NewSupplierInvoiceRepository(db)
	payRepo := repositories.NewPurchasePaymentRepository(db)
	auditService := audit.NewAuditService(db)

	poUc := usecase.NewPurchaseOrderUsecase(db, poRepo, prRepo, auditService)
	poH := handler.NewPurchaseOrderHandler(poUc)

	prUc := usecase.NewPurchaseRequisitionUsecase(db, prRepo, auditService)
	prH := handler.NewPurchaseRequisitionHandler(prUc, poUc)

	grUc := usecase.NewGoodsReceiptUsecase(db, grRepo, poRepo, auditService, invUC, journalUC, coaUC, assetUC)
	grH := handler.NewGoodsReceiptHandler(grUc)

	siUc := usecase.NewSupplierInvoiceUsecase(db, siRepo, poRepo, auditService, journalUC, coaUC)
	siH := handler.NewSupplierInvoiceHandler(siUc)

	siDpUc := usecase.NewSupplierInvoiceDownPaymentUsecase(db, siRepo, poRepo, auditService)
	siDpH := handler.NewSupplierInvoiceDownPaymentHandler(siDpUc)

	payUc := usecase.NewPurchasePaymentUsecase(db, payRepo, siRepo, auditService, journalUC, coaUC)
	payH := handler.NewPurchasePaymentHandler(payUc)

	group := api.Group("/purchase")
	group.Use(middleware.AuthMiddleware(jwtManager, permService))

	router.RegisterPurchaseRequisitionRoutes(group, prH)
	router.RegisterPurchaseOrderRoutes(group, poH)
	router.RegisterGoodsReceiptRoutes(group, grH)
	router.RegisterSupplierInvoiceRoutes(group, siH)
	router.RegisterSupplierInvoiceDownPaymentRoutes(group, siDpH)
	router.RegisterPurchasePaymentRoutes(group, payH)
}
