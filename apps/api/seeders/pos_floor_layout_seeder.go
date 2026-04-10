package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	posModels "github.com/gilabs/gims/api/internal/pos/data/models"
	"gorm.io/gorm/clause"
)

const (
	PosFloorPlanSudirmanID     = "fa000001-0000-0000-0000-000000000001"
	PosFloorPlanKelapaID       = "fa000001-0000-0000-0000-000000000002"
	PosLayoutVersionSudirmanID = "fb000001-0000-0000-0000-000000000001"
	PosLayoutVersionKelapaID   = "fb000001-0000-0000-0000-000000000002"
)

// SeedPOSFloorLayouts seeds published floor layouts for Mie Gacoan company.
// This creates a mixed-mode scenario:
// - Mie Gacoan outlets (2) => Live Table mode available
// - Kimia Farma outlets (2) => direct POS mode (no floor layout)
func SeedPOSFloorLayouts() error {
	log.Println("Seeding POS floor layouts...")
	db := database.DB
	now := apptime.Now()
	adminID := AdminEmployeeID
	mieGacoanID := MieGacoanCompanyID

	layoutSudirman := `[
	  {"id":"tbl-1","type":"table","x":120,"y":120,"width":90,"height":90,"rotation":0,"label":"T1","tableNumber":1,"tableShape":"circle","capacity":4},
	  {"id":"tbl-2","type":"table","x":280,"y":120,"width":90,"height":90,"rotation":0,"label":"T2","tableNumber":2,"tableShape":"circle","capacity":4},
	  {"id":"tbl-3","type":"table","x":440,"y":120,"width":90,"height":90,"rotation":0,"label":"T3","tableNumber":3,"tableShape":"circle","capacity":6},
	  {"id":"tbl-4","type":"table","x":120,"y":280,"width":90,"height":90,"rotation":0,"label":"T4","tableNumber":4,"tableShape":"square","capacity":2},
	  {"id":"cash-1","type":"cashier","x":40,"y":40,"width":120,"height":56,"rotation":0,"label":"Cashier"}
	]`

	layoutKelapa := `[
	  {"id":"tbl-a1","type":"table","x":100,"y":100,"width":110,"height":72,"rotation":0,"label":"A1","tableNumber":1,"tableShape":"rectangle","capacity":4},
	  {"id":"tbl-a2","type":"table","x":250,"y":100,"width":110,"height":72,"rotation":0,"label":"A2","tableNumber":2,"tableShape":"rectangle","capacity":4},
	  {"id":"tbl-b1","type":"table","x":100,"y":220,"width":96,"height":96,"rotation":0,"label":"B1","tableNumber":3,"tableShape":"circle","capacity":6},
	  {"id":"tbl-b2","type":"table","x":250,"y":220,"width":96,"height":96,"rotation":0,"label":"B2","tableNumber":4,"tableShape":"circle","capacity":6},
	  {"id":"zone-vip","type":"zone","x":420,"y":90,"width":220,"height":220,"rotation":0,"label":"VIP","zoneType":"vip","color":"#22c55e","opacity":0.18},
	  {"id":"cash-2","type":"cashier","x":40,"y":36,"width":128,"height":56,"rotation":0,"label":"Cashier"}
	]`

	plans := []posModels.FloorPlan{
		{
			ID:          PosFloorPlanSudirmanID,
			OutletID:    MieGacoanOutlet1ID,
			CompanyID:   &mieGacoanID,
			Name:        "Live Table - Sudirman",
			FloorNumber: 1,
			Status:      posModels.FloorPlanStatusPublished,
			GridSize:    20,
			SnapToGrid:  true,
			Width:       1200,
			Height:      800,
			LayoutData:  layoutSudirman,
			Version:     1,
			PublishedAt: &now,
			PublishedBy: &adminID,
			CreatedBy:   &adminID,
		},
		{
			ID:          PosFloorPlanKelapaID,
			OutletID:    MieGacoanOutlet2ID,
			CompanyID:   &mieGacoanID,
			Name:        "Live Table - Kelapa Gading",
			FloorNumber: 1,
			Status:      posModels.FloorPlanStatusPublished,
			GridSize:    20,
			SnapToGrid:  true,
			Width:       1400,
			Height:      900,
			LayoutData:  layoutKelapa,
			Version:     1,
			PublishedAt: &now,
			PublishedBy: &adminID,
			CreatedBy:   &adminID,
		},
	}

	for i := range plans {
		if err := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"outlet_id", "company_id", "name", "floor_number", "status", "grid_size", "snap_to_grid",
				"width", "height", "layout_data", "version", "published_at", "published_by", "updated_at",
			}),
		}).Create(&plans[i]).Error; err != nil {
			log.Printf("Warning: Failed to seed POS floor plan %s: %v", plans[i].Name, err)
		}
	}

	versions := []posModels.LayoutVersion{
		{
			ID:          PosLayoutVersionSudirmanID,
			FloorPlanID: PosFloorPlanSudirmanID,
			Version:     1,
			LayoutData:  layoutSudirman,
			PublishedAt: now,
			PublishedBy: adminID,
		},
		{
			ID:          PosLayoutVersionKelapaID,
			FloorPlanID: PosFloorPlanKelapaID,
			Version:     1,
			LayoutData:  layoutKelapa,
			PublishedAt: now,
			PublishedBy: adminID,
		},
	}

	for i := range versions {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"floor_plan_id", "version", "layout_data", "published_at", "published_by"}),
		}).Create(&versions[i]).Error; err != nil {
			log.Printf("Warning: Failed to seed POS layout version %s: %v", versions[i].ID, err)
		}
	}

	log.Println("POS floor layouts seeded successfully")
	return nil
}
