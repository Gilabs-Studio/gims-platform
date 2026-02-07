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
}) {
	// Initialize repositories
	workScheduleRepo := repositories.NewWorkScheduleRepository(db)
	holidayRepo := repositories.NewHolidayRepository(db)
	attendanceRepo := repositories.NewAttendanceRecordRepository(db)
	overtimeRepo := repositories.NewOvertimeRequestRepository(db)
	leaveRequestRepo := repositories.NewLeaveRequestRepository(db)
	employeeContractRepo := repositories.NewEmployeeContractRepository(db)
	educationHistoryRepo := repositories.NewEmployeeEducationHistoryRepository(db)
	certificationRepo := repositories.NewEmployeeCertificationRepository(db)

	// Core repositories
	leaveTypeRepo := coreRepos.NewLeaveTypeRepository(db)

	// Organization repositories
	employeeRepo := orgRepos.NewEmployeeRepository(db)

	// Initialize usecases
	workScheduleUC := usecase.NewWorkScheduleUsecase(workScheduleRepo)
	holidayUC := usecase.NewHolidayUsecase(holidayRepo)
	attendanceUC := usecase.NewAttendanceRecordUsecase(attendanceRepo, workScheduleRepo, holidayRepo)
	overtimeUC := usecase.NewOvertimeRequestUsecase(overtimeRepo)
	leaveRequestUC := usecase.NewLeaveRequestUsecase(leaveRequestRepo, employeeRepo, leaveTypeRepo, holidayRepo)
	employeeContractUC := usecase.NewEmployeeContractUsecase(employeeContractRepo, employeeRepo)
	educationHistoryUC := usecase.NewEmployeeEducationHistoryUsecase(educationHistoryRepo, employeeRepo)
	certificationUC := usecase.NewEmployeeCertificationUsecase(certificationRepo, employeeRepo)

	// Initialize handlers
	workScheduleHandler := handler.NewWorkScheduleHandler(workScheduleUC)
	holidayHandler := handler.NewHolidayHandler(holidayUC)
	attendanceHandler := handler.NewAttendanceRecordHandler(attendanceUC)
	overtimeHandler := handler.NewOvertimeRequestHandler(overtimeUC)
	leaveRequestHandler := handler.NewLeaveRequestHandler(leaveRequestUC)
	educationHistoryHandler := handler.NewEmployeeEducationHistoryHandler(educationHistoryUC)
	certificationHandler := handler.NewEmployeeCertificationHandler(certificationUC)
	employeeContractHandler := handler.NewEmployeeContractHandler(employeeContractUC)

	// Create HRD group under API with auth middleware
	hrdGroup := api.Group("/hrd")
	hrdGroup.Use(middleware.AuthMiddleware(jwtManager, permService))

	// Register routes
	router.RegisterWorkScheduleRoutes(hrdGroup, workScheduleHandler)
	router.RegisterHolidayRoutes(hrdGroup, holidayHandler)
	router.RegisterAttendanceRecordRoutes(hrdGroup, attendanceHandler)
	router.RegisterOvertimeRequestRoutes(hrdGroup, overtimeHandler)
	router.RegisterLeaveRequestRoutes(hrdGroup, leaveRequestHandler)
	router.RegisterEmployeeEducationHistoryRoutes(hrdGroup, educationHistoryHandler, middleware.AuthMiddleware(jwtManager, permService))
	router.SetupEmployeeCertificationRoutes(hrdGroup, certificationHandler, middleware.AuthMiddleware(jwtManager, permService))
	router.RegisterEmployeeContractRoutes(hrdGroup, employeeContractHandler, middleware.AuthMiddleware(jwtManager, permService))
}
