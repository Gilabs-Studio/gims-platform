package seeders

import (
	"log"

	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	geographicModels "github.com/gilabs/crm-healthcare/api/internal/geographic/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/organization/data/models"
)

// SeedOrganization seeds sample organization master data
func SeedOrganization() error {
	db := database.DB

	// 1. Seed Divisions
	var divisionCount int64
	db.Model(&models.Division{}).Count(&divisionCount)
	if divisionCount == 0 {
		log.Println("Seeding divisions...")
		divisions := []models.Division{
			{Name: "Sales & Marketing", Description: "Responsible for sales and marketing activities", IsActive: true},
			{Name: "Operations", Description: "Handles day-to-day operations and logistics", IsActive: true},
			{Name: "Finance & Accounting", Description: "Manages financial records and transactions", IsActive: true},
			{Name: "Human Resources", Description: "Manages employee relations and recruitment", IsActive: true},
			{Name: "IT & Technology", Description: "Manages technical infrastructure and development", IsActive: true},
		}
		for i := range divisions {
			if err := db.Create(&divisions[i]).Error; err != nil {
				return err
			}
		}
	} else {
		log.Println("Divisions already seeded, skipping...")
	}

	// 2. Seed Job Positions
	var jobPositionCount int64
	db.Model(&models.JobPosition{}).Count(&jobPositionCount)
	if jobPositionCount == 0 {
		log.Println("Seeding job positions...")
		positions := []models.JobPosition{
			{Name: "Director", Description: "Company Director", IsActive: true},
			{Name: "Manager", Description: "Department Manager", IsActive: true},
			{Name: "Supervisor", Description: "Team Supervisor", IsActive: true},
			{Name: "Staff", Description: "General Staff", IsActive: true},
			{Name: "Admin", Description: "Administrative Staff", IsActive: true},
			{Name: "Sales Representative", Description: "Sales Field Officer", IsActive: true},
		}
		for i := range positions {
			if err := db.Create(&positions[i]).Error; err != nil {
				return err
			}
		}
	} else {
		log.Println("Job positions already seeded, skipping...")
	}

	// 3. Seed Business Units
	var businessUnitCount int64
	db.Model(&models.BusinessUnit{}).Count(&businessUnitCount)
	if businessUnitCount == 0 {
		log.Println("Seeding business units...")
		units := []models.BusinessUnit{
			{Name: "Unit A - Retail", Description: "Retail business unit", IsActive: true},
			{Name: "Unit B - Wholesale", Description: "Wholesale business unit", IsActive: true},
			{Name: "Unit C - Online", Description: "E-commerce business unit", IsActive: true},
		}
		for i := range units {
			if err := db.Create(&units[i]).Error; err != nil {
				return err
			}
		}
	} else {
		log.Println("Business units already seeded, skipping...")
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

	// 5. Seed Areas
	var areaCount int64
	db.Model(&models.Area{}).Count(&areaCount)
	if areaCount == 0 {
		log.Println("Seeding areas...")
		areas := []models.Area{
			{Name: "Jabodetabek", Description: "Jakarta, Bogor, Depok, Tangerang, Bekasi", IsActive: true},
			{Name: "Jawa Barat", Description: "Bandung and surrounding areas", IsActive: true},
			{Name: "Jawa Tengah", Description: "Semarang, Solo, Jogja", IsActive: true},
			{Name: "Jawa Timur", Description: "Surabaya, Malang", IsActive: true},
			{Name: "Bali", Description: "Bali region", IsActive: true},
		}
		for i := range areas {
			if err := db.Create(&areas[i]).Error; err != nil {
				return err
			}
		}
	} else {
		log.Println("Areas already seeded, skipping...")
	}

	// 6. Seed Area Supervisors (Sample)
	var supervisorCount int64
	db.Model(&models.AreaSupervisor{}).Count(&supervisorCount)
	if supervisorCount == 0 {
		log.Println("Seeding area supervisors...")
		
		// Get some areas first
		var areas []models.Area
		db.Find(&areas)

		if len(areas) > 0 {
			supervisors := []models.AreaSupervisor{
				{Name: "Budi Santoso", Email: "budi.s@example.com", Phone: "081234567890", IsActive: true},
				{Name: "Siti Rahma", Email: "siti.r@example.com", Phone: "081298765432", IsActive: true},
			}

			// Assign areas using pivot
			for i := range supervisors {
				if err := db.Create(&supervisors[i]).Error; err != nil {
					return err
				}
				
				// Assign random areas (first 2 for first sup, etc)
				if i == 0 && len(areas) >= 2 {
					// Using explicit join table creation or GORM association if setup
					// Assuming basic GORM association works if model setup correctly, 
					// but sticking to direct pivot insert might be safer if unsure.
					// Let's rely on model Many2Many if properly setup, otherwise manual.
					// Checking models/area_supervisor.go earlier showed it has `Areas` many2many.
					
					db.Model(&supervisors[i]).Association("Areas").Append(&areas[0], &areas[1])
				} else if i == 1 && len(areas) >= 3 {
					db.Model(&supervisors[i]).Association("Areas").Append(&areas[2])
				}
			}
		}
	} else {
		log.Println("Area supervisors already seeded, skipping...")
	}

	// 7. Seed Companies
	var companyCount int64
	db.Model(&models.Company{}).Count(&companyCount)
	if companyCount == 0 {
		log.Println("Seeding companies...")

		var village geographicModels.Village
		// Try to find a village to link (optional)
		db.First(&village)

		var villageID *string
		if village.ID != "" {
			id := village.ID
			villageID = &id
		}

		lat := -6.2088
		lng := 106.8456

		companies := []models.Company{
			{
				Name:       "PT. GiLabs Healthcare",
				Address:    "Menara BCA, Jl. M.H. Thamrin No.1, Jakarta Pusat",
				Email:      "contact@gilabs.com",
				Phone:      "021-2358-1234",
				NPWP:       "01.234.567.8-012.000",
				NIB:        "1234567890123",
				VillageID:  villageID,
				Latitude:   &lat,
				Longitude:  &lng,
				Status:     models.CompanyStatusApproved,
				IsApproved: true,
				IsActive:   true,
			},
		}
		for i := range companies {
			if err := db.Create(&companies[i]).Error; err != nil {
				return err
			}
		}
	} else {
		log.Println("Companies already seeded, skipping...")
		
		// Update existing companies with null coordinates
		lat := -6.2088
		lng := 106.8456
		result := db.Model(&models.Company{}).
			Where("latitude IS NULL OR longitude IS NULL").
			Updates(map[string]interface{}{
				"latitude":  lat,
				"longitude": lng,
			})
		if result.RowsAffected > 0 {
			log.Printf("Updated %d companies with default coordinates", result.RowsAffected)
		}
	}

	log.Println("Organization data seeded successfully!")
	return nil
}
