package seeders

import (
	"log"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm/clause"
)

// bankAccountSeed defines a bank account with its linked COA code.
type bankAccountSeed struct {
	name          string
	accountNumber string
	accountHolder string
	currency      string
	isActive      bool
	coaCode       string
	coaName       string
}

// SeedBankAccounts seeds sample company bank accounts and links each to a dedicated
// Chart of Account entry (type CASH_BANK) for proper double-entry accounting.
func SeedBankAccounts() error {
	if isMinimalSeedMode() {
		db := database.DB
		// Minimal bank account + corresponding COA.
		coa := financeModels.ChartOfAccount{Code: "11100", Name: "Cash - Minimal Account", Type: financeModels.AccountTypeCashBank, IsActive: true}
		if err := db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "code"}}, DoUpdates: clause.AssignmentColumns([]string{"name", "type", "is_active"})}).Create(&coa).Error; err != nil {
			return err
		}

		var existingID string
		if err := db.Model(&financeModels.ChartOfAccount{}).Where("code = ?", coa.Code).Pluck("id", &existingID).Error; err != nil {
		}

		account := coreModels.BankAccount{
			Name:             "Minimal Bank Account",
			AccountNumber:    "0000000001",
			AccountHolder:    "PT. Minimal",
			Currency:         "IDR",
			IsActive:         true,
			ChartOfAccountID: &existingID,
		}
		if err := db.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "account_number"}}, DoUpdates: clause.AssignmentColumns([]string{"name", "account_holder", "currency", "is_active", "chart_of_account_id", "updated_at"})}).Create(&account).Error; err != nil {
			return err
		}
		return nil
	}

	db := database.DB

	// 1) Resolve currency ID mapping.
	currencyIDs := map[string]string{}
	var currencies []coreModels.Currency
	if err := db.Find(&currencies).Error; err != nil {
		return err
	}
	for _, c := range currencies {
		currencyIDs[c.Code] = c.ID
	}

	// 2) Define bank accounts alongside their dedicated COA codes.
	seeds := []bankAccountSeed{
		{
			name: "Bank Mandiri - Main Account", accountNumber: "1234567890",
			accountHolder: "PT. ERP Company", currency: "IDR", isActive: true,
			coaCode: "11101", coaName: "Bank Mandiri - Main Account",
		},
		{
			name: "Bank BCA - Operating Account", accountNumber: "0987654321",
			accountHolder: "PT. ERP Company", currency: "IDR", isActive: true,
			coaCode: "11102", coaName: "Bank BCA - Operating Account",
		},
		{
			name: "Bank BRI - USD Account", accountNumber: "1122334455",
			accountHolder: "PT. ERP Company", currency: "USD", isActive: true,
			coaCode: "11103", coaName: "Bank BRI - USD Account",
		},
		{
			name: "Bank BNI - Inactive Account", accountNumber: "5566778899",
			accountHolder: "PT. ERP Company", currency: "IDR", isActive: false,
			coaCode: "11104", coaName: "Bank BNI - Inactive Account",
		},
	}

	// 3) Upsert a CASH_BANK COA entry for each bank account.
	for _, s := range seeds {
		if s.coaCode == "" {
			continue
		}
		coa := financeModels.ChartOfAccount{
			Code:     s.coaCode,
			Name:     s.coaName,
			Type:     financeModels.AccountTypeCashBank,
			IsActive: s.isActive,
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "type", "is_active"}),
		}).Create(&coa).Error; err != nil {
			log.Printf("Warning: Failed to upsert COA %s for bank account %s: %v", s.coaCode, s.name, err)
		}
	}

	// 4) Resolve COA IDs by code.
	coaByCode := map[string]string{}
	for _, s := range seeds {
		if s.coaCode == "" {
			continue
		}
		var record financeModels.ChartOfAccount
		if err := db.Where("code = ?", s.coaCode).First(&record).Error; err == nil {
			coaByCode[s.coaCode] = record.ID
		}
	}

	// 5) Upsert bank accounts with resolved ChartOfAccountID.
	for _, s := range seeds {
		coaID := coaByCode[s.coaCode]
		account := coreModels.BankAccount{
			ID:            uuid.New().String(),
			Name:          s.name,
			AccountNumber: s.accountNumber,
			AccountHolder: s.accountHolder,
			Currency:      s.currency,
			IsActive:      s.isActive,
		}
		if coaID != "" {
			account.ChartOfAccountID = &coaID
		}
		if currencyID := currencyIDs[s.currency]; currencyID != "" {
			account.CurrencyID = &currencyID
		}

		updateCols := []string{"name", "account_holder", "currency", "is_active"}
		if coaID != "" {
			updateCols = append(updateCols, "chart_of_account_id")
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "account_number"}},
			DoUpdates: clause.AssignmentColumns(updateCols),
		}).Create(&account).Error; err != nil {
			log.Printf("Warning: Failed to upsert bank account %s: %v", s.name, err)
		}
	}

	log.Println("Bank accounts seeded with linked COA entries.")
	return nil
}
