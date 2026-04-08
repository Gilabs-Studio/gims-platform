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
// Admin user gets all warehouses, staff gets the POS outlet only.
func SeedUserWarehouses() error {
	db := database.DB
	log.Println("Seeding user-warehouse assignments...")

	// Look up warehouse IDs by code (since they are auto-generated UUIDs)
	var warehouses []warehouseModels.Warehouse
	if err := db.Select("id, code").Where("code IN ?", []string{"SEED-WH-001", "SEED-WH-002"}).Find(&warehouses).Error; err != nil {
		log.Printf("Warning: could not find seed warehouses: %v", err)
		return nil
	}

	if len(warehouses) == 0 {
		log.Println("No seed warehouses found, skipping user-warehouse seeding")
		return nil
	}

	warehouseMap := make(map[string]string, len(warehouses))
	for _, wh := range warehouses {
		warehouseMap[wh.Code] = wh.ID
	}

	var assignments []userModels.UserWarehouse

	// Admin user → all warehouses
	for _, wh := range warehouses {
		assignments = append(assignments, userModels.UserWarehouse{
			UserID:      AdminUserID,
			WarehouseID: wh.ID,
		})
	}

	// Staff user → POS outlet only (SEED-WH-001)
	if whID, ok := warehouseMap["SEED-WH-001"]; ok {
		assignments = append(assignments, userModels.UserWarehouse{
			UserID:      StaffUserID,
			WarehouseID: whID,
		})
	}

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
