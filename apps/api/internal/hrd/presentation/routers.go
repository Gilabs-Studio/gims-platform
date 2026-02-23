package presentation

import (
	coreRepos "github.com/gilabs/gims/api/internal/core/data/repositories"
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/hrd/data/repositories"
	"github.com/gilabs/gims/api/internal/hrd/domain/usecase"
	"github.com/gilabs/gims/api/internal/hrd/presentation/handler"
	"github.com/gilabs/gims/api/internal/hrd/presentation/router"
	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RegisterRoutes registers all HRD routes
func RegisterRoutes(r *gin.Engine, api *gin.RouterGroup, db *gorm.DB, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
	GetPermissionsWithScope(roleCode string) (map[string]string, error)
}) {
	// Initialize repositories
	workScheduleRepo := repositories.NewWorkScheduleRepository(db)
	holidayRepo := repositories.NewHolidayRepository(db)
	attendanceRepo := repositories.NewAttendanceRecordRepository(db)
	overtimeRepo := repositories.NewOvertimeRequestRepository(db)
	leaveRequestRepo := repositories.NewLeaveRequestRepository(db)
	assetRepo := repositories.NewEmployeeAssetRepository(db)
	evaluationGroupRepo := repositories.NewEvaluationGroupRepository(db)
	evaluationCriteriaRepo := repositories.NewEvaluationCriteriaRepository(db)
	employeeEvaluationRepo := repositories.NewEmployeeEvaluationRepository(db)
	recruitmentRepo := repositories.NewRecruitmentRequestRepository(db)

	// Core repositories
	leaveTypeRepo := coreRepos.NewLeaveTypeRepository(db)

	// Organization repositories
	employeeRepo := orgRepos.NewEmployeeRepository(db)
	divisionRepo := orgRepos.NewDivisionRepository(db)
	positionRepo := orgRepos.NewJobPositionRepository(db)

	// Initialize usecases
	workScheduleUC := usecase.NewWorkScheduleUsecase(workScheduleRepo)
	holidayUC := usecase.NewHolidayUsecase(holidayRepo)
	attendanceUC := usecase.NewAttendanceRecordUsecase(attendanceRepo, workScheduleRepo, holidayRepo, employeeRepo, divisionRepo)
	overtimeUC := usecase.NewOvertimeRequestUsecase(overtimeRepo, employeeRepo)
	leaveRequestUC := usecase.NewLeaveRequestUsecase(leaveRequestRepo, employeeRepo, leaveTypeRepo, holidayRepo)
	assetUC := usecase.NewEmployeeAssetUsecase(assetRepo, employeeRepo)
	evaluationGroupUC := usecase.NewEvaluationGroupUsecase(evaluationGroupRepo, evaluationCriteriaRepo)
	evaluationCriteriaUC := usecase.NewEvaluationCriteriaUsecase(evaluationCriteriaRepo, evaluationGroupRepo)
	employeeEvaluationUC := usecase.NewEmployeeEvaluationUsecase(employeeEvaluationRepo, evaluationGroupRepo, evaluationCriteriaRepo, employeeRepo)
	recruitmentUC := usecase.NewRecruitmentRequestUsecase(recruitmentRepo, employeeRepo, divisionRepo, positionRepo)

	// Initialize handlers
	workScheduleHandler := handler.NewWorkScheduleHandler(workScheduleUC)
	holidayHandler := handler.NewHolidayHandler(holidayUC)
	attendanceHandler := handler.NewAttendanceRecordHandler(attendanceUC)
	overtimeHandler := handler.NewOvertimeRequestHandler(overtimeUC)
	leaveRequestHandler := handler.NewLeaveRequestHandler(leaveRequestUC)
	assetHandler := handler.NewEmployeeAssetHandler(assetUC)
	evaluationGroupHandler := handler.NewEvaluationGroupHandler(evaluationGroupUC)
	evaluationCriteriaHandler := handler.NewEvaluationCriteriaHandler(evaluationCriteriaUC)
	employeeEvaluationHandler := handler.NewEmployeeEvaluationHandler(employeeEvaluationUC)
	recruitmentHandler := handler.NewRecruitmentRequestHandler(recruitmentUC)

	// Create HRD group under API with auth middleware
	hrdGroup := api.Group("/hrd")
	hrdGroup.Use(middleware.AuthMiddleware(jwtManager, permService))
	hrdGroup.Use(middleware.ScopeMiddleware(db))

	// Register routes
	router.RegisterWorkScheduleRoutes(hrdGroup, workScheduleHandler)
	router.RegisterHolidayRoutes(hrdGroup, holidayHandler)
	router.RegisterAttendanceRecordRoutes(hrdGroup, attendanceHandler)
	router.RegisterOvertimeRequestRoutes(hrdGroup, overtimeHandler)
	router.RegisterLeaveRequestRoutes(hrdGroup, leaveRequestHandler)
	router.SetupEmployeeAssetRoutes(hrdGroup, assetHandler)
	router.SetupEvaluationGroupRoutes(hrdGroup, evaluationGroupHandler)
	router.SetupEvaluationCriteriaRoutes(hrdGroup, evaluationCriteriaHandler)
	router.SetupEmployeeEvaluationRoutes(hrdGroup, employeeEvaluationHandler)
	router.SetupRecruitmentRequestRoutes(hrdGroup, recruitmentHandler)
}
