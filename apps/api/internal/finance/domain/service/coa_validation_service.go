package service

import (
	"context"
	"fmt"
	"strings"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
)

// COAValidationService validates that required COA settings are configured before journal posting.
type COAValidationService interface {
	// ValidateRequiredSettings ensures all given COA setting keys exist in finance_settings.
	// Returns error with clear message listing missing keys.
	ValidateRequiredSettings(ctx context.Context, requiredKeys ...string) error

	// ValidateSetting checks if a single COA setting exists.
	ValidateSetting(ctx context.Context, settingKey string) error

	// EnsureInventoryValuationCOAs validates all COAs needed for inventory valuation.
	EnsureInventoryValuationCOAs(ctx context.Context) error

	// EnsureAssetCOAs validates all COAs needed for asset transactions.
	EnsureAssetCOAs(ctx context.Context) error

	// EnsureSalesOrderCOAs validates all COAs needed for sales orders.
	EnsureSalesOrderCOAs(ctx context.Context) error

	// EnsurePurchaseOrderCOAs validates all COAs needed for purchase orders.
	EnsurePurchaseOrderCOAs(ctx context.Context) error
}

type coaValidationService struct {
	settingsRepo repositories.FinanceSettingRepository
	mappingRepo  repositories.SystemAccountMappingRepository
}

func NewCOAValidationService(settingsRepo repositories.FinanceSettingRepository, mappingRepo ...repositories.SystemAccountMappingRepository) COAValidationService {
	s := &coaValidationService{settingsRepo: settingsRepo}
	if len(mappingRepo) > 0 {
		s.mappingRepo = mappingRepo[0]
	}
	return s
}

// ValidateRequiredSettings ensures all given COA setting keys exist.
// Returns error with comma-separated list of missing keys.
func (s *coaValidationService) ValidateRequiredSettings(ctx context.Context, requiredKeys ...string) error {
	if len(requiredKeys) == 0 {
		return nil
	}

	var missing []string
	for _, key := range requiredKeys {
		if err := s.ValidateSetting(ctx, strings.TrimSpace(key)); err != nil {
			missing = append(missing, key)
		}
	}

	if len(missing) > 0 {
		return fmt.Errorf("missing required COA settings: %s. Please configure these in Finance → Settings", strings.Join(missing, ", "))
	}

	return nil
}

// ValidateSetting checks if a single COA setting exists and has a value.
func (s *coaValidationService) ValidateSetting(ctx context.Context, settingKey string) error {
	if strings.TrimSpace(settingKey) == "" {
		return fmt.Errorf("setting key cannot be empty")
	}

	normalizedKey := strings.TrimSpace(settingKey)

	if s.mappingRepo != nil {
		for _, mappingKey := range coaValidationMappingKeys(normalizedKey) {
			if coaCode, err := s.mappingRepo.GetByKey(ctx, mappingKey, nil); err == nil && strings.TrimSpace(coaCode) != "" {
				return nil
			}
		}
	}

	setting, err := s.settingsRepo.FindByKey(ctx, normalizedKey)
	if err != nil {
		return fmt.Errorf("setting '%s' not found: %w", normalizedKey, err)
	}

	if setting == nil {
		return fmt.Errorf("setting '%s' not configured", normalizedKey)
	}

	if strings.TrimSpace(setting.Value) == "" {
		return fmt.Errorf("setting '%s' is empty - please configure COA code in Finance → Settings", normalizedKey)
	}

	return nil
}

