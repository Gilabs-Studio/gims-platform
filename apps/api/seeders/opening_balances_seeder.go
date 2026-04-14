package seeders

import (
	"context"
	"fmt"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"gorm.io/gorm"
)

// SeedOpeningBalances creates draft opening balance lines for inventory.
// The lines are later posted through the Opening Balance wizard so the journal entry
// is created only after finance confirms the balances.
// Must run AFTER SeedInventory() and AFTER SeedChartOfAccounts() + SeedFinanceSettings().
func SeedOpeningBalances() error {
	log.Println("Seeding opening balance draft lines (inventory GL reconciliation)...")
	db := database.DB
	ctx := context.Background()

	// ============================================================================
	// Step 1: Calculate total inventory value from subledger
	// ============================================================================
	var batchCount int64
	if err := db.
		Table("inventory_batches").
		Where("is_active = true AND deleted_at IS NULL").
		Count(&batchCount).Error; err != nil {
		return fmt.Errorf("failed to count inventory batches: %w", err)
	}

	var totalInventoryValue float64
	if err := db.
		Table("inventory_batches").
		Where("is_active = true AND deleted_at IS NULL").
		Select("COALESCE(SUM(current_quantity * cost_price), 0) as total").
		Scan(&totalInventoryValue).Error; err != nil {
		return fmt.Errorf("failed to calculate inventory total: %w", err)
	}

	if totalInventoryValue == 0 && batchCount > 0 {
		log.Println("  Inventory value is zero while batches exist; backfilling batch cost_price from product pricing...")
		if err := db.Exec(`
			UPDATE inventory_batches ib
			SET cost_price = COALESCE(NULLIF(p.cost_price, 0), NULLIF(p.current_hpp, 0), ib.cost_price)
			FROM products p
			WHERE ib.product_id = p.id
			  AND ib.is_active = true
			  AND ib.deleted_at IS NULL
			  AND ib.cost_price = 0
		`).Error; err != nil {
			return fmt.Errorf("failed to backfill batch cost_price from products: %w", err)
		}

		if err := db.
			Table("inventory_batches").
			Where("is_active = true AND deleted_at IS NULL").
			Select("COALESCE(SUM(current_quantity * cost_price), 0) as total").
			Scan(&totalInventoryValue).Error; err != nil {
			return fmt.Errorf("failed to recalculate inventory total after cost backfill: %w", err)
		}
	}

	if totalInventoryValue == 0 {
		if batchCount == 0 {
			log.Println("   No inventory batches found, skipping opening balance")
		} else {
			log.Println("   Inventory batches found but total value is still zero, skipping opening balance")
		}
		return nil
	}

	log.Printf("  Inventory subledger total: %.2f", totalInventoryValue)

	// ============================================================================
	// Step 2: Resolve COA IDs
	// ============================================================================
	coaRepo := repositories.NewChartOfAccountRepository(db)

	findCOAByCandidates := func(label string, codes ...string) (*models.ChartOfAccount, error) {
		var lastErr error
		for _, code := range codes {
			coa, findErr := coaRepo.FindByCode(ctx, code)
			if findErr == nil && coa != nil {
				return coa, nil
			}
			lastErr = findErr
		}

		if lastErr != nil {
			return nil, fmt.Errorf("failed to find %s COA using candidates %v: %w", label, codes, lastErr)
		}
		return nil, fmt.Errorf("failed to find %s COA using candidates %v", label, codes)
	}

	// Canonical inventory account is 11310 in current COA hierarchy.
	inventoryAssetCOA, err := findCOAByCandidates("inventory asset", "11310", "11300", "1400")
	if err != nil {
		return err
	}

	// Canonical retained earnings/opening equity accounts in current hierarchy.
	retainedEarningsCOA, err := findCOAByCandidates("retained earnings", "39999", "33000", "3200")
	if err != nil {
		return err
	}

	companyID, err := findPTGiLabsCompanyID(db)
	if err != nil {
		return err
	}
	fiscalYearID := financeFoundationFiscalYearID

	lines := []models.OpeningBalanceLine{
		{
			CompanyID:    companyID,
			FiscalYearID: fiscalYearID,
			AccountID:    inventoryAssetCOA.ID,
			DebitAmount:  totalInventoryValue,
			CreditAmount: 0,
			Description:  "Opening inventory balance from batches",
		},
		{
			CompanyID:    companyID,
			FiscalYearID: fiscalYearID,
			AccountID:    retainedEarningsCOA.ID,
			DebitAmount:  0,
			CreditAmount: totalInventoryValue,
			Description:  "Opening inventory credit (Retained Earnings)",
		},
	}

	// Keep seeder idempotent without relying on a composite unique constraint.
	accountIDs := []string{inventoryAssetCOA.ID, retainedEarningsCOA.ID}
	if err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Unscoped().
			Where("company_id = ? AND fiscal_year_id = ? AND account_id IN ?", companyID, fiscalYearID, accountIDs).
			Delete(&models.OpeningBalanceLine{}).Error; err != nil {
			return err
		}

		if err := tx.Create(&lines).Error; err != nil {
			return err
		}

		return nil
	}); err != nil {
		return fmt.Errorf("failed to create opening balance draft lines: %w", err)
	}

	log.Printf("   Opening balance draft lines seeded (%.2f)", totalInventoryValue)
	return nil
}
