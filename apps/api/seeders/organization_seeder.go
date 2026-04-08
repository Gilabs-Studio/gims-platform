package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	geographicModels "github.com/gilabs/gims/api/internal/geographic/data/models"
	"github.com/gilabs/gims/api/internal/organization/data/models"
	"gorm.io/gorm/clause"
)

// SeedOrganization seeds sample organization master data
func SeedOrganization() error {
	db := database.DB

	// 1. Seed Divisions
	log.Println("Seeding divisions...")
	divisions := []models.Division{
		{ID: SalesDivisionID, Name: "Sales & Marketing", Description: "Responsible for sales and marketing activities", IsActive: true},
		{ID: OpsDivisionID, Name: "Operations", Description: "Handles day-to-day operations and logistics", IsActive: true},
		{ID: FinanceDivisionID, Name: "Finance & Accounting", Description: "Manages financial records and transactions", IsActive: true},
		{ID: HRDivisionID, Name: "Human Resources", Description: "Manages employee relations and recruitment", IsActive: true},
		{ID: ITDivisionID, Name: "IT & Technology", Description: "Manages technical infrastructure and development", IsActive: true},
	}
	for i := range divisions {
		// 1. Check if record with same Name exists but different ID
		var existing models.Division
		err := db.Unscoped().Where("name = ?", divisions[i].Name).First(&existing).Error
		if err == nil && existing.ID != divisions[i].ID {
			log.Printf("Division name conflict for %s: Existing ID %s, Expected %s. Moving existing...", divisions[i].Name, existing.ID, divisions[i].ID)
			// Instead of deleting (which fails due to FKs), rename to clear the unique constraint
			db.Unscoped().Model(&existing).Update("name", divisions[i].Name+"_old_"+existing.ID[:8])
		}

		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			UpdateAll: true,
		}).Create(&divisions[i]).Error; err != nil {
			return err
		}
	}

	// 2. Seed Job Positions
	log.Println("Seeding job positions...")
	positions := []models.JobPosition{
		{ID: DirectorPositionID, Name: "Director", Description: "Company Director", IsActive: true},
		{ID: ManagerPositionID, Name: "Manager", Description: "Department Manager", IsActive: true},
		{ID: SupervisorPositionID, Name: "Supervisor", Description: "Team Supervisor", IsActive: true},
		{ID: StaffPositionID, Name: "Staff", Description: "General Staff", IsActive: true},
		{ID: AdminPositionID, Name: "Admin", Description: "Administrative Staff", IsActive: true},
		{ID: SalesRepPositionID, Name: "Sales Representative", Description: "Sales Field Officer", IsActive: true},
	}
	for i := range positions {
		// 1. Check if record with same Name exists but different ID
		var existing models.JobPosition
		err := db.Unscoped().Where("name = ?", positions[i].Name).First(&existing).Error
		if err == nil && existing.ID != positions[i].ID {
			log.Printf("JobPosition name conflict for %s: Existing ID %s, Expected %s. Moving existing...", positions[i].Name, existing.ID, positions[i].ID)
			// Instead of deleting (which fails due to FKs), rename to clear the unique constraint
			db.Unscoped().Model(&existing).Update("name", positions[i].Name+"_old_"+existing.ID[:8])
		}

		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			UpdateAll: true,
		}).Create(&positions[i]).Error; err != nil {
			return err
		}
	}

	// 3. Seed Business Units
	log.Println("Seeding business units...")
	units := []models.BusinessUnit{
		{ID: UnitRetailID, Name: "Unit A - Retail", Description: "Retail business unit", IsActive: true},
		{ID: UnitWholesaleID, Name: "Unit B - Wholesale", Description: "Wholesale business unit", IsActive: true},
		{Name: "Unit C - Online", Description: "E-commerce business unit", IsActive: true},
	}
	for i := range units {
		if err := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&units[i]).Error; err != nil {
			return err
		}
	}

	// 4. Seed Business Types
	var businessTypeCount int64
	db.Model(&models.BusinessType{}).Count(&businessTypeCount)
	if businessTypeCount == 0 {
		log.Println("Seeding business types...")
		types := []models.BusinessType{
			{Name: "Pharmacy", Description: "Retail Pharmacy", IsActive: true},
			{Name: "Clinic", Description: "Medical Clinic", IsActive: true},
			{Name: "Hospital", Description: "General Hospital", IsActive: true},
			{Name: "Drug Store", Description: "Over-the-counter Drug Store", IsActive: true},
		}
		for i := range types {
			if err := db.Create(&types[i]).Error; err != nil {
				return err
			}
		}
	} else {
		log.Println("Business types already seeded, skipping...")
	}

	// 5. Seed Areas (enhanced with territory fields for Sprint 24 CRM integration)
	var areaCount int64
	db.Model(&models.Area{}).Count(&areaCount)
	if areaCount == 0 {
		log.Println("Seeding areas with territory data...")
		// ManagerID intentionally omitted — employees are seeded after organization
		areas := []models.Area{
			{ID: AreaJabodetabekID, Name: "Jabodetabek", Description: "Jakarta, Bogor, Depok, Tangerang, Bekasi", IsActive: true, Code: "JABODETABEK", Color: "#3b82f6", Province: "DKI Jakarta"},
			{ID: AreaJawaBaratID, Name: "Jawa Barat", Description: "Bandung and surrounding areas", IsActive: true, Code: "JAWA-BARAT", Color: "#10b981", Province: "Jawa Barat"},
			{ID: AreaJawaTengahID, Name: "Jawa Tengah", Description: "Semarang, Solo and surrounding areas", IsActive: true, Code: "JAWA-TENGAH", Color: "#f59e0b", Province: "Jawa Tengah"},
			{ID: AreaJawaTimurID, Name: "Jawa Timur", Description: "Surabaya, Malang and surrounding areas", IsActive: true, Code: "JAWA-TIMUR", Color: "#ef4444", Province: "Jawa Timur"},
			{ID: AreaBaliID, Name: "Bali", Description: "Bali region", IsActive: true, Code: "BALI", Color: "#8b5cf6", Province: "Bali"},
			{ID: AreaBantenID, Name: "Banten", Description: "Serang, Cilegon, Tangerang Selatan", IsActive: true, Code: "BANTEN", Color: "#06b6d4", Province: "Banten"},
			{ID: AreaDIYID, Name: "DI Yogyakarta", Description: "Yogyakarta and surrounding areas", IsActive: true, Code: "DIY", Color: "#ec4899", Province: "Daerah Istimewa Yogyakarta"},
			{ID: AreaSumateraUtaraID, Name: "Sumatera Utara", Description: "Medan and surrounding areas", IsActive: true, Code: "SUMUT", Color: "#14b8a6", Province: "Sumatera Utara"},
			{ID: AreaSulawesiSelatanID, Name: "Sulawesi Selatan", Description: "Makassar and surrounding areas", IsActive: true, Code: "SULSEL", Color: "#f97316", Province: "Sulawesi Selatan"},
			{ID: AreaKalimantanTimurID, Name: "Kalimantan Timur", Description: "Balikpapan, Samarinda", IsActive: true, Code: "KALTIM", Color: "#84cc16", Province: "Kalimantan Timur"},
		}
		for i := range areas {
			if err := db.Create(&areas[i]).Error; err != nil {
				return err
			}
		}
	} else {
		log.Println("Areas already seeded, skipping...")
	}

	// 6. Area supervisor seeding removed in Sprint 17.
	// Supervisor role is now a flag (is_supervisor) on employee_areas join table.

	// 7. Seed Companies
	log.Println("Seeding companies...")

	var village geographicModels.Village
	// Try to find a village to link (optional)
	db.First(&village)

	var villageID *string
	if village.ID != "" {
		id := village.ID
		villageID = &id
	}

	latGilabs := -6.2088
	lngGilabs := 106.8456
	latGacoan := -6.2234
	lngGacoan := 106.8120
	latKimia := -6.2297
	lngKimia := 106.8235

	companies := []models.Company{
		{
			ID:         GiLabsCompanyID,
			Name:       "PT. GiLabs",
			Address:    "Menara BCA, Jl. M.H. Thamrin No.1, Jakarta Pusat",
			Email:      "contact@gilabs.com",
			Phone:      "021-2358-1234",
			NPWP:       "01.234.567.8-012.000",
			NIB:        "1234567890123",
			VillageID:  villageID,
			Latitude:   &latGilabs,
			Longitude:  &lngGilabs,
			Timezone:   "Asia/Jakarta",
			Status:     models.CompanyStatusApproved,
			IsApproved: true,
			IsActive:   true,
		},
		{
			ID:         MieGacoanCompanyID,
			Name:       "PT. Mie Gacoan Indonesia",
			Address:    "Jl. Gandaria Utara III No.10, Jakarta Selatan",
			Email:      "info@miegacoan.id",
			Phone:      "021-7258-0001",
			NPWP:       "02.345.678.9-013.000",
			NIB:        "2345678901234",
			VillageID:  villageID,
			Latitude:   &latGacoan,
			Longitude:  &lngGacoan,
			Timezone:   "Asia/Jakarta",
			Status:     models.CompanyStatusApproved,
			IsApproved: true,
			IsActive:   true,
		},
		{
			ID:         KimiaFarmaCompanyID,
			Name:       "PT. Kimia Farma Tbk",
			Address:    "Jl. Veteran No.9, Jakarta Pusat",
			Email:      "info@kimiafarma.co.id",
			Phone:      "021-3847-3832",
			NPWP:       "03.456.789.0-014.000",
			NIB:        "3456789012345",
			VillageID:  villageID,
			Latitude:   &latKimia,
			Longitude:  &lngKimia,
			Timezone:   "Asia/Jakarta",
			Status:     models.CompanyStatusApproved,
			IsApproved: true,
			IsActive:   true,
		},
	}
	for i := range companies {
		// 1. Check if record with same Name exists but different ID
		var existing models.Company
		err := db.Unscoped().Where("name = ?", companies[i].Name).First(&existing).Error
		if err == nil && existing.ID != companies[i].ID {
			log.Printf("Company name conflict for %s: Existing ID %s, Expected %s. Moving existing...", companies[i].Name, existing.ID, companies[i].ID)
			// Instead of deleting (which fails due to FKs), rename to clear the unique constraint
			db.Unscoped().Model(&existing).Update("name", companies[i].Name+"_old_"+existing.ID[:8])
		}

		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			UpdateAll: true,
		}).Create(&companies[i]).Error; err != nil {
			return err
		}
	}

	log.Println("Organization data seeded successfully!")
	return nil
}
