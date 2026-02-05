package presentation

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/purchase/data/repositories"
	"github.com/gilabs/gims/api/internal/purchase/domain/usecase"
	"github.com/gilabs/gims/api/internal/purchase/presentation/handler"
	"github.com/gilabs/gims/api/internal/purchase/presentation/router"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
}) {
	_ = r

	repo := repositories.NewPurchaseRequisitionRepository(db)
	auditService := audit.NewAuditService(db)
	uc := usecase.NewPurchaseRequisitionUsecase(db, repo, auditService)
	h := handler.NewPurchaseRequisitionHandler(uc)

	group := api.Group("/purchase")
	group.Use(middleware.AuthMiddleware(jwtManager, permService))

	router.RegisterPurchaseRequisitionRoutes(group, h)
}
