package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	crm "github.com/gilabs/gims/api/internal/crm/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	"gorm.io/gorm/clause"
)

// Deal UUIDs (prefix: da — hex-only)
const (
	DealID1 = "da000001-0000-0000-0000-000000000001"
	DealID2 = "da000001-0000-0000-0000-000000000002"
	DealID3 = "da000001-0000-0000-0000-000000000003"
	DealID4 = "da000001-0000-0000-0000-000000000004"

	// Deal Product Item UUIDs (prefix: db — hex-only)
	DealItemID1 = "db000001-0000-0000-0000-000000000001"
	DealItemID2 = "db000001-0000-0000-0000-000000000002"
	DealItemID3 = "db000001-0000-0000-0000-000000000003"
	DealItemID4 = "db000001-0000-0000-0000-000000000004"
	DealItemID5 = "db000001-0000-0000-0000-000000000005"

	// Deal History UUIDs (prefix: dc — hex-only, not conflicting with CRM seeder cc)
	DealHistoryID1 = "dc000001-0000-0000-0000-000000000001"
	DealHistoryID2 = "dc000001-0000-0000-0000-000000000002"
)

// SeedCRMDeals seeds sample CRM deals across pipeline stages with product items
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

	// Fetch first few products from DB to use as product items
	var products []productModels.Product
	if err := database.DB.Limit(3).Find(&products).Error; err != nil {
		log.Printf("Warning: Could not fetch products for deal items: %v", err)
	}

	// Build product snapshots for items
	type productSnapshot struct {
		ID    string
		Name  string
		SKU   string
		Price float64
	}
	snapshots := make([]productSnapshot, 0, 3)
	for _, p := range products {
		snapshots = append(snapshots, productSnapshot{
			ID:    p.ID,
			Name:  p.Name,
			SKU:   p.Sku,
			Price: p.SellingPrice,
		})
	}

	// Fallback product snapshots when no products are seeded yet
	if len(snapshots) == 0 {
		snapshots = []productSnapshot{
			{ID: "", Name: "Medical Supply Kit A", SKU: "MSK-001", Price: 5000000},
			{ID: "", Name: "Laboratory Reagent B", SKU: "LRG-002", Price: 3500000},
			{ID: "", Name: "Diagnostic Equipment C", SKU: "DEQ-003", Price: 25000000},
		}
	}

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

	// Seed deal product items (only if we have product data)
	if len(snapshots) > 0 {
		items := []crm.DealProductItem{
			{
				ID:              DealItemID1,
				DealID:          DealID1,
				ProductID:       nilIfEmpty(snapshots[0].ID),
				ProductName:     snapshots[0].Name,
				ProductSKU:      snapshots[0].SKU,
				UnitPrice:       snapshots[0].Price,
				Quantity:        10,
				DiscountPercent: 5,
				DiscountAmount:  snapshots[0].Price * 10 * 0.05,
				Subtotal:        snapshots[0].Price * 10 * 0.95,
			},
			{
				ID:              DealItemID2,
				DealID:          DealID1,
				ProductID:       nilIfEmpty(snapshots[1%len(snapshots)].ID),
				ProductName:     snapshots[1%len(snapshots)].Name,
				ProductSKU:      snapshots[1%len(snapshots)].SKU,
				UnitPrice:       snapshots[1%len(snapshots)].Price,
				Quantity:        5,
				DiscountPercent: 0,
				DiscountAmount:  0,
				Subtotal:        snapshots[1%len(snapshots)].Price * 5,
			},
			{
				ID:              DealItemID3,
				DealID:          DealID2,
				ProductID:       nilIfEmpty(snapshots[2%len(snapshots)].ID),
				ProductName:     snapshots[2%len(snapshots)].Name,
				ProductSKU:      snapshots[2%len(snapshots)].SKU,
				UnitPrice:       snapshots[2%len(snapshots)].Price,
				Quantity:        3,
				DiscountPercent: 10,
				DiscountAmount:  snapshots[2%len(snapshots)].Price * 3 * 0.10,
				Subtotal:        snapshots[2%len(snapshots)].Price * 3 * 0.90,
			},
			{
				ID:              DealItemID4,
				DealID:          DealID3,
				ProductID:       nilIfEmpty(snapshots[0].ID),
				ProductName:     snapshots[0].Name,
				ProductSKU:      snapshots[0].SKU,
				UnitPrice:       snapshots[0].Price,
				Quantity:        8,
				DiscountPercent: 3,
				DiscountAmount:  snapshots[0].Price * 8 * 0.03,
				Subtotal:        snapshots[0].Price * 8 * 0.97,
			},
			{
				ID:              DealItemID5,
				DealID:          DealID4,
				ProductID:       nilIfEmpty(snapshots[2%len(snapshots)].ID),
				ProductName:     snapshots[2%len(snapshots)].Name,
				ProductSKU:      snapshots[2%len(snapshots)].SKU,
				UnitPrice:       snapshots[2%len(snapshots)].Price,
				Quantity:        8,
				DiscountPercent: 0,
				DiscountAmount:  0,
				Subtotal:        snapshots[2%len(snapshots)].Price * 8,
			},
		}

		for _, item := range items {
			if err := database.DB.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "id"}},
				DoUpdates: clause.AssignmentColumns([]string{"unit_price", "quantity", "subtotal"}),
			}).Create(&item).Error; err != nil {
				log.Printf("Warning: Failed to seed deal item %s: %v", item.ID, err)
			}
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

