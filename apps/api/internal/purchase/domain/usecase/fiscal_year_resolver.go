package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	financeRepositories "github.com/gilabs/gims/api/internal/finance/data/repositories"
	"gorm.io/gorm"
)

var (
	ErrPurchaseCompanyRequired          = errors.New("purchase company is required")
	ErrPurchaseCompanyIDRequired        = errors.New("company id is required")
	ErrActivePurchaseFiscalYearRequired = errors.New("active fiscal year is required")
)

type purchaseFiscalYearResolver struct {
	db             *gorm.DB
	fiscalYearRepo financeRepositories.FiscalYearRepository
}

func newPurchaseFiscalYearResolver(db *gorm.DB, fiscalYearRepo financeRepositories.FiscalYearRepository) *purchaseFiscalYearResolver {
	return &purchaseFiscalYearResolver{db: db, fiscalYearRepo: fiscalYearRepo}
}

func (r *purchaseFiscalYearResolver) Resolve(ctx context.Context, referenceDate string) (string, string, error) {
	companyID, err := r.resolveCompanyID(ctx)
	if err != nil {
		return "", "", err
	}

	fiscalYearID, err := r.resolveFiscalYearID(ctx, companyID, referenceDate)
	if err != nil {
		return "", "", err
	}

	return companyID, fiscalYearID, nil
}

func (r *purchaseFiscalYearResolver) resolveCompanyID(ctx context.Context) (string, error) {
	if ctxCompanyID, _ := ctx.Value("company_id").(string); strings.TrimSpace(ctxCompanyID) != "" {
		return strings.TrimSpace(ctxCompanyID), nil
	}

	userID, _ := ctx.Value("user_id").(string)
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return "", errors.New("user not authenticated")
	}

	var companyID string
	if err := database.GetDB(ctx, r.db).
		Table("employees").
		Select("company_id").
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Scan(&companyID).Error; err != nil {
		return "", fmt.Errorf("failed to resolve purchase company: %w", err)
	}
	companyID = strings.TrimSpace(companyID)
	if companyID == "" {
		tenantID, _ := ctx.Value("tenant_id").(string)
		tenantID = strings.TrimSpace(tenantID)
		if tenantID == "" {
			return "", ErrPurchaseCompanyRequired
		}

		if err := database.GetDB(ctx, r.db).
			Model(&orgModels.Company{}).
			Select("id").
			Where("tenant_id = ? AND deleted_at IS NULL", tenantID).
			Order("created_at ASC").
			Limit(1).
			Scan(&companyID).Error; err != nil {
			return "", fmt.Errorf("failed to resolve purchase company from tenant: %w", err)
		}
		companyID = strings.TrimSpace(companyID)
		if companyID == "" {
			return "", ErrPurchaseCompanyRequired
		}
	}

	return companyID, nil
}

func (r *purchaseFiscalYearResolver) resolveFiscalYearID(ctx context.Context, companyID string, referenceDate string) (string, error) {
	companyID = strings.TrimSpace(companyID)
	if companyID == "" {
		return "", ErrPurchaseCompanyIDRequired
	}

	resolvedDate := strings.TrimSpace(referenceDate)
	if resolvedDate == "" {
		resolvedDate = apptime.Now().Format("2006-01-02")
	} else if _, err := time.Parse("2006-01-02", resolvedDate); err != nil {
		resolvedDate = apptime.Now().Format("2006-01-02")
	}

	fiscalYear, err := r.fiscalYearRepo.FindActiveByCompany(ctx, companyID)
	if err != nil {
		return "", fmt.Errorf("%w: company %s on %s", ErrActivePurchaseFiscalYearRequired, companyID, resolvedDate)
	}
	if fiscalYear == nil || strings.TrimSpace(fiscalYear.ID) == "" {
		return "", ErrActivePurchaseFiscalYearRequired
	}

	return strings.TrimSpace(fiscalYear.ID), nil
}

func resolvePurchaseJournalScope(
	ctx context.Context,
	db *gorm.DB,
	companyID *string,
	fiscalYearID *string,
	referenceDate string,
) (string, *string, error) {
	if db == nil {
		return "", nil, errors.New("db is nil")
	}

	resolvedCompanyID := ""
	if companyID != nil {
		resolvedCompanyID = strings.TrimSpace(*companyID)
	}

	var resolvedFiscalYearID *string
	if fiscalYearID != nil {
		trimmedFiscalYearID := strings.TrimSpace(*fiscalYearID)
		if trimmedFiscalYearID != "" {
			resolvedFiscalYearID = &trimmedFiscalYearID
		}
	}

	resolver := newPurchaseFiscalYearResolver(db, financeRepositories.NewFiscalYearRepository(db))

	if resolvedCompanyID == "" {
		companyFromContext, fiscalYearFromContext, err := resolver.Resolve(ctx, referenceDate)
		if err != nil {
			return "", nil, err
		}

		resolvedCompanyID = strings.TrimSpace(companyFromContext)
		if resolvedFiscalYearID == nil {
			trimmedFiscalYearID := strings.TrimSpace(fiscalYearFromContext)
			if trimmedFiscalYearID != "" {
				resolvedFiscalYearID = &trimmedFiscalYearID
			}
		}
	} else if resolvedFiscalYearID == nil {
		fiscalYearFromCompany, err := resolver.resolveFiscalYearID(ctx, resolvedCompanyID, referenceDate)
		if err != nil {
			return "", nil, err
		}

		trimmedFiscalYearID := strings.TrimSpace(fiscalYearFromCompany)
		if trimmedFiscalYearID != "" {
			resolvedFiscalYearID = &trimmedFiscalYearID
		}
	}

	if resolvedCompanyID == "" {
		return "", nil, ErrPurchaseCompanyRequired
	}

	return resolvedCompanyID, resolvedFiscalYearID, nil
}
