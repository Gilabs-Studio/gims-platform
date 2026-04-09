package seeders

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
)

// ValidateFinanceSeeder checks CRITICAL invariants after seeding and fails fast on violations.
func ValidateFinanceSeeder() error {
	log.Println("Validating Finance Seeder Integrity...")
	db := database.DB

	log.Println("  [1/7] Checking finance_settings integrity...")
	var invalidSettings []models.FinanceSetting
	if err := db.
		Where("setting_key LIKE ? AND (value IS NULL OR value = '')", "coa.%").
		Find(&invalidSettings).Error; err != nil {
		return fmt.Errorf("failed to query finance_settings: %w", err)
	}
	if len(invalidSettings) > 0 {
		return fmt.Errorf("found %d finance_settings with empty values", len(invalidSettings))
	}
	log.Println("    ✓ All COA settings have valid values")

	log.Println("  [2/7] Checking COA references from finance_settings...")
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
			missingCOAs = append(missingCOAs, fmt.Sprintf("%s -> %s", setting.SettingKey, setting.Value))
		}
	}
	if len(missingCOAs) > 0 {
		return fmt.Errorf("found %d settings referencing invalid COA codes: %s", len(missingCOAs), strings.Join(missingCOAs, "; "))
	}
	log.Println("    ✓ All finance settings COA references are valid")

	log.Println("  [3/8] Checking required finance_settings keys...")
	requiredKeys := []string{
		models.SettingCOASalesReceivable,
		models.SettingCOASalesRevenue,
		models.SettingCOASalesVATOut,
		models.SettingCOASalesAdvance,
		models.SettingCOASalesInventory,
		models.SettingCOASalesCOGS,
		models.SettingCOASalesReturn,
		models.SettingCOAAccountsPayable,
		models.SettingCOAPurchasePayable,
		models.SettingCOAPurchaseGRIR,
		models.SettingCOAPurchaseVATIn,
		models.SettingCOAPurchaseAdvance,
		models.SettingCOAPurchaseAdvances,
		models.SettingCOAPurchaseReturn,
		models.SettingCOAPurchaseExpense,
		models.SettingCOAInventory,
		models.SettingCOAInventoryAsset,
		models.SettingCOAInventoryGain,
		models.SettingCOAInventoryLoss,
		models.SettingCOAInventoryRevaluationReserve,
		models.SettingCOAInventoryAdjustment,
		models.SettingCOADepreciationExpense,
		models.SettingCOADepreciationAccumulated,
		models.SettingCOADepreciationGain,
		models.SettingCOAFixedAsset,
		models.SettingCOACash,
		models.SettingCOABank,
		models.SettingCOAFXGain,
		models.SettingCOAFXLoss,
		models.SettingCOAFXRemeasurement,
		models.SettingCOANonTradePayable,
		models.SettingCOAAccruedExpense,
		models.SettingCOATravelExpense,
		models.SettingCOAOtherExpense,
		models.SettingCOARetainedEarnings,
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
			missingKeys = append(missingKeys, key)
		}
	}
	if len(missingKeys) > 0 {
		return fmt.Errorf("missing required finance_settings keys: %s", strings.Join(missingKeys, ", "))
	}
	log.Println("    ✓ All required finance settings are present")
	log.Println("  [4/8] Checking orphan and circular hierarchy...")
	orphans, err := countOrphanAccounts()
	if err != nil {
		return err
	}
	if orphans > 0 {
		return fmt.Errorf("found %d orphan accounts (parent_id points to non-existing account)", orphans)
	}
	if hasCycle, err := hasCircularReference(); err != nil {
		return err
	} else if hasCycle {
		return fmt.Errorf("circular parent-child reference detected in chart_of_accounts")
	}
	log.Println("    ✓ No orphan and no circular hierarchy detected")

	log.Println("  [5/8] Checking parent postable consistency...")
	invalidParents, err := countPostableParentsWithChildren()
	if err != nil {
		return err
	}
	if invalidParents > 0 {
		return fmt.Errorf("found %d parent accounts with children but is_postable=true", invalidParents)
	}
	log.Println("    ✓ Parent/child postable consistency is valid")

	log.Println("  [6/8] Checking system account mappings integrity...")
	requiredSystemMappings := []string{
		"purchase.inventory_asset",
		"purchase.gr_ir_clearing",
		"purchase.tax_input",
		"purchase.accounts_payable",
		"sales.accounts_receivable",
		"sales.revenue",
		"sales.tax_output",
		"sales.cogs",
		"sales.sales_return",
		"inventory.adjustment_gain",
		"inventory.adjustment_loss",
		"asset.accumulated_depreciation",
		"asset.depreciation_expense",
		"finance.opening_balance_equity",
		"finance.bank_default",
		"finance.cash_default",
		"payroll.salary_expense",
		"payroll.allowance_expense",
		"payroll.payable_salary",
		"payroll.tax_pph21",
	}
	for _, key := range requiredSystemMappings {
		var mapping models.SystemAccountMapping
		if err := db.Where("key = ? AND company_id IS NULL", key).First(&mapping).Error; err != nil {
			return fmt.Errorf("required system mapping key not found: %s", key)
		}
		coa, err := coaRepo.FindByCode(ctx, mapping.COACode)
		if err != nil || coa == nil {
			return fmt.Errorf("system mapping %s points to invalid COA code %s", key, mapping.COACode)
		}
		if !coa.IsPostable {
			return fmt.Errorf("system mapping %s points to non-postable COA %s", key, mapping.COACode)
		}
	}
	log.Println("    ✓ System account mappings are valid and postable")

	log.Println("  [7/8] Checking opening balance equity protection...")
	openingBalanceEquity, err := coaRepo.FindByCode(ctx, "3-9999")
	if err != nil || openingBalanceEquity == nil {
		return fmt.Errorf("opening balance equity account 3-9999 is missing")
	}
	if !openingBalanceEquity.IsProtected {
		return fmt.Errorf("opening balance equity account 3-9999 must be is_protected=true")
	}
	if !openingBalanceEquity.IsPostable {
		return fmt.Errorf("opening balance equity account 3-9999 must be is_postable=true")
	}
	log.Println("    ✓ Opening balance equity account is present and protected")

	log.Println("  [8/8] Checking account type coverage...")
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
			Where("type = ? AND is_active = ?", accType, true).
			Count(&count).Error; err != nil {
			return fmt.Errorf("failed to check %s accounts: %w", accType, err)
		}
		if count == 0 {
			log.Printf("    ⚠ WARNING: No active %s accounts found", accType)
		}
	}
	log.Println("    ✓ Account type coverage looks good")

	log.Println("✓ Finance Seeder validation PASSED - all invariants satisfied")
	return nil
}

