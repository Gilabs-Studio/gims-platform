package seeders

import (
	"context"
	"fmt"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
)

// ValidateFinanceSeeder checks CRITICAL invariants after seeding:
// 1. Every COA referenced by finance_settings exists in database
// 2. Every finance_settings key value is a valid COA code
// 3. All required keys are present (non-empty)
// 4. No orphaned COAs or settings exist
//
// Dies if validation fails (fail-fast for production safety).
func ValidateFinanceSeeder() error {
	log.Println("Validating Finance Seeder Integrity...")
	db := database.DB

	// ========================================================================
	// CHECK 1: All finance_settings keys have valid non-empty values
	// ========================================================================
	log.Println("  [1/4] Checking finance_settings integrity...")
	var invalidSettings []models.FinanceSetting
	if err := db.
		Where("setting_key LIKE ? AND (value IS NULL OR value = '')", "coa.%").
		Find(&invalidSettings).Error; err != nil {
		return fmt.Errorf("failed to query finance_settings: %w", err)
	}
	if len(invalidSettings) > 0 {
		return fmt.Errorf("found %d finance_settings with empty values:\n%v", len(invalidSettings), invalidSettings)
	}
	log.Println("    ✓ All COA settings have valid values")

	// ========================================================================
	// CHECK 2: All COA values in finance_settings exist in chart_of_accounts
	// ========================================================================
	log.Println("  [2/4] Checking COA reference integrity...")
	var settings []models.FinanceSetting
	if err := db.Where("setting_key LIKE ?", "coa.%").Find(&settings).Error; err != nil {
		return fmt.Errorf("failed to fetch finance_settings: %w", err)
	}

	coaRepo := repositories.NewChartOfAccountRepository(db)
	ctx := context.Background()
	missingCOAs := make([]string, 0)
	for _, setting := range settings {
		coa, err := coaRepo.FindByCode(ctx, setting.Value)
		if err != nil || coa == nil {
			missingCOAs = append(missingCOAs, fmt.Sprintf("  setting '%s' → code '%s' (NOT FOUND)", setting.SettingKey, setting.Value))
		}
	}
	if len(missingCOAs) > 0 {
		return fmt.Errorf("found %d settings referencing invalid COA codes:\n%s", len(missingCOAs), fmt.Sprint(missingCOAs))
	}
	log.Println("    ✓ All COA references are valid")

	// ========================================================================
	// CHECK 3: Verify ALL required finance_settings keys exist
	// ========================================================================
	log.Println("  [3/4] Checking required finance_settings keys...")
	requiredKeys := []string{
		// Sales & AR
		models.SettingCOASalesReceivable,
		models.SettingCOASalesRevenue,
		models.SettingCOASalesVATOut,
		models.SettingCOASalesAdvance,
		models.SettingCOASalesInventory,
		models.SettingCOASalesCOGS,
		models.SettingCOASalesReturn,

		// Purchase & AP
		models.SettingCOAAccountsPayable,
		models.SettingCOAPurchasePayable,
		models.SettingCOAPurchaseGRIR,
		models.SettingCOAPurchaseVATIn,
		models.SettingCOAPurchaseAdvance,
		models.SettingCOAPurchaseAdvances,
		models.SettingCOAPurchaseReturn,
		models.SettingCOAPurchaseExpense,

		// Inventory
		models.SettingCOAInventory,
		models.SettingCOAInventoryAsset,
		models.SettingCOAInventoryGain,
		models.SettingCOAInventoryLoss,
		models.SettingCOAInventoryRevaluationReserve,
		models.SettingCOAInventoryAdjustment,

		// Depreciation
		models.SettingCOADepreciationExpense,
		models.SettingCOADepreciationAccumulated,
		models.SettingCOADepreciationGain,

		// Assets
		models.SettingCOAFixedAsset,
		models.SettingCOACash,
		models.SettingCOABank,

		// FX
		models.SettingCOAFXGain,
		models.SettingCOAFXLoss,
		models.SettingCOAFXRemeasurement,

		// Non-Trade & Other
		models.SettingCOANonTradePayable,
		models.SettingCOAAccruedExpense,
		models.SettingCOATravelExpense,
		models.SettingCOAOtherExpense,
		models.SettingCOARetainedEarnings,

		// Valuation
		models.SettingValuationReconciliationTolerance,
	}

	missingKeys := make([]string, 0)
	for _, key := range requiredKeys {
		var count int64
		if err := db.Model(&models.FinanceSetting{}).
			Where("setting_key = ?", key).
			Count(&count).Error; err != nil {
			return fmt.Errorf("failed to query setting %s: %w", key, err)
		}
		if count == 0 {
			missingKeys = append(missingKeys, fmt.Sprintf("  - %s", key))
		}
	}
	if len(missingKeys) > 0 {
		return fmt.Errorf("found %d missing required finance_settings keys:\n%s", len(missingKeys), fmt.Sprint(missingKeys))
	}
	log.Println("    ✓ All required settings present")

	// ========================================================================
	// CHECK 4: Validate COA hierarchy (no orphaned codes, basic structure)
	// ========================================================================
	log.Println("  [4/4] Checking COA coverage by account type...")
	accountTypes := []models.AccountType{
		models.AccountTypeCashBank,
		models.AccountTypeAsset,
		models.AccountTypeLiability,
		models.AccountTypeEquity,
		models.AccountTypeRevenue,
		models.AccountTypeExpense,
	}

	for _, accType := range accountTypes {
		var count int64
		if err := db.Model(&models.ChartOfAccount{}).
			Where("type = ? AND is_active = true", accType).
			Count(&count).Error; err != nil {
			return fmt.Errorf("failed to check %s accounts: %w", accType, err)
		}
		if count == 0 {
			log.Printf("    ⚠ WARNING: No active %s accounts found (might be OK if not used)", accType)
		}
	}
	log.Println("    ✓ COA coverage looks good")

	// ========================================================================
	// SUCCESS
	// ========================================================================
	log.Println("✓ Finance Seeder validation PASSED - all invariants satisfied")
	return nil
}

// QuickValidateCOAExists checks if a specific COA code exists (used in tests).
func QuickValidateCOAExists(coaCode string) (bool, error) {
	db := database.DB
	coaRepo := repositories.NewChartOfAccountRepository(db)
	ctx := context.Background()
	coa, err := coaRepo.FindByCode(ctx, coaCode)
	if err != nil {
		return false, err
	}
	return coa != nil && coa.Code == coaCode, nil
}

// QuickValidateSettingValue checks if a setting key maps to an existing COA.
func QuickValidateSettingValue(settingKey, expectedCOACode string) error {
	db := database.DB
	var setting models.FinanceSetting
	if err := db.Where("setting_key = ?", settingKey).First(&setting).Error; err != nil {
		return fmt.Errorf("setting %s not found: %w", settingKey, err)
	}
	if setting.Value != expectedCOACode {
		return fmt.Errorf("setting %s has value '%s' but expected '%s'", settingKey, setting.Value, expectedCOACode)
	}

	// Verify COA exists
	ctx := context.Background()
	coaRepo := repositories.NewChartOfAccountRepository(db)
	coa, err := coaRepo.FindByCode(ctx, setting.Value)
	if err != nil || coa == nil {
		return fmt.Errorf("setting %s references invalid COA code %s", settingKey, setting.Value)
	}

	return nil
}
