package seeders

import (
	"fmt"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm/clause"
)

const financeFoundationInventorySettingsID = "f3000001-0000-0000-0000-000000000001"

func SeedFinanceFoundationInventorySettings() error {
	log.Println("Seeding finance foundation inventory settings...")
	db := database.DB

	companyID, err := findPTGiLabsCompanyID(db)
	if err != nil {
		return err
	}

	item := financeModels.InventorySettings{
		ID:              financeFoundationInventorySettingsID,
		CompanyID:       companyID,
		ValuationMethod: financeModels.InventoryValuationMethodAverageCost,
		IsLocked:        false,
	}

	if err := db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "company_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"valuation_method", "is_locked", "updated_at",
		}),
	}).Create(&item).Error; err != nil {
		return fmt.Errorf("failed to seed inventory settings: %w", err)
	}

	return nil
}
