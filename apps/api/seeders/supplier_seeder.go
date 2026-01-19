package seeders

import (
	"log"

	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	"github.com/gilabs/crm-healthcare/api/internal/supplier/data/models"
)

// SeedSupplier seeds sample supplier master data
func SeedSupplier() error {
	db := database.DB

	// 1. Seed Supplier Types
	var supplierTypeCount int64
	db.Model(&models.SupplierType{}).Count(&supplierTypeCount)
	if supplierTypeCount == 0 {
		log.Println("Seeding supplier types...")
		supplierTypes := []models.SupplierType{
			{Name: "Distributor", Description: "Main product distributors", IsActive: true},
			{Name: "Manufacturer", Description: "Direct manufacturers/principals", IsActive: true},
			{Name: "Sub-Distributor", Description: "Regional distributor partners", IsActive: true},
			{Name: "Importer", Description: "Direct import suppliers", IsActive: true},
			{Name: "Service Provider", Description: "Service-based suppliers", IsActive: true},
		}
		for i := range supplierTypes {
			if err := db.Create(&supplierTypes[i]).Error; err != nil {
				return err
			}
		}
	} else {
		log.Println("Supplier types already seeded, skipping...")
	}

	// 2. Seed Banks
	var bankCount int64
	db.Model(&models.Bank{}).Count(&bankCount)
	if bankCount == 0 {
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
			if err := db.Create(&banks[i]).Error; err != nil {
				return err
			}
		}
	} else {
		log.Println("Banks already seeded, skipping...")
	}

	// 3. Seed Sample Suppliers
	var supplierCount int64
	db.Model(&models.Supplier{}).Count(&supplierCount)
	if supplierCount == 0 {
		log.Println("Seeding suppliers...")

		// Get a supplier type for reference
		var distributorType models.SupplierType
		db.Where("name = ?", "Distributor").First(&distributorType)

		var typeID *string
		if distributorType.ID != "" {
			typeID = &distributorType.ID
		}

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
				Status:         models.SupplierStatusDraft,
				IsApproved:     false,
				IsActive:       true,
			},
		}

		for i := range suppliers {
			if err := db.Create(&suppliers[i]).Error; err != nil {
				return err
			}

			// Add sample phone numbers for first supplier
			if i == 0 {
				phones := []models.SupplierPhoneNumber{
					{SupplierID: suppliers[i].ID, PhoneNumber: "021-12345678", Label: "Office", IsPrimary: true},
					{SupplierID: suppliers[i].ID, PhoneNumber: "0812-3456-7890", Label: "Mobile", IsPrimary: false},
				}
				for j := range phones {
					db.Create(&phones[j])
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
					db.Create(&bankAccount)
				}
			}
		}
	} else {
		log.Println("Suppliers already seeded, skipping...")
	}

	log.Println("Supplier data seeded successfully!")
	return nil
}
