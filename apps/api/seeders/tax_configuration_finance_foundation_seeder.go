package seeders

import (
	"context"
	"fmt"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"gorm.io/gorm/clause"
)

const (
	financeFoundationTaxVATID   = "f2000001-0000-0000-0000-000000000001"
	financeFoundationTaxPPh23ID = "f2000001-0000-0000-0000-000000000002"
)

func SeedFinanceFoundationTaxConfiguration() error {
	log.Println("Seeding finance foundation tax configuration...")
	db := database.DB
	ctx := context.Background()

	companyID, err := findPTGiLabsCompanyID(db)
	if err != nil {
		return err
	}

	coaRepo := repositories.NewChartOfAccountRepository(db)
	ppnOutput, err := findCOAByCandidates(ctx, coaRepo, "21210")
	if err != nil {
		return fmt.Errorf("failed to resolve VAT account: %w", err)
	}
	pph23Payable, err := findCOAByCandidates(ctx, coaRepo, "21230")
	if err != nil {
		return fmt.Errorf("failed to resolve withholding tax account: %w", err)
	}

	items := []financeModels.TaxConfiguration{
		{
			ID:          financeFoundationTaxVATID,
			CompanyID:   companyID,
			TaxCode:     "PPN-11",
			TaxName:     "PPN Keluaran 11%",
			TaxType:     financeModels.TaxTypeVAT,
			Rate:        11,
			IsInclusive: false,
			AccountID:   ppnOutput.ID,
			IsActive:    true,
		},
		{
			ID:          financeFoundationTaxPPh23ID,
			CompanyID:   companyID,
			TaxCode:     "PPH23-2",
			TaxName:     "PPh 23 2%",
			TaxType:     financeModels.TaxTypeWithholdingTax,
			Rate:        2,
			IsInclusive: false,
			AccountID:   pph23Payable.ID,
			IsActive:    true,
		},
	}

	for i := range items {
		if err := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "company_id"}, {Name: "tax_code"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"tax_name", "tax_type", "rate", "is_inclusive", "account_id", "is_active", "updated_at",
			}),
		}).Create(&items[i]).Error; err != nil {
			return fmt.Errorf("failed to seed tax configuration %s: %w", items[i].TaxCode, err)
		}
	}

	return nil
}
