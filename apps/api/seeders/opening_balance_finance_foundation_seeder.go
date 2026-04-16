package seeders

import (
	"context"
	"fmt"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
)

const (
	financeFoundationOBLineCashID   = "f4000001-0000-0000-0000-000000000001"
	financeFoundationOBLineEquityID = "f4000001-0000-0000-0000-000000000002"
)

func SeedFinanceFoundationOpeningBalance() error {
	log.Println("Seeding finance foundation opening balance...")
	db := database.DB
	ctx := context.Background()

	companyID, err := findPTGiLabsCompanyID(db)
	if err != nil {
		return err
	}

	coaRepo := repositories.NewChartOfAccountRepository(db)
	cashAccount, err := findCOAByCandidates(ctx, coaRepo, "11111", "11101")
	if err != nil {
		return fmt.Errorf("failed to resolve cash account: %w", err)
	}
	openingEquity, err := findCOAByCandidates(ctx, coaRepo, "39999")
	if err != nil {
		return fmt.Errorf("failed to resolve opening equity account: %w", err)
	}

	if err := db.Unscoped().Where("company_id = ? AND fiscal_year_id = ?", companyID, financeFoundationFiscalYearID).
		Delete(&financeModels.OpeningBalanceLine{}).Error; err != nil {
		return fmt.Errorf("failed to clear opening balance lines: %w", err)
	}

	items := []financeModels.OpeningBalanceLine{
		{
			ID:           financeFoundationOBLineCashID,
			CompanyID:    companyID,
			FiscalYearID: financeFoundationFiscalYearID,
			AccountID:    cashAccount.ID,
			DebitAmount:  250000000,
			CreditAmount: 0,
			Description:  "Saldo awal kas PT. GiLabs",
		},
		{
			ID:           financeFoundationOBLineEquityID,
			CompanyID:    companyID,
			FiscalYearID: financeFoundationFiscalYearID,
			AccountID:    openingEquity.ID,
			DebitAmount:  0,
			CreditAmount: 250000000,
			Description:  "Saldo awal ekuitas PT. GiLabs",
		},
	}

	if err := db.Create(&items).Error; err != nil {
		return fmt.Errorf("failed to seed opening balance lines: %w", err)
	}

	return nil
}
