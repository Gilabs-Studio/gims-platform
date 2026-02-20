package presentation

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/gilabs/gims/api/internal/ai/data/repositories"
	"github.com/gilabs/gims/api/internal/ai/domain/mapper"
	"github.com/gilabs/gims/api/internal/ai/domain/usecase"
	"github.com/gilabs/gims/api/internal/ai/presentation/handler"
	"github.com/gilabs/gims/api/internal/ai/presentation/router"
	"github.com/gilabs/gims/api/internal/core/infrastructure/cerebras"
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"

	hrdUsecase "github.com/gilabs/gims/api/internal/hrd/domain/usecase"
	inventoryUsecase "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	salesUsecase "github.com/gilabs/gims/api/internal/sales/domain/usecase"
)

// AIDeps holds the resolved domain usecase dependencies for AI actions
type AIDeps struct {
	HolidayUC        hrdUsecase.HolidayUsecase
	LeaveRequestUC   hrdUsecase.LeaveRequestUsecase
	AttendanceUC     hrdUsecase.AttendanceRecordUsecase
	SalesQuotationUC salesUsecase.SalesQuotationUsecase
	SalesOrderUC     salesUsecase.SalesOrderUsecase
	InventoryUC      inventoryUsecase.InventoryUsecase
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
		executorDeps.InventoryUsecase = deps.InventoryUC
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
