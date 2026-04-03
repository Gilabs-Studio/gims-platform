package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

func SeedSystemAccountMappings() error {
	mappings := []models.SystemAccountMapping{
		// Sales
		{Key: models.MappingKeySalesReceivable, COACode: "1210", Label: "Trade Receivables"},
		{Key: models.MappingKeySalesRevenue, COACode: "4110", Label: "Sales Revenue"},
		{Key: models.MappingKeySalesVatOutput, COACode: "2300", Label: "VAT Output"},
		{Key: models.MappingKeySalesAdvance, COACode: "2400", Label: "Customer Advances"},
		{Key: models.MappingKeySalesCogs, COACode: "5000", Label: "Cost of Goods Sold"},
		{Key: models.MappingKeySalesInventory, COACode: "1430", Label: "Inventory (Finished Goods)"},

		// Purchase
		{Key: models.MappingKeyPurchasePayable, COACode: "2110", Label: "Trade Payables"},
		{Key: models.MappingKeyPurchaseGrir, COACode: "2120", Label: "Goods Received Not Invoiced (GR/IR)"},
		{Key: models.MappingKeyPurchaseVatInput, COACode: "1500", Label: "VAT Input"},
		{Key: models.MappingKeyPurchaseDelivery, COACode: "6120", Label: "Outbound Delivery Costs"},
		{Key: models.MappingKeyPurchaseOtherCost, COACode: "6900", Label: "Other Operating Expenses"},

		// Closing
		{Key: models.MappingKeyRetainedEarnings, COACode: "3200", Label: "Retained Earnings"},
		{Key: models.MappingKeyClosingSuspense, COACode: "3999", Label: "Closing Suspense Account"},
	}

	for _, m := range mappings {
		var existing models.SystemAccountMapping
		err := database.DB.Where("key = ? AND company_id IS NULL", m.Key).First(&existing).Error
		if err == gorm.ErrRecordNotFound {
			if err := database.DB.Create(&m).Error; err != nil {
				return err
			}
			log.Printf("Seeded account mapping: %s -> %s", m.Key, m.COACode)
		} else if err == nil {
			// Update if already exists (to reflect latest seeder defaults)
			existing.COACode = m.COACode
			existing.Label = m.Label
			database.DB.Save(&existing)
		}
	}

	return nil
}
