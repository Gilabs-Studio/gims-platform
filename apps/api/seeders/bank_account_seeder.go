package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/google/uuid"
	"gorm.io/gorm/clause"
)

// SeedBankAccounts seeds sample company bank accounts.
func SeedBankAccounts() error {
	db := database.DB

	accounts := []models.BankAccount{
		{Name: "Bank Mandiri - Main Account", AccountNumber: "1234567890", AccountHolder: "PT. ERP Company", Currency: "IDR", IsActive: true},
		{Name: "Bank BCA - Operating Account", AccountNumber: "0987654321", AccountHolder: "PT. ERP Company", Currency: "IDR", IsActive: true},
		{Name: "Bank BRI - USD Account", AccountNumber: "1122334455", AccountHolder: "PT. ERP Company", Currency: "USD", IsActive: true},
		{Name: "Bank BNI - Inactive Account", AccountNumber: "5566778899", AccountHolder: "PT. ERP Company", Currency: "IDR", IsActive: false},
	}

	for i := range accounts {
		if accounts[i].ID == "" {
			accounts[i].ID = uuid.New().String()
		}
		if err := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&accounts[i]).Error; err != nil {
			log.Printf("Warning: Failed to create bank account %s: %v", accounts[i].Name, err)
		}
	}

	return nil
}
