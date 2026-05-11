package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	crm "github.com/gilabs/gims/api/internal/crm/data/models"
	"gorm.io/gorm/clause"
)

// Deal UUIDs (prefix: da — hex-only)
const (
	DealID1 = "da000001-0000-0000-0000-000000000001"
	DealID2 = "da000001-0000-0000-0000-000000000002"
	DealID3 = "da000001-0000-0000-0000-000000000003"
	DealID4 = "da000001-0000-0000-0000-000000000004"

	// Deal History UUIDs (prefix: dc — hex-only, not conflicting with CRM seeder cc)
	DealHistoryID1 = "dc000001-0000-0000-0000-000000000001"
	DealHistoryID2 = "dc000001-0000-0000-0000-000000000002"
)

// SeedCRMDeals seeds sample CRM deals across pipeline stages
func SeedCRMDeals() error {
	log.Println("Seeding CRM deals...")

	// Local variables for pointer fields
	salesRep1 := SalesRep1EmployeeID
	salesRep2 := SalesRep2EmployeeID
	adminID := AdminEmployeeID
	customer1 := Customer1ID
	customer2 := Customer2ID
	customer3 := Customer3ID
	contact1 := ContactID1
	contact2 := ContactID2
	contact3 := ContactID3
	lead1 := LeadID1
	lead3 := LeadID3
	lead4 := LeadID4
	stageQualification := PipelineStageQualificationID
	stageNeedsAnalysis := PipelineStageNeedsAnalysisID
	stageDemo := PipelineStageDemoID
	stageNegotiation := PipelineStageNegotiationID
	stageClosedWon := PipelineStageClosedWonID

	now := time.Now()
	closeDate30 := now.Add(30 * 24 * time.Hour)
	closeDate60 := now.Add(60 * 24 * time.Hour)
	closeDate90 := now.Add(90 * 24 * time.Hour)
	actualClose := now.Add(-7 * 24 * time.Hour)

	deals := []crm.Deal{
		{
			ID:                DealID1,
			Code:              "DEAL-202501-00001",
			Title:             "Medical Supply Package for RS Harapan Kita",
			Description:       "Comprehensive medical supply package including consumables and equipment",
			CustomerID:        &customer2,
			ContactID:         &contact2,
			PipelineStageID:   stageQualification,
			Value:             75000000,
			Probability:       20,
			ExpectedCloseDate: &closeDate60,
			AssignedTo:        &salesRep1,
			LeadID:            &lead1,
			Status:            crm.DealStatusOpen,
			BudgetConfirmed:   true,
			AuthConfirmed:     false,
			NeedConfirmed:     true,
			TimeConfirmed:     false,
			Notes:             "Initial meeting scheduled, customer interested in bulk purchasing",
			CreatedBy:         &adminID,
		},
		{
			ID:                DealID2,
			Code:              "DEAL-202501-00002",
			Title:             "Lab Equipment Upgrade for PT Apotek Sehat",
			Description:       "Laboratory equipment upgrade and reagent supply agreement",
			CustomerID:        &customer1,
			ContactID:         &contact1,
			PipelineStageID:   stageNeedsAnalysis,
			Value:             120000000,
			Probability:       40,
			ExpectedCloseDate: &closeDate90,
			AssignedTo:        &salesRep1,
			LeadID:            &lead3,
			Status:            crm.DealStatusOpen,
			BudgetConfirmed:   true,
			AuthConfirmed:     true,
			AuthPerson:        "Dr. Susanto (Director)",
			NeedConfirmed:     true,
			TimeConfirmed:     false,
			Notes:             "Proposal sent, awaiting feedback",
			CreatedBy:         &adminID,
		},
		{
			ID:                DealID3,
			Code:              "DEAL-202501-00003",
			Title:             "Consumable Supply Contract for Klinik Pratama",
			Description:       "Annual consumable supply contract",
			CustomerID:        &customer3,
			ContactID:         &contact3,
			PipelineStageID:   stageDemo,
			Value:             45000000,
			Probability:       60,
			ExpectedCloseDate: &closeDate30,
			AssignedTo:        &salesRep2,
			LeadID:            &lead4,
			Status:            crm.DealStatusOpen,
			BudgetConfirmed:   true,
			AuthConfirmed:     true,
			NeedConfirmed:     true,
			TimeConfirmed:     true,
			Notes:             "Negotiating payment terms and delivery schedule",
			CreatedBy:         &adminID,
		},
		{
			ID:                DealID4,
			Code:              "DEAL-202501-00004",
			Title:             "Diagnostic Kit Bulk Order",
			Description:       "Bulk order of diagnostic kits for hospital network",
			CustomerID:        &customer2,
			ContactID:         &contact2,
			PipelineStageID:   stageClosedWon,
			Value:             200000000,
			Probability:       100,
			ExpectedCloseDate: &closeDate30,
			ActualCloseDate:   &actualClose,
			AssignedTo:        &salesRep2,
			Status:            crm.DealStatusWon,
			BudgetConfirmed:   true,
			AuthConfirmed:     true,
			NeedConfirmed:     true,
			TimeConfirmed:     true,
			Notes:             "Deal closed, PO received",
			CreatedBy:         &adminID,
		},
	}

	for _, deal := range deals {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"updated_at", "title", "value", "status", "lead_id", "pipeline_stage_id"}),
		}).Create(&deal).Error; err != nil {
			log.Printf("Warning: Failed to seed deal %s: %v", deal.ID, err)
		}
	}

	// Seed deal history for deals that have moved stages
	changedByAdmin := AdminEmployeeID
	changedBySales := SalesRep2EmployeeID
	historyTime1 := now.Add(-14 * 24 * time.Hour)
	historyTime2 := now.Add(-7 * 24 * time.Hour)

	histories := []crm.DealHistory{
		{
			ID:              DealHistoryID1,
			DealID:          DealID4,
			FromStageID:     &stageNegotiation,
			FromStageName:   "Negotiation",
			ToStageID:       stageClosedWon,
			ToStageName:     "Closed Won",
			FromProbability: 60,
			ToProbability:   100,
			DaysInPrevStage: 14,
			ChangedBy:       &changedBySales,
			ChangedAt:       historyTime2,
			Reason:          "Customer approved final terms and signed contract",
			Notes:           "PO#2025-001 received",
		},
		{
			ID:              DealHistoryID2,
			DealID:          DealID3,
			FromStageID:     &stageNeedsAnalysis,
			FromStageName:   "Needs Analysis",
			ToStageID:       stageDemo,
			ToStageName:     "Demo / Presentation",
			FromProbability: 30,
			ToProbability:   60,
			DaysInPrevStage: 7,
			ChangedBy:       &changedByAdmin,
			ChangedAt:       historyTime1,
			Reason:          "Customer requirements gathered, scheduling product demo",
		},
	}

	for _, h := range histories {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"changed_at"}),
		}).Create(&h).Error; err != nil {
			log.Printf("Warning: Failed to seed deal history %s: %v", h.ID, err)
		}
	}

	log.Println("CRM deals seeded successfully")
	return nil
}
