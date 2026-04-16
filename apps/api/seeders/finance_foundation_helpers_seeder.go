package seeders

import (
	"context"
	"fmt"
	"strings"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	"gorm.io/gorm"
)

func findPTGiLabsCompanyID(db *gorm.DB) (string, error) {
	var company orgModels.Company

	err := db.Where("LOWER(name) LIKE ?", "%gilabs%").Where("is_active = ?", true).First(&company).Error
	if err == nil {
		return company.ID, nil
	}
	if err != nil && err != gorm.ErrRecordNotFound {
		return "", fmt.Errorf("failed to query PT. GiLabs company: %w", err)
	}

	if fallbackErr := db.Where("id = ?", GiLabsCompanyID).First(&company).Error; fallbackErr != nil {
		return "", fmt.Errorf("PT. GiLabs company not found in master data: %w", fallbackErr)
	}

	return company.ID, nil
}

func findCOAByCandidates(ctx context.Context, repo repositories.ChartOfAccountRepository, codes ...string) (*financeModels.ChartOfAccount, error) {
	var lastErr error
	for _, code := range codes {
		coa, err := repo.FindByCode(ctx, strings.TrimSpace(code))
		if err == nil && coa != nil {
			return coa, nil
		}
		lastErr = err
	}

	if lastErr != nil {
		return nil, lastErr
	}
	return nil, fmt.Errorf("coa not found for candidate codes: %v", codes)
}
