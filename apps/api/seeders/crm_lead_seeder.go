package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	crm "github.com/gilabs/gims/api/internal/crm/data/models"
	"gorm.io/gorm/clause"
)

// Lead UUIDs (prefix: d0 — hex-only)
const (
	LeadID1 = "d0000001-0000-0000-0000-000000000001"
	LeadID2 = "d0000001-0000-0000-0000-000000000002"
	LeadID3 = "d0000001-0000-0000-0000-000000000003"
	LeadID4 = "d0000001-0000-0000-0000-000000000004"
	LeadID5 = "d0000001-0000-0000-0000-000000000005"
	LeadID6 = "d0000001-0000-0000-0000-000000000006"
)

// SeedCRMLeads seeds sample CRM leads with varied statuses and scores
func SeedCRMLeads() error {
	log.Println("Seeding CRM leads...")

	// Local variables for pointer fields
	salesRep1 := SalesRep1EmployeeID
	salesRep2 := SalesRep2EmployeeID
	adminID := AdminEmployeeID

	sourceWebsite := LeadSourceWebsiteID
	sourceReferral := LeadSourceReferralID
	sourceColdCall := LeadSourceColdCallID
	sourceExhibition := LeadSourceExhibitionID
	sourceSocialMedia := LeadSourceSocialMediaID

	statusNew := LeadStatusNewID
	statusContacted := LeadStatusContactedID
	statusQualified := LeadStatusQualifiedID
	statusConverted := LeadStatusConvertedID
	statusLost := LeadStatusLostID

	now := time.Now()
	convertedAt := now.Add(-48 * time.Hour)
	timeExp1 := now.Add(30 * 24 * time.Hour)
	timeExp2 := now.Add(60 * 24 * time.Hour)
	timeExp3 := now.Add(14 * 24 * time.Hour)

	// Converted lead links to deal (lead 5 is already converted to pipeline)
	deal1 := DealID1
	contact1 := ContactID1

	leads := []crm.Lead{
		{
			ID:              LeadID1,
			Code:            "LEAD-202501-00001",
			FirstName:       "Ahmad",
			LastName:        "Fauzi",
			CompanyName:     "PT Medika Nusantara",
			Email:           "ahmad.fauzi@medikanusantara.co.id",
			Phone:           "081234567890",
			JobTitle:        "Procurement Manager",
			Address:         "Jl. Sudirman No. 123",
			City:            "Jakarta",
			Province:        "DKI Jakarta",
			LeadSourceID:    &sourceWebsite,
			LeadStatusID:    &statusNew,
			LeadScore:       25,
			Probability:     20,
			EstimatedValue:  50000000,
			BudgetConfirmed: false,
			AuthConfirmed:   true,
			AuthPerson:      "Ahmad Fauzi (Procurement)",
			NeedConfirmed:   false,
			TimeConfirmed:   false,
			AssignedTo:      &salesRep1,
			Notes:           "Inquiry via website form, interested in medical supplies",
			CreatedBy:       &adminID,
		},
		{
			ID:              LeadID2,
			Code:            "LEAD-202501-00002",
			FirstName:       "Dewi",
			LastName:        "Sartika",
			CompanyName:     "RS Bunda Mulia",
			Email:           "dewi.sartika@rsbundamulia.co.id",
			Phone:           "082345678901",
			JobTitle:        "Head of Pharmacy",
			Address:         "Jl. Gatot Subroto No. 45",
			City:            "Bandung",
			Province:        "Jawa Barat",
			LeadSourceID:    &sourceReferral,
			LeadStatusID:    &statusContacted,
			LeadScore:       40,
			Probability:     35,
			EstimatedValue:  120000000,
			BudgetConfirmed: true,
			BudgetAmount:    150000000,
			AuthConfirmed:   true,
			AuthPerson:      "Dewi Sartika (Head of Pharmacy)",
			NeedConfirmed:   true,
			NeedDescription: "Needs monthly supply of pharmaceutical products",
			TimeConfirmed:   false,
			TimeExpected:    &timeExp1,
			AssignedTo:      &salesRep1,
			Notes:           "Referred by existing customer, strong interest",
			CreatedBy:       &adminID,
		},
		{
			ID:              LeadID3,
			Code:            "LEAD-202501-00003",
			FirstName:       "Budi",
			LastName:        "Santoso",
			CompanyName:     "Klinik Sehat Abadi",
			Email:           "budi@kliniksehat.co.id",
			Phone:           "083456789012",
			JobTitle:        "Director",
			Address:         "Jl. Asia Afrika No. 78",
			City:            "Surabaya",
			Province:        "Jawa Timur",
			LeadSourceID:    &sourceColdCall,
			LeadStatusID:    &statusQualified,
			LeadScore:       70,
			Probability:     55,
			EstimatedValue:  80000000,
			BudgetConfirmed: true,
			BudgetAmount:    100000000,
			AuthConfirmed:   true,
			AuthPerson:      "Budi Santoso (Director)",
			NeedConfirmed:   true,
			NeedDescription: "Expanding clinic, needs full medical equipment",
			TimeConfirmed:   true,
			TimeExpected:    &timeExp2,
			AssignedTo:      &salesRep2,
			Notes:           "Highly qualified, all BANT criteria met",
			CreatedBy:       &adminID,
		},
		{
			ID:              LeadID4,
			Code:            "LEAD-202501-00004",
			FirstName:       "Siti",
			LastName:        "Aminah",
			CompanyName:     "PT Laboratorium Prima",
			Email:           "siti.aminah@labprima.co.id",
			Phone:           "084567890123",
			JobTitle:        "Purchasing Staff",
			Address:         "Jl. Merdeka No. 56",
			City:            "Semarang",
			Province:        "Jawa Tengah",
			LeadSourceID:    &sourceExhibition,
			LeadStatusID:    &statusQualified,
			LeadScore:       60,
			Probability:     70,
			EstimatedValue:  200000000,
			BudgetConfirmed: true,
			BudgetAmount:    200000000,
			AuthConfirmed:   false,
			NeedConfirmed:   true,
			NeedDescription: "Needs lab reagents and consumables for 2025",
			TimeConfirmed:   true,
			TimeExpected:    &timeExp3,
			AssignedTo:      &salesRep2,
			Notes:           "Met at medical exhibition, qualified for pipeline",
			CreatedBy:       &adminID,
		},
		{
			ID:              LeadID5,
			Code:            "LEAD-202501-00005",
			FirstName:       "Rina",
			LastName:        "Wulandari",
			CompanyName:     "PT Apotek Sehat Sentosa",
			Email:           "rina@apoteksehat.co.id",
			Phone:           "085678901234",
			JobTitle:        "Operations Manager",
			Address:         "Jl. Pemuda No. 12",
			City:            "Yogyakarta",
			Province:        "DI Yogyakarta",
			LeadSourceID:    &sourceSocialMedia,
			LeadStatusID:    &statusConverted,
			LeadScore:       90,
			Probability:     100,
			EstimatedValue:  90000000,
			BudgetConfirmed: true,
			BudgetAmount:    90000000,
			AuthConfirmed:   true,
			AuthPerson:      "Rina Wulandari (Ops Manager)",
			NeedConfirmed:   true,
			NeedDescription: "Regular monthly supply agreement",
			TimeConfirmed:   true,
			TimeExpected:    &now,
			AssignedTo:      &salesRep1,
			DealID:          &deal1,
			ContactID:       &contact1,
			ConvertedAt:     &convertedAt,
			ConvertedBy:     &salesRep1,
			Notes:           "Successfully converted to customer",
			CreatedBy:       &adminID,
		},
		{
			ID:              LeadID6,
			Code:            "LEAD-202501-00006",
			FirstName:       "Hendra",
			LastName:        "Wijaya",
			CompanyName:     "CV Farma Jaya",
			Email:           "hendra@farmajaya.co.id",
			Phone:           "086789012345",
			JobTitle:        "Owner",
			Address:         "Jl. Diponegoro No. 34",
			City:            "Medan",
			Province:        "Sumatera Utara",
			LeadSourceID:    &sourceColdCall,
			LeadStatusID:    &statusLost,
			LeadScore:       15,
			Probability:     0,
			EstimatedValue:  30000000,
			BudgetConfirmed: false,
			AuthConfirmed:   true,
			AuthPerson:      "Hendra Wijaya (Owner)",
			NeedConfirmed:   false,
			TimeConfirmed:   false,
			AssignedTo:      &salesRep2,
			Notes:           "Lost to competitor, budget constraints",
			CreatedBy:       &adminID,
		},
	}

	for _, lead := range leads {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"updated_at", "deal_id", "customer_id"}),
		}).Create(&lead).Error; err != nil {
			log.Printf("Warning: Failed to seed lead %s (%s): %v", lead.Code, lead.ID, err)
		}
	}

	log.Println("CRM leads seeded successfully")
	return nil
}
