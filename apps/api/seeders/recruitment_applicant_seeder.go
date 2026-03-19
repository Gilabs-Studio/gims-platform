package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"gorm.io/gorm/clause"
)

// Applicant Stage IDs (Fixed UUIDs for consistent seeding)
const (
	ApplicantStageNewID       = "af000001-0000-0000-0000-000000000001"
	ApplicantStageScreeningID = "af000001-0000-0000-0000-000000000002"
	ApplicantStageInterviewID = "af000001-0000-0000-0000-000000000003"
	ApplicantStageOfferID     = "af000001-0000-0000-0000-000000000004"
	ApplicantStageHiredID     = "af000001-0000-0000-0000-000000000005"
	ApplicantStageRejectedID  = "af000001-0000-0000-0000-000000000006"
)

// Applicant IDs (Fixed UUIDs)
const (
	// Applicants for RR-202602-0002 (Junior Dev - 1 applicant)
	ApplicantJuniorDev1ID = "b0000001-0000-0000-0000-000000000001"

	// Applicants for RR-202602-0003 (Sales Rep - 2 applicants)
	ApplicantSalesRep1ID = "b0000002-0000-0000-0000-000000000001"
	ApplicantSalesRep2ID = "b0000002-0000-0000-0000-000000000002"
)

// SeedApplicantStages seeds the default applicant pipeline stages
func SeedApplicantStages() error {
	log.Println("Seeding applicant stages...")

	stages := []models.ApplicantStage{
		{ID: ApplicantStageNewID, Name: "New", Color: "#6b7280", Order: 0, IsActive: true},
		{ID: ApplicantStageScreeningID, Name: "Screening", Color: "#3b82f6", Order: 1, IsActive: true},
		{ID: ApplicantStageInterviewID, Name: "Interview", Color: "#f59e0b", Order: 2, IsActive: true},
		{ID: ApplicantStageOfferID, Name: "Offer", Color: "#8b5cf6", Order: 3, IsActive: true},
		{ID: ApplicantStageHiredID, Name: "Hired", Color: "#22c55e", Order: 4, IsWon: true, IsActive: true},
		{ID: ApplicantStageRejectedID, Name: "Rejected", Color: "#ef4444", Order: 5, IsLost: true, IsActive: true},
	}

	for _, stage := range stages {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "color", "order", "is_won", "is_lost", "is_active"}),
		}).Create(&stage).Error; err != nil {
			log.Printf("Warning: Failed to seed applicant stage %s: %v", stage.Name, err)
		}
	}

	log.Println("Applicant stages seeded successfully")
	return nil
}

// SeedRecruitmentApplicants seeds sample applicants for recruitment requests
func SeedRecruitmentApplicants() error {
	log.Println("Seeding recruitment applicants...")

	now := time.Now()
	twoDaysAgo := now.AddDate(0, 0, -2)
	fiveDaysAgo := now.AddDate(0, 0, -5)
	oneWeekAgo := now.AddDate(0, 0, -7)

	adminID := AdminEmployeeID
	managerID := ManagerEmployeeID

	phone1 := "081234567890"
	phone2 := "082345678901"
	phone3 := "083456789012"

	resume1 := "https://example.com/resume1.pdf"
	resume2 := "https://example.com/resume2.pdf"
	resume3 := "https://example.com/resume3.pdf"

	rating4 := 4
	rating5 := 5

	notes1 := "Fresh graduate with strong React skills"
	notes2 := "Experienced sales professional with B2B background"
	notes3 := "Good communication skills, eager to learn"

	applicants := []models.RecruitmentApplicant{
		// RR-202602-0002 (Junior Dev) - 1 applicant in Screening stage
		{
			ID:                   ApplicantJuniorDev1ID,
			RecruitmentRequestID: RecruitmentJuniorDevID,
			StageID:              ApplicantStageScreeningID,
			FullName:             "Ahmad Rizky",
			Email:                "ahmad.rizky@email.com",
			Phone:                &phone1,
			ResumeURL:            &resume1,
			Source:               models.ApplicantSourceLinkedIn,
			AppliedAt:            fiveDaysAgo,
			LastActivityAt:       twoDaysAgo,
			Rating:               &rating4,
			Notes:                &notes1,
			CreatedBy:            &managerID,
		},
		// RR-202602-0003 (Sales Rep) - 2 applicants
		{
			ID:                   ApplicantSalesRep1ID,
			RecruitmentRequestID: RecruitmentSalesRepID,
			StageID:              ApplicantStageInterviewID,
			FullName:             "Budi Santoso",
			Email:                "budi.santoso@email.com",
			Phone:                &phone2,
			ResumeURL:            &resume2,
			Source:               models.ApplicantSourceJobStreet,
			AppliedAt:            oneWeekAgo,
			LastActivityAt:       now,
			Rating:               &rating5,
			Notes:                &notes2,
			CreatedBy:            &adminID,
		},
		{
			ID:                   ApplicantSalesRep2ID,
			RecruitmentRequestID: RecruitmentSalesRepID,
			StageID:              ApplicantStageNewID,
			FullName:             "Citra Dewi",
			Email:                "citra.dewi@email.com",
			Phone:                &phone3,
			ResumeURL:            &resume3,
			Source:               models.ApplicantSourceReferral,
			AppliedAt:            twoDaysAgo,
			LastActivityAt:       twoDaysAgo,
			Rating:               nil,
			Notes:                &notes3,
			CreatedBy:            &adminID,
		},
	}

	for _, applicant := range applicants {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"stage_id", "full_name", "email", "phone", "rating", "notes", "updated_at"}),
		}).Create(&applicant).Error; err != nil {
			log.Printf("Warning: Failed to seed applicant %s: %v", applicant.FullName, err)
		}
	}

	log.Println("Recruitment applicants seeded successfully")
	return nil
}
