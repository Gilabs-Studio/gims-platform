package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/middleware"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	financeRepositories "github.com/gilabs/gims/api/internal/finance/data/repositories"
	"gorm.io/gorm"
)

// EnsureDefaultActiveFiscalYear creates the first fiscal year automatically for a company
// when no fiscal years exist yet. Existing companies with draft/locked fiscal years are left unchanged.
func EnsureDefaultActiveFiscalYear(
	ctx context.Context,
	repo financeRepositories.FiscalYearRepository,
	companyID string,
	createdBy *string,
) (*financeModels.FiscalYear, error) {
	if repo == nil {
		return nil, errors.New("fiscal year repository is nil")
	}

	companyID = strings.TrimSpace(companyID)
	if companyID == "" {
		return nil, errors.New("company id is required")
	}

	active, err := repo.FindActiveByCompany(ctx, companyID)
	if err == nil && active != nil {
		return active, nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	_, total, err := repo.List(ctx, financeRepositories.FiscalYearListParams{
		CompanyID: companyID,
		Page:      1,
		PerPage:   1,
	})
	if err != nil {
		return nil, err
	}
	if total > 0 {
		return nil, gorm.ErrRecordNotFound
	}

	now := apptime.Now()
	startDate := time.Date(now.Year(), time.January, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(now.Year(), time.December, 31, 0, 0, 0, 0, time.UTC)
	tenantID := strings.TrimSpace(middleware.TenantFromContext(ctx))

	item := &financeModels.FiscalYear{
		TenantID:  tenantID,
		CompanyID: companyID,
		Name:      fmt.Sprintf("FY %d", now.Year()),
		StartDate: startDate,
		EndDate:   endDate,
		Status:    financeModels.FiscalYearStatusActive,
		CreatedBy: createdBy,
	}
	if err := repo.Create(ctx, item); err != nil {
		return nil, err
	}

	return item, nil
}
