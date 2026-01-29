package presentation

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/inventory/data/models"
	"github.com/gilabs/gims/api/internal/inventory/data/repositories"
	"github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	"github.com/gilabs/gims/api/internal/inventory/presentation/handler"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(
	r *gin.Engine,
	v1 *gin.RouterGroup,
	db *gorm.DB,
	jwtManager *jwt.JWTManager,
	permissionService security.PermissionService,
) {
	// Auto Migrate
	db.AutoMigrate(&models.InventoryBatch{})

	// Repositories
	inventoryRepo := repositories.NewInventoryRepository(db)

	// Usecases
	inventoryUsecase := usecase.NewInventoryUsecase(inventoryRepo)

	// Handlers
	inventoryHandler := handler.NewInventoryHandler(inventoryUsecase)

	// Routes
	stock := v1.Group("/stock")
	stock.Use(middleware.AuthMiddleware(jwtManager, permissionService))
	{
		stock.GET("/inventory", middleware.PermissionMiddleware("inventory.read"), inventoryHandler.GetStockList)
		
		// Tree View Routes
		stock.GET("/tree/warehouses", middleware.PermissionMiddleware("inventory.read"), inventoryHandler.GetTreeWarehouses)
		stock.GET("/tree/products", middleware.PermissionMiddleware("inventory.read"), inventoryHandler.GetTreeProducts)
		stock.GET("/tree/batches", middleware.PermissionMiddleware("inventory.read"), inventoryHandler.GetTreeBatches)
	}
}
