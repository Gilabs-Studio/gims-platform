package seeders

import (
	"fmt"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/organization/data/models"
	warehouseModels "github.com/gilabs/gims/api/internal/warehouse/data/models"
	"gorm.io/gorm/clause"
)

// SeedOutlets seeds sample outlet data for Mie Gacoan (FnB) and Kimia Farma (Pharmacy)
func SeedOutlets() error {
	log.Println("Seeding outlets...")
	db := database.DB

	// Use pointer variables for optional FK fields (Go cannot take address of constants)
	mieGacoanID := MieGacoanCompanyID
	kimiaFarmaID := KimiaFarmaCompanyID
	outletManager1ID := OutletManager1EmployeeID
	outletManager2ID := OutletManager2EmployeeID

	// Coordinates for Mie Gacoan outlets
	lat1 := -6.2089
	lng1 := 106.8079
	lat2 := -6.1594
	lng2 := 106.9005

	// Coordinates for Kimia Farma outlets
	lat3 := -6.2228
	lng3 := 106.8091
	lat4 := -6.2641
	lng4 := 106.7892

	outlets := []models.Outlet{
		// === Mie Gacoan FnB Outlets ===
		{
			ID:          MieGacoanOutlet1ID,
			Code:        "OT-00001",
			Name:        "Mie Gacoan - Outlet Sudirman",
			Description: "Outlet utama kawasan Sudirman – FnB",
			Phone:       "021-5790-0001",
			Email:       "sudirman@miegacoan.id",
			Address:     "Jl. Jend. Sudirman Kav. 52, Jakarta Selatan",
			CompanyID:   &mieGacoanID,
			ManagerID:   &outletManager1ID,
			Latitude:    &lat1,
			Longitude:   &lng1,
			IsActive:    true,
		},
		{
			ID:          MieGacoanOutlet2ID,
			Code:        "OT-00002",
			Name:        "Mie Gacoan - Outlet Kelapa Gading",
			Description: "Outlet kawasan Kelapa Gading – FnB",
			Phone:       "021-4585-0002",
			Email:       "kelapagading@miegacoan.id",
			Address:     "Mal Kelapa Gading 3, Jl. Bulevar Kelapa Gading, Jakarta Utara",
			CompanyID:   &mieGacoanID,
			ManagerID:   &outletManager2ID,
			Latitude:    &lat2,
			Longitude:   &lng2,
			IsActive:    true,
		},
		// === Kimia Farma Pharmacy Outlets ===
		{
			ID:          KimiaFarmaOutlet1ID,
			Code:        "OT-00003",
			Name:        "Kimia Farma - Cabang Sudirman",
			Description: "Apotek Kimia Farma kawasan Sudirman",
			Phone:       "021-5709-0003",
			Email:       "sudirman@kimiafarma.co.id",
			Address:     "Jl. Jend. Sudirman Kav. 44-46, Jakarta Selatan",
			CompanyID:   &kimiaFarmaID,
			// Scenario seed: Outlet Manager 2 handles multiple outlets.
			ManagerID:   &outletManager2ID,
			Latitude:    &lat3,
			Longitude:   &lng3,
			IsActive:    true,
		},
		{
			ID:          KimiaFarmaOutlet2ID,
			Code:        "OT-00004",
			Name:        "Kimia Farma - Cabang Pondok Indah",
			Description: "Apotek Kimia Farma kawasan Pondok Indah",
			Phone:       "021-7508-0004",
			Email:       "pondokindah@kimiafarma.co.id",
			Address:     "Jl. Metro Pondok Indah No.10, Jakarta Selatan",
			CompanyID:   &kimiaFarmaID,
			ManagerID:   &outletManager2ID,
			Latitude:    &lat4,
			Longitude:   &lng4,
			IsActive:    true,
		},
	}

	for i := range outlets {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "description", "phone", "email", "address", "company_id", "manager_id", "is_active", "updated_at"}),
		}).Create(&outlets[i]).Error; err != nil {
			log.Printf("Warning: Failed to seed outlet %s: %v", outlets[i].Code, err)
		}

		// Also ensure a POS warehouse exists for this outlet (idempotent)
		// Warehouse code is derived from the outlet code to avoid collisions
		whCode := fmt.Sprintf("WH-%s", outlets[i].Code)
		wh := warehouseModels.Warehouse{
			Code:        whCode,
			Name:        fmt.Sprintf("%s Warehouse", outlets[i].Name),
			Description: outlets[i].Description,
			Address:     outlets[i].Address,
			Latitude:    outlets[i].Latitude,
			Longitude:   outlets[i].Longitude,
			IsPosOutlet: true,
			OutletID:    &outlets[i].ID,
			IsActive:    outlets[i].IsActive,
		}

		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "description", "address", "latitude", "longitude", "is_pos_outlet", "outlet_id", "is_active", "updated_at"}),
		}).Create(&wh).Error; err != nil {
			log.Printf("Warning: Failed to create warehouse for outlet %s: %v", outlets[i].Code, err)
		}

		// Keep outlets.warehouse_id synchronized so POS terminal can resolve eligible outlets.
		var linkedWH warehouseModels.Warehouse
		if err := db.Select("id").Where("code = ?", whCode).First(&linkedWH).Error; err != nil {
			log.Printf("Warning: Failed to lookup warehouse by code %s: %v", whCode, err)
		} else {
			if err := db.Model(&models.Outlet{}).
				Where("id = ?", outlets[i].ID).
				Update("warehouse_id", linkedWH.ID).Error; err != nil {
				log.Printf("Warning: Failed to update outlet warehouse_id for %s: %v", outlets[i].Code, err)
			}
		}
	}

	log.Println("Outlets seeded successfully")
	return nil
}
