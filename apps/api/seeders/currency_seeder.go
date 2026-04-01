package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"gorm.io/gorm/clause"
)

// SeedCurrencies seeds the currency master data used by bank-related features.
func SeedCurrencies() error {
	db := database.DB

	log.Println("Seeding currencies...")
	currencies := []models.Currency{
		{Code: "IDR", Name: "Indonesian Rupiah", Symbol: "Rp", DecimalPlaces: 2, IsActive: true},
		{Code: "USD", Name: "US Dollar", Symbol: "$", DecimalPlaces: 2, IsActive: true},
		{Code: "EUR", Name: "Euro", Symbol: "EUR", DecimalPlaces: 2, IsActive: true},
		{Code: "SGD", Name: "Singapore Dollar", Symbol: "S$", DecimalPlaces: 2, IsActive: true},
	}

	for _, currency := range currencies {
		entry := currency
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "symbol", "decimal_places", "is_active", "updated_at"}),
		}).Create(&entry).Error; err != nil {
			log.Printf("Warning: Failed to seed currency %s: %v", entry.Code, err)
		}
	}

	return nil
}
