package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"gorm.io/gorm/clause"
)

// Recruitment Request IDs (Fixed UUIDs - MUST use hex-only chars 0-9, a-f)
const (
	RecruitmentSeniorDevID    = "ae000001-0000-0000-0000-000000000001"
	RecruitmentJuniorDevID    = "ae000001-0000-0000-0000-000000000002"
	RecruitmentSalesRepID     = "ae000001-0000-0000-0000-000000000003"
	RecruitmentHRAssistantID  = "ae000001-0000-0000-0000-000000000004"
	RecruitmentFinanceStaffID = "ae000001-0000-0000-0000-000000000005"
)

// SeedRecruitmentRequests seeds sample recruitment request data
func SeedRecruitmentRequests() error {
	log.Println("Seeding recruitment requests...")

	now := time.Now()
	oneMonthLater := now.AddDate(0, 1, 0)
	twoMonthsLater := now.AddDate(0, 2, 0)
	threeMonthsLater := now.AddDate(0, 3, 0)

	approvedAt := now.AddDate(0, 0, -5)
	rejectedAt := now.AddDate(0, 0, -3)

	salaryMin30 := 30000000.0
	salaryMax50 := 50000000.0
	salaryMin15 := 15000000.0
	salaryMax25 := 25000000.0
	salaryMin8 := 8000000.0
	salaryMax12 := 12000000.0
	salaryMin5 := 5000000.0
	salaryMax8 := 8000000.0
	salaryMin10 := 10000000.0
	salaryMax18 := 18000000.0

	approverID := AdminEmployeeID
	rejectionNote := "Budget constraints for this quarter. Please re-submit next quarter."

	// Local variables for pointer fields (Go can't take address of constants)
	managerID := ManagerEmployeeID
	adminID := AdminEmployeeID
	staffID := StaffEmployeeID

	requests := []models.RecruitmentRequest{
		{
			ID:                RecruitmentSeniorDevID,
			RequestCode:       "RR-202602-0001",
			RequestedByID:     ManagerEmployeeID,
			RequestDate:       now.AddDate(0, 0, -10),
			DivisionID:        ITDivisionID,
			PositionID:        StaffPositionID,
			RequiredCount:     2,
			FilledCount:       0,
			EmploymentType:    models.RecruitmentEmploymentFullTime,
			ExpectedStartDate: twoMonthsLater,
			SalaryRangeMin:    &salaryMin30,
			SalaryRangeMax:    &salaryMax50,
			JobDescription:    "Looking for experienced Senior Software Developer to join our engineering team. Responsibilities include designing and implementing scalable backend services, mentoring junior developers, and participating in architecture decisions.",
			Qualifications:    "- Minimum 5 years experience in Go or similar languages\n- Strong understanding of microservices architecture\n- Experience with PostgreSQL and Redis\n- Familiarity with Docker and Kubernetes\n- Bachelor's degree in Computer Science or related field",
			Priority:          models.RecruitmentPriorityHigh,
			Status:            models.RecruitmentStatusOpen,
			ApprovedByID:      &approverID,
			ApprovedAt:        &approvedAt,
			CreatedBy:         &managerID,
		},
		{
			ID:                RecruitmentJuniorDevID,
			RequestCode:       "RR-202602-0002",
			RequestedByID:     ManagerEmployeeID,
			RequestDate:       now.AddDate(0, 0, -7),
			DivisionID:        ITDivisionID,
			PositionID:        StaffPositionID,
			RequiredCount:     3,
			FilledCount:       1,
			EmploymentType:    models.RecruitmentEmploymentFullTime,
			ExpectedStartDate: threeMonthsLater,
			SalaryRangeMin:    &salaryMin15,
			SalaryRangeMax:    &salaryMax25,
			JobDescription:    "Seeking enthusiastic Junior Developer to join our growing team. Will work on frontend and backend development tasks under senior guidance.",
			Qualifications:    "- 0-2 years experience in web development\n- Knowledge of React, TypeScript, or Go is a plus\n- Strong willingness to learn\n- Bachelor's degree in CS or related field (fresh graduates welcome)",
			Priority:          models.RecruitmentPriorityMedium,
			Status:            models.RecruitmentStatusApproved,
			ApprovedByID:      &approverID,
			ApprovedAt:        &approvedAt,
			CreatedBy:         &managerID,
		},
		{
			ID:                RecruitmentSalesRepID,
			RequestCode:       "RR-202602-0003",
			RequestedByID:     AdminEmployeeID,
			RequestDate:       now.AddDate(0, 0, -14),
			DivisionID:        SalesDivisionID,
			PositionID:        SalesRepPositionID,
			RequiredCount:     5,
			FilledCount:       2,
			EmploymentType:    models.RecruitmentEmploymentFullTime,
			ExpectedStartDate: oneMonthLater,
			SalaryRangeMin:    &salaryMin8,
			SalaryRangeMax:    &salaryMax12,
			JobDescription:    "We need Sales Representatives to expand our market coverage in Jabodetabek. Will be responsible for prospecting new clients, managing client relationships, and achieving monthly sales targets.",
			Qualifications:    "- Minimum 1 year experience in B2B sales\n- Excellent communication and negotiation skills\n- Own vehicle and valid driver's license\n- Target-oriented mindset\n- Experience in ERP/software sales is a plus",
			Priority:          models.RecruitmentPriorityUrgent,
			Status:            models.RecruitmentStatusOpen,
			ApprovedByID:      &approverID,
			ApprovedAt:        &approvedAt,
			CreatedBy:         &adminID,
		},
		{
			ID:                RecruitmentHRAssistantID,
			RequestCode:       "RR-202602-0004",
			RequestedByID:     AdminEmployeeID,
			RequestDate:       now.AddDate(0, 0, -5),
			DivisionID:        HRDivisionID,
			PositionID:        StaffPositionID,
			RequiredCount:     1,
			FilledCount:       0,
			EmploymentType:    models.RecruitmentEmploymentIntern,
			ExpectedStartDate: twoMonthsLater,
			SalaryRangeMin:    &salaryMin5,
			SalaryRangeMax:    &salaryMax8,
			JobDescription:    "HR Intern position to assist with recruitment processes, employee data management, and administrative tasks.",
			Qualifications:    "- Currently pursuing or recently completed degree in HR Management, Psychology, or related field\n- Proficient in Microsoft Office\n- Good communication skills\n- Detail-oriented",
			Priority:          models.RecruitmentPriorityLow,
			Status:            models.RecruitmentStatusPending,
			CreatedBy:         &adminID,
		},
		{
			ID:                RecruitmentFinanceStaffID,
			RequestCode:       "RR-202602-0005",
			RequestedByID:     StaffEmployeeID,
			RequestDate:       now.AddDate(0, 0, -20),
			DivisionID:        FinanceDivisionID,
			PositionID:        StaffPositionID,
			RequiredCount:     1,
			FilledCount:       0,
			EmploymentType:    models.RecruitmentEmploymentContract,
			ExpectedStartDate: oneMonthLater,
			SalaryRangeMin:    &salaryMin10,
			SalaryRangeMax:    &salaryMax18,
			JobDescription:    "Finance Staff to handle accounts payable, receivable, and monthly closing processes.",
			Qualifications:    "- Degree in Accounting or Finance\n- Minimum 2 years experience in accounting\n- Familiar with accounting software\n- Strong analytical skills",
			Priority:          models.RecruitmentPriorityMedium,
			Status:            models.RecruitmentStatusRejected,
			RejectedByID:      &approverID,
			RejectedAt:        &rejectedAt,
			RejectionNotes:    &rejectionNote,
			CreatedBy:         &staffID,
		},
	}

	for _, req := range requests {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"request_code", "status", "filled_count", "priority", "updated_at"}),
		}).Create(&req).Error; err != nil {
			log.Printf("Warning: Failed to seed recruitment request %s: %v", req.RequestCode, err)
		}
	}

	log.Println("Recruitment requests seeded successfully")
	return nil
}