func countOrphanAccounts() (int64, error) {
	var count int64
	err := database.DB.Raw(`
		SELECT COUNT(*)
		FROM chart_of_accounts c
		LEFT JOIN chart_of_accounts p ON p.id = c.parent_id AND p.deleted_at IS NULL
		WHERE c.deleted_at IS NULL
		  AND c.parent_id IS NOT NULL
		  AND p.id IS NULL
	`).Scan(&count).Error
	if err != nil {
		return 0, fmt.Errorf("failed to count orphan accounts: %w", err)
	}
	return count, nil
}

func countPostableParentsWithChildren() (int64, error) {
	var count int64
	err := database.DB.Raw(`
		SELECT COUNT(*)
		FROM chart_of_accounts p
		WHERE p.deleted_at IS NULL
		  AND p.is_postable = TRUE
		  AND (
			p.parent_id IS NULL
			OR EXISTS (
				SELECT 1
				FROM chart_of_accounts c
				WHERE c.parent_id = p.id
				  AND c.deleted_at IS NULL
			)
		  )
	`).Scan(&count).Error
	if err != nil {
		return 0, fmt.Errorf("failed to count invalid postable parents: %w", err)
	}
	return count, nil
}

func hasCircularReference() (bool, error) {
	type coaNode struct {
		ID       string
		ParentID *string
	}
	var rows []coaNode
	if err := database.DB.Model(&models.ChartOfAccount{}).
		Select("id", "parent_id").
		Where("deleted_at IS NULL").
		Find(&rows).Error; err != nil {
		return false, fmt.Errorf("failed to load chart_of_accounts hierarchy: %w", err)
	}

	parentByID := make(map[string]string, len(rows))
	for _, row := range rows {
		if row.ParentID != nil && strings.TrimSpace(*row.ParentID) != "" {
			parentByID[row.ID] = strings.TrimSpace(*row.ParentID)
		}
	}

	visitState := make(map[string]int, len(rows))
	var dfs func(id string) bool
	dfs = func(id string) bool {
		if visitState[id] == 1 {
			return true
		}
		if visitState[id] == 2 {
			return false
		}
		visitState[id] = 1
		parent, hasParent := parentByID[id]
		if hasParent && dfs(parent) {
			return true
		}
		visitState[id] = 2
		return false
	}

	for _, row := range rows {
		if dfs(row.ID) {
			return true, nil
		}
	}
	return false, nil
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

	ctx := context.Background()
	coaRepo := repositories.NewChartOfAccountRepository(db)
	coa, err := coaRepo.FindByCode(ctx, setting.Value)
	if err != nil || coa == nil {
		return fmt.Errorf("setting %s references invalid COA code %s", settingKey, setting.Value)
	}

	return nil
}
