package financesettings

import (
	"context"
	"fmt"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
)

// SettingsService provides typed accessors for finance settings.
// It wraps the raw key-value repository and provides meaningful errors
// when required configuration is missing.
type SettingsService interface {
	// GetCOACode resolves a COA code for the given setting key.
	// Example: GetCOACode(ctx, models.SettingCOANonTradePayable) → "21200"
	GetCOACode(ctx context.Context, settingKey string) (string, error)

	// GetValue returns the raw value for a given setting key.
	GetValue(ctx context.Context, settingKey string) (string, error)

	// GetAll returns all finance settings.
	GetAll(ctx context.Context) ([]financeModels.FinanceSetting, error)

	// Upsert creates or updates a setting.
	Upsert(ctx context.Context, key, value, description, category string) error
}

type settingsService struct {
	repo repositories.FinanceSettingRepository
}

// NewSettingsService creates a new finance settings service.
func NewSettingsService(repo repositories.FinanceSettingRepository) SettingsService {
	return &settingsService{repo: repo}
}

// GetCOACode resolves a COA code from settings.
// Returns a descriptive error if the setting is missing.
func (s *settingsService) GetCOACode(ctx context.Context, settingKey string) (string, error) {
	value, err := s.repo.GetByKey(ctx, settingKey)
	if err != nil {
		return "", fmt.Errorf("finance setting '%s' not configured: %w — run the finance settings seeder or configure it via admin", settingKey, err)
	}
	if value == "" {
		return "", fmt.Errorf("finance setting '%s' is empty — please configure a valid COA code", settingKey)
	}
	return value, nil
}

// GetValue returns the raw setting value.
func (s *settingsService) GetValue(ctx context.Context, settingKey string) (string, error) {
	return s.repo.GetByKey(ctx, settingKey)
}

// GetAll returns all finance settings.
func (s *settingsService) GetAll(ctx context.Context) ([]financeModels.FinanceSetting, error) {
	return s.repo.GetAll(ctx)
}

// Upsert creates or updates a finance setting.
func (s *settingsService) Upsert(ctx context.Context, key, value, description, category string) error {
	return s.repo.Upsert(ctx, key, value, description, category)
}
