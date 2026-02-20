package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm/clause"
)

// Employee Education History IDs (fixed UUIDs for consistency)
const (
	AdminBachelorID   = "ed111111-1111-1111-1111-111111111111"
	AdminMasterID     = "ed222222-2222-2222-2222-222222222222"
	ManagerBachelorID = "ed333333-3333-3333-3333-333333333333"
	ManagerMasterID   = "ed444444-4444-4444-4444-444444444444"
	StaffHighSchoolID = "ed555555-5555-5555-5555-555555555555"
	StaffDiplomaID    = "ed666666-6666-6666-6666-666666666666"
)

// SeedEmployeeEducationHistory seeds initial employee education history data
func SeedEmployeeEducationHistory() error {
	db := database.DB

	log.Println("Seeding employee education histories...")

	// Helper for nullable time
	timePtr := func(t time.Time) *time.Time {
		return &t
	}

	// Helper for nullable float32
	float32Ptr := func(f float32) *float32 {
		return &f
	}

	// Parse employee IDs
	adminEmpID, _ := uuid.Parse(AdminEmployeeID)
	managerEmpID, _ := uuid.Parse(ManagerEmployeeID)
	staffEmpID, _ := uuid.Parse(StaffEmployeeID)
	adminUserID, _ := uuid.Parse(AdminUserID)

	// Define employee education histories
	educations := []models.EmployeeEducationHistory{
		// Admin Employee - Bachelor (completed)
		{
			ID:           uuid.MustParse(AdminBachelorID),
			EmployeeID:   adminEmpID,
			Institution:  "University of Indonesia",
			Degree:       models.DegreeLevel("BACHELOR"),
			FieldOfStudy: "Computer Science",
			StartDate:    time.Date(2015, 9, 1, 0, 0, 0, 0, time.UTC),
			EndDate:      timePtr(time.Date(2019, 6, 30, 0, 0, 0, 0, time.UTC)),
			GPA:          float32Ptr(3.75),
			Description:  "Bachelor of Computer Science with focus on Software Engineering",
			DocumentPath: "/documents/education/admin_bachelor_2019.pdf",
			CreatedBy:    adminUserID,
			UpdatedBy:    nil,
		},
		// Admin Employee - Master (completed)
		{
			ID:           uuid.MustParse(AdminMasterID),
			EmployeeID:   adminEmpID,
			Institution:  "Stanford University",
			Degree:       models.DegreeLevel("MASTER"),
			FieldOfStudy: "Software Engineering",
			StartDate:    time.Date(2020, 9, 1, 0, 0, 0, 0, time.UTC),
			EndDate:      timePtr(time.Date(2022, 6, 30, 0, 0, 0, 0, time.UTC)),
			GPA:          float32Ptr(3.92),
			Description:  "Master of Science in Software Engineering with specialization in Distributed Systems",
			DocumentPath: "/documents/education/admin_master_2022.pdf",
			CreatedBy:    adminUserID,
			UpdatedBy:    nil,
		},
		// Manager Employee - Bachelor (completed)
		{
			ID:           uuid.MustParse(ManagerBachelorID),
			EmployeeID:   managerEmpID,
			Institution:  "Bandung Institute of Technology",
			Degree:       models.DegreeLevel("BACHELOR"),
			FieldOfStudy: "Industrial Engineering",
			StartDate:    time.Date(2012, 8, 1, 0, 0, 0, 0, time.UTC),
			EndDate:      timePtr(time.Date(2016, 7, 31, 0, 0, 0, 0, time.UTC)),
			GPA:          float32Ptr(3.65),
			Description:  "Bachelor of Industrial Engineering with focus on Operations Management",
			DocumentPath: "/documents/education/manager_bachelor_2016.pdf",
			CreatedBy:    adminUserID,
			UpdatedBy:    nil,
		},
		// Manager Employee - Master (ongoing)
		{
			ID:           uuid.MustParse(ManagerMasterID),
			EmployeeID:   managerEmpID,
			Institution:  "Institut Teknologi Bandung",
			Degree:       models.DegreeLevel("MASTER"),
			FieldOfStudy: "Business Administration",
			StartDate:    time.Date(2024, 8, 1, 0, 0, 0, 0, time.UTC),
			EndDate:      nil, // Still ongoing
			GPA:          nil, // No GPA yet
			Description:  "Currently pursuing Master in Business Administration (MBA) part-time",
			DocumentPath: "",
			CreatedBy:    adminUserID,
			UpdatedBy:    nil,
		},
		// Staff Employee - High School (completed)
		{
			ID:           uuid.MustParse(StaffHighSchoolID),
			EmployeeID:   staffEmpID,
			Institution:  "Jakarta State High School 8",
			Degree:       models.DegreeLevel("SENIOR_HIGH"),
			FieldOfStudy: "Science",
			StartDate:    time.Date(2016, 7, 1, 0, 0, 0, 0, time.UTC),
			EndDate:      timePtr(time.Date(2019, 6, 30, 0, 0, 0, 0, time.UTC)),
			GPA:          float32Ptr(3.50),
			Description:  "High School with Science major, participated in national science olympiad",
			DocumentPath: "/documents/education/staff_highschool_2019.pdf",
			CreatedBy:    adminUserID,
			UpdatedBy:    nil,
		},
		// Staff Employee - Diploma (completed)
		{
			ID:           uuid.MustParse(StaffDiplomaID),
			EmployeeID:   staffEmpID,
			Institution:  "Jakarta State Polytechnic",
			Degree:       models.DegreeLevel("DIPLOMA"),
			FieldOfStudy: "Accounting",
			StartDate:    time.Date(2019, 9, 1, 0, 0, 0, 0, time.UTC),
			EndDate:      timePtr(time.Date(2022, 6, 30, 0, 0, 0, 0, time.UTC)),
			GPA:          float32Ptr(3.45),
			Description:  "Diploma III in Accounting, graduated with honors",
			DocumentPath: "/documents/education/staff_diploma_2022.pdf",
			CreatedBy:    adminUserID,
			UpdatedBy:    nil,
		},
	}

	// Upsert education histories
	for _, education := range educations {
		result := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"employee_id", "institution", "degree", "field_of_study",
				"start_date", "end_date", "gpa", "description",
				"document_path", "updated_at",
			}),
		}).Create(&education)

		if result.Error != nil {
			log.Printf("Failed to seed education history %s: %v", education.ID, result.Error)
			return result.Error
		}
	}

	log.Printf("Successfully seeded %d education history records", len(educations))
	return nil
}
