package service

import (
	"context"
	"testing"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type fakeFinanceSettingRepository struct {
	settings map[string]*financeModels.FinanceSetting
}

func (f *fakeFinanceSettingRepository) GetByKey(ctx context.Context, key string) (string, error) {
	if setting, ok := f.settings[key]; ok {
		return setting.Value, nil
	}
	return "", gorm.ErrRecordNotFound
}

func (f *fakeFinanceSettingRepository) FindByKey(ctx context.Context, key string) (*financeModels.FinanceSetting, error) {
	if setting, ok := f.settings[key]; ok {
		return setting, nil
	}
	return nil, nil
}

func (f *fakeFinanceSettingRepository) GetAll(ctx context.Context) ([]financeModels.FinanceSetting, error) {
	settings := make([]financeModels.FinanceSetting, 0, len(f.settings))
	for _, setting := range f.settings {
		settings = append(settings, *setting)
	}
	return settings, nil
}

func (f *fakeFinanceSettingRepository) Upsert(ctx context.Context, key, value, description, category string) error {
	if f.settings == nil {
		f.settings = make(map[string]*financeModels.FinanceSetting)
	}
	f.settings[key] = &financeModels.FinanceSetting{
		SettingKey:  key,
		Value:       value,
		Description: description,
		Category:    category,
	}
	return nil
}

type fakeSystemAccountMappingRepository struct {
	values map[string]string
}

func (f *fakeSystemAccountMappingRepository) GetByKey(ctx context.Context, key string, companyID *string) (string, error) {
	if value, ok := f.values[key]; ok {
		return value, nil
	}
	return "", gorm.ErrRecordNotFound
}

func (f *fakeSystemAccountMappingRepository) GetMappingByKey(ctx context.Context, key string, companyID *string) (*financeModels.SystemAccountMapping, error) {
	value, err := f.GetByKey(ctx, key, companyID)
	if err != nil {
		return nil, err
	}
	return &financeModels.SystemAccountMapping{Key: key, COACode: value}, nil
}

func (f *fakeSystemAccountMappingRepository) GetExactMappingByKey(ctx context.Context, key string, companyID *string) (*financeModels.SystemAccountMapping, error) {
	return f.GetMappingByKey(ctx, key, companyID)
}

func (f *fakeSystemAccountMappingRepository) ListMappings(ctx context.Context, companyID *string) ([]financeModels.SystemAccountMapping, error) {
	mappings := make([]financeModels.SystemAccountMapping, 0, len(f.values))
	for key, value := range f.values {
		mappings = append(mappings, financeModels.SystemAccountMapping{Key: key, COACode: value})
	}
	return mappings, nil
}

func (f *fakeSystemAccountMappingRepository) DeleteByKey(ctx context.Context, key string, companyID *string) error {
	delete(f.values, key)
	return nil
}

func (f *fakeSystemAccountMappingRepository) Upsert(ctx context.Context, mapping *financeModels.SystemAccountMapping) error {
	if f.values == nil {
		f.values = make(map[string]string)
	}
	f.values[mapping.Key] = mapping.COACode
	return nil
}

func TestCOAValidationServiceAcceptsSystemAccountMappings(t *testing.T) {
	svc := NewCOAValidationService(
		&fakeFinanceSettingRepository{},
		&fakeSystemAccountMappingRepository{values: map[string]string{
			"coa.purchase_payable":    "21100",
			"coa.purchase_advance":    "11410",
			"coa.gr_ir":               "91100",
			"coa.purchase_price_diff": "51300",
			"coa.purchase_vat_in":     "21200",
			"coa.purchase_expense":    "61300",
		}},
	)

	err := svc.ValidateRequiredSettings(
		context.Background(),
		"coa.purchase_payable",
		"coa.purchase_advance",
		"coa.gr_ir",
		"coa.purchase_price_diff",
		"coa.purchase_vat_in",
		"coa.purchase_expense",
	)
	if err != nil {
		t.Fatalf("expected mappings to satisfy COA validation, got %v", err)
	}
}

