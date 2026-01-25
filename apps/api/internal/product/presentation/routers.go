package presentation

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/product/data/repositories"
	"github.com/gilabs/gims/api/internal/product/domain/usecase"
	"github.com/gilabs/gims/api/internal/product/presentation/handler"
	"github.com/gilabs/gims/api/internal/product/presentation/router"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RegisterRoutes registers all product domain routes
func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
}) {
	// Initialize repositories
	categoryRepo := repositories.NewProductCategoryRepository(db)
	brandRepo := repositories.NewProductBrandRepository(db)
	segmentRepo := repositories.NewProductSegmentRepository(db)
	typeRepo := repositories.NewProductTypeRepository(db)
	uomRepo := repositories.NewUnitOfMeasureRepository(db)
	packagingRepo := repositories.NewPackagingRepository(db)
	procurementTypeRepo := repositories.NewProcurementTypeRepository(db)
	productRepo := repositories.NewProductRepository(db)

	// Initialize usecases
	categoryUC := usecase.NewProductCategoryUsecase(categoryRepo)
	brandUC := usecase.NewProductBrandUsecase(brandRepo)
	segmentUC := usecase.NewProductSegmentUsecase(segmentRepo)
	typeUC := usecase.NewProductTypeUsecase(typeRepo)
	uomUC := usecase.NewUnitOfMeasureUsecase(uomRepo)
	packagingUC := usecase.NewPackagingUsecase(packagingRepo)
	procurementTypeUC := usecase.NewProcurementTypeUsecase(procurementTypeRepo)
	productUC := usecase.NewProductUsecase(productRepo, categoryRepo)

	// Initialize handlers
	categoryH := handler.NewProductCategoryHandler(categoryUC)
	brandH := handler.NewProductBrandHandler(brandUC)
	segmentH := handler.NewProductSegmentHandler(segmentUC)
	typeH := handler.NewProductTypeHandler(typeUC)
	uomH := handler.NewUnitOfMeasureHandler(uomUC)
	packagingH := handler.NewPackagingHandler(packagingUC)
	procurementTypeH := handler.NewProcurementTypeHandler(procurementTypeUC)
	productH := handler.NewProductHandler(productUC)

	// Create product group under API with auth middleware
	group := api.Group("/product")
	group.Use(middleware.AuthMiddleware(jwtManager, permService))

	// Register routes
	router.RegisterProductCategoryRoutes(group, categoryH)
	router.RegisterProductBrandRoutes(group, brandH)
	router.RegisterProductSegmentRoutes(group, segmentH)
	router.RegisterProductTypeRoutes(group, typeH)
	router.RegisterUnitOfMeasureRoutes(group, uomH)
	router.RegisterPackagingRoutes(group, packagingH)
	router.RegisterProcurementTypeRoutes(group, procurementTypeH)
	router.RegisterProductRoutes(group, productH)
}
