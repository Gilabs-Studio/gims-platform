package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/supplier/data/models"
	"gorm.io/gorm/clause"
)

// SeedSupplier seeds sample supplier master data
func SeedSupplier() error {
	db := database.DB

	// 1. Seed Supplier Types
	log.Println("Seeding supplier types...")
	supplierTypes := []models.SupplierType{
		{Name: "Distributor", Description: "Main product distributors", IsActive: true},
		{Name: "Manufacturer", Description: "Direct manufacturers/principals", IsActive: true},
		{Name: "Sub-Distributor", Description: "Regional distributor partners", IsActive: true},
		{Name: "Importer", Description: "Direct import suppliers", IsActive: true},
		{Name: "Service Provider", Description: "Service-based suppliers", IsActive: true},
	}
	for i := range supplierTypes {
		// Alignment logic for Name conflict
		var existing models.SupplierType
		err := db.Unscoped().Where("name = ?", supplierTypes[i].Name).First(&existing).Error
		if err == nil && existing.ID != supplierTypes[i].ID {
			log.Printf("SupplierType name conflict for %s: Moving existing...", supplierTypes[i].Name)
			db.Unscoped().Model(&existing).Update("name", supplierTypes[i].Name+"_old_"+existing.ID[:8])
		}

		if err := db.Clauses(clause.OnConflict{UpdateAll: true}).Create(&supplierTypes[i]).Error; err != nil {
			return err
		}
	}

	// 2. Seed Banks
	log.Println("Seeding banks...")
	banks := []models.Bank{
		{Name: "Bank Central Asia", Code: "BCA", SwiftCode: "CENAIDJA", IsActive: true},
		{Name: "Bank Mandiri", Code: "MANDIRI", SwiftCode: "BMRIIDJA", IsActive: true},
		{Name: "Bank Negara Indonesia", Code: "BNI", SwiftCode: "BNIAIDJAXXX", IsActive: true},
		{Name: "Bank Rakyat Indonesia", Code: "BRI", SwiftCode: "BRINIDJA", IsActive: true},
		{Name: "Bank CIMB Niaga", Code: "CIMB", SwiftCode: "BNIAIDJA", IsActive: true},
		{Name: "Bank Danamon", Code: "DANAMON", SwiftCode: "BDINIDJA", IsActive: true},
		{Name: "Bank Permata", Code: "PERMATA", SwiftCode: "BBBAIDJA", IsActive: true},
	}
	for i := range banks {
		// Alignment logic for Code conflict
		var existing models.Bank
		err := db.Unscoped().Where("code = ?", banks[i].Code).First(&existing).Error
		if err == nil && existing.ID != banks[i].ID {
			log.Printf("Bank code conflict for %s: Moving existing...", banks[i].Code)
			db.Unscoped().Model(&existing).Update("code", banks[i].Code+"_old_"+existing.ID[:8])
		}

		if err := db.Clauses(clause.OnConflict{UpdateAll: true}).Create(&banks[i]).Error; err != nil {
			return err
		}
	}

	// 3. Seed Sample Suppliers
	log.Println("Seeding suppliers...")

	// Get a supplier type for reference
	var distributorType models.SupplierType
	db.Where("name = ?", "Distributor").First(&distributorType)

	var typeID *string
	if distributorType.ID != "" {
		typeID = &distributorType.ID
	}

	// Get a village for location reference
	var village struct {
		ID string
	}
	database.DB.Table("villages").Select("id").First(&village)

	var villageID *string
	if village.ID != "" {
		villageID = &village.ID
	}

	lat1, lng1 := -6.2088, 106.8456
	lat2, lng2 := -7.2297, 106.8165
	lat3, lng3 := -6.4025, 111.7942

	suppliers := []models.Supplier{
		{
			Code:           "SUP001",
			Name:           "PT. Pharma Distributor Indonesia",
			SupplierTypeID: typeID,
			Address:        "Jl. Industri Raya No. 123, Kawasan Industri Jababeka",
			Email:          "contact@pharmadist.co.id",
			Website:        "https://pharmadist.co.id",
			NPWP:           "01.234.567.8-012.000",
			ContactPerson:  "Budi Hartono",
			Notes:          "Main pharmaceutical distributor",
			VillageID:      villageID,
			Latitude:       &lat1,
			Longitude:      &lng1,
			Status:         models.SupplierStatusApproved,
			IsApproved:     true,
			IsActive:       true,
		},
		{
			Code:           "SUP002",
			Name:           "PT. Medical Supply Co",
			SupplierTypeID: typeID,
			Address:        "Jl. Gatot Subroto Kav. 45, Jakarta Selatan",
			Email:          "sales@medicalsupply.co.id",
			NPWP:           "02.345.678.9-023.000",
			ContactPerson:  "Siti Rahayu",
			Notes:          "Medical equipment and supplies",
			VillageID:      villageID,
			Latitude:       &lat2,
			Longitude:      &lng2,
			Status:         models.SupplierStatusApproved,
			IsApproved:     true,
			IsActive:       true,
		},
		{
			Code:           "SUP003",
			Name:           "PT. Health Essentials",
			SupplierTypeID: typeID,
			Address:        "Jl. Raya Bogor KM 29, Depok",
			Email:          "info@healthessentials.id",
			ContactPerson:  "Ahmad Fauzi",
			VillageID:      villageID,
			Latitude:       &lat3,
			Longitude:      &lng3,
			Status:         models.SupplierStatusDraft,
			IsApproved:     false,
			IsActive:       true,
		},
	}

	for i := range suppliers {
		// Alignment logic for Code conflict
		var existing models.Supplier
		err := db.Unscoped().Where("code = ?", suppliers[i].Code).First(&existing).Error
		if err == nil && existing.ID != suppliers[i].ID {
			log.Printf("Supplier code conflict for %s: Moving existing...", suppliers[i].Code)
			db.Unscoped().Model(&existing).Update("code", suppliers[i].Code+"_old_"+existing.ID[:8])
		}

		if err := db.Clauses(clause.OnConflict{UpdateAll: true}).Create(&suppliers[i]).Error; err != nil {
			return err
		}

		// Add sample phone numbers for first supplier
		if i == 0 {
			phones := []models.SupplierPhoneNumber{
				{SupplierID: suppliers[i].ID, PhoneNumber: "021-12345678", Label: "Office", IsPrimary: true},
				{SupplierID: suppliers[i].ID, PhoneNumber: "0812-3456-7890", Label: "Mobile", IsPrimary: false},
			}
			for j := range phones {
				db.Clauses(clause.OnConflict{DoNothing: true}).Create(&phones[j])
			}

			// Add sample bank account
			var bca models.Bank
			if db.Where("code = ?", "BCA").First(&bca).Error == nil {
				bankAccount := models.SupplierBank{
					SupplierID:    suppliers[i].ID,
					BankID:        bca.ID,
					AccountNumber: "1234567890",
					AccountName:   "PT Pharma Distributor Indonesia",
					Branch:        "KCP Jababeka",
					IsPrimary:     true,
				}
				db.Clauses(clause.OnConflict{DoNothing: true}).Create(&bankAccount)
			}
		}
	}

	log.Println("Supplier data seeded successfully!")
	return nil
}