func coaValidationMappingKeys(settingKey string) []string {
	keys := make([]string, 0, 2)
	switch strings.TrimSpace(settingKey) {
	case "coa.inventory", "coa.inventory_asset":
		keys = append(keys, "purchase.inventory_asset")
	case "coa.gr_ir", "coa.purchase_gr_ir":
		keys = append(keys, "purchase.gr_ir_clearing")
	case "coa.purchase_vat_in", "coa.vat_in":
		keys = append(keys, "purchase.tax_input")
	case "coa.purchase_payable", "coa.accounts_payable":
		keys = append(keys, "purchase.accounts_payable")
	case "coa.sales_receivable":
		keys = append(keys, "sales.accounts_receivable")
	case "coa.sales_revenue":
		keys = append(keys, "sales.revenue")
	case "coa.sales_vat_out":
		keys = append(keys, "sales.tax_output")
	case "coa.sales_cogs", "coa.cogs":
		keys = append(keys, "sales.cogs")
	case "coa.sales_return":
		keys = append(keys, "sales.sales_return")
	case "coa.inventory_gain":
		keys = append(keys, "inventory.adjustment_gain")
	case "coa.inventory_loss":
		keys = append(keys, "inventory.adjustment_loss")
	case "coa.depreciation_accumulated":
		keys = append(keys, "asset.accumulated_depreciation")
	case "coa.depreciation_expense":
		keys = append(keys, "asset.depreciation_expense")
	case "coa.bank":
		keys = append(keys, "finance.bank_default")
	case "coa.cash":
		keys = append(keys, "finance.cash_default")
	}

	keys = append(keys, strings.TrimSpace(settingKey))
	return keys
}

// EnsureInventoryValuationCOAs validates COAs for inventory valuation.
// Required: inventory_asset, cogs, inventory_gain, inventory_loss, inventory_revaluation_reserve, fx_gain, fx_loss, fx_remeasurement, depreciation_expense, depreciation_accumulated
func (s *coaValidationService) EnsureInventoryValuationCOAs(ctx context.Context) error {
	requiredKeys := []string{
		financeModels.SettingCOAInventoryAsset,
		financeModels.SettingCOACOGS,
		financeModels.SettingCOAInventoryGain,
		financeModels.SettingCOAInventoryLoss,
		financeModels.SettingCOAInventoryRevaluationReserve,
		financeModels.SettingCOAFXGain,
		financeModels.SettingCOAFXLoss,
		financeModels.SettingCOAFXRemeasurement,
		financeModels.SettingCOADepreciationExpense,
		financeModels.SettingCOADepreciationAccumulated,
	}
	return s.ValidateRequiredSettings(ctx, requiredKeys...)
}

// EnsureAssetCOAs validates COAs for asset transactions.
// Required: fixed_asset, depreciation_expense, depreciation_accumulated
func (s *coaValidationService) EnsureAssetCOAs(ctx context.Context) error {
	requiredKeys := []string{
		financeModels.SettingCOAFixedAsset,
		financeModels.SettingCOADepreciationExpense,
		financeModels.SettingCOADepreciationAccumulated,
	}
	return s.ValidateRequiredSettings(ctx, requiredKeys...)
}

// EnsureSalesOrderCOAs validates COAs for sales orders.
// Required: sales_revenue, sales_receivable, sales_advance, cogs, inventory_asset
func (s *coaValidationService) EnsureSalesOrderCOAs(ctx context.Context) error {
	requiredKeys := []string{
		financeModels.SettingCOASalesRevenue,
		financeModels.SettingCOASalesReceivable,
		financeModels.SettingCOASalesAdvance,
		financeModels.SettingCOACOGS,
		financeModels.SettingCOAInventoryAsset,
	}
	return s.ValidateRequiredSettings(ctx, requiredKeys...)
}

// EnsurePurchaseOrderCOAs validates COAs for purchase orders.
// Required: purchase_payable, purchase_advance, gr_ir, vat_in, cogs, inventory_asset
func (s *coaValidationService) EnsurePurchaseOrderCOAs(ctx context.Context) error {
	requiredKeys := []string{
		financeModels.SettingCOAPurchasePayable,
		financeModels.SettingCOAPurchaseAdvance,
		financeModels.SettingCOAGoodReceiptInvoiceReceipt,
		financeModels.SettingCOAVATIn,
		financeModels.SettingCOACOGS,
		financeModels.SettingCOAInventoryAsset,
	}
	return s.ValidateRequiredSettings(ctx, requiredKeys...)
}
