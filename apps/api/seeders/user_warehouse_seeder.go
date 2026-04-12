package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	userModels "github.com/gilabs/gims/api/internal/user/data/models"
	warehouseModels "github.com/gilabs/gims/api/internal/warehouse/data/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SeedUserWarehouses assigns users to warehouses for POS outlet RBAC.
// - Admin user gets all warehouses
// - Staff gets the POS outlet only
// - Outlet managers get assigned to their specific outlet warehouses
func SeedUserWarehouses() error {
	db := database.DB
	log.Println("Seeding user-warehouse assignments...")

	// Look up all warehouses by code
	var warehouses []warehouseModels.Warehouse
	if err := db.Select("id, code").Find(&warehouses).Error; err != nil {
		log.Printf("Warning: could not find warehouses: %v", err)
		return nil
	}

	warehouseMap := make(map[string]string, len(warehouses))
	for _, wh := range warehouses {
		warehouseMap[wh.Code] = wh.ID
	}

	var assignments []userModels.UserWarehouse

	// 1. Admin user → all warehouses
	for _, wh := range warehouses {
		assignments = append(assignments, userModels.UserWarehouse{
			UserID:      AdminUserID,
			WarehouseID: wh.ID,
		})
	}

	// 2. Staff user → SEED-WH-001 only
	if whID, ok := warehouseMap["SEED-WH-001"]; ok {
		assignments = append(assignments, userModels.UserWarehouse{
			UserID:      StaffUserID,
			WarehouseID: whID,
		})
	}

	// 3. Outlet managers → their assigned outlet warehouses (EACH MANAGER = 1 OUTLET)
	// OutletManager1 (Mie Gacoan - Sudirman) → WH-OT-00001
	if whID, ok := warehouseMap["WH-OT-00001"]; ok {
		assignments = append(assignments, userModels.UserWarehouse{
			UserID:      OutletManager1UserID,
			WarehouseID: whID,
		})
		log.Printf("Assigned outlet manager 1 to warehouse: WH-OT-00001")
	}

	// OutletManager2 (Mie Gacoan - Kelapa Gading) → WH-OT-00002
	if whID, ok := warehouseMap["WH-OT-00002"]; ok {
		assignments = append(assignments, userModels.UserWarehouse{
			UserID:      OutletManager2UserID,
			WarehouseID: whID,
		})
		log.Printf("Assigned outlet manager 2 to warehouse: WH-OT-00002")
	}

	// OutletManager3 (Kimia Farma - Sudirman) → WH-OT-00003
	if whID, ok := warehouseMap["WH-OT-00003"]; ok {
		assignments = append(assignments, userModels.UserWarehouse{
			UserID:      OutletManager3UserID,
			WarehouseID: whID,
		})
		log.Printf("Assigned outlet manager 3 to warehouse: WH-OT-00003")
	}

	// OutletManager4 (Kimia Farma - Pondok Indah) → WH-OT-00004
	if whID, ok := warehouseMap["WH-OT-00004"]; ok {
		assignments = append(assignments, userModels.UserWarehouse{
			UserID:      OutletManager4UserID,
			WarehouseID: whID,
		})
		log.Printf("Assigned outlet manager 4 to warehouse: WH-OT-00004")
	}

	// Insert all assignments
	for _, assignment := range assignments {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "warehouse_id"}},
			DoNothing: true,
		}).Create(&assignment).Error; err != nil {
			if err != gorm.ErrDuplicatedKey {
				log.Printf("Warning: Failed to seed user-warehouse %s-%s: %v", assignment.UserID, assignment.WarehouseID, err)
			}
		}
	}

	log.Println("User-warehouse assignments seeded successfully")
	return nil
}
