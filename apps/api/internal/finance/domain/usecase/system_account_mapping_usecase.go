package usecase

import (
	"context"
	"fmt"

	"github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
)

type SystemAccountMappingUsecase interface {
	GetAccountID(ctx context.Context, key string, companyID *string) (string, error)
	Upsert(ctx context.Context, key, coaCode, label string, companyID *string) error
}

type systemAccountMappingUsecase struct {
	repo  repositories.SystemAccountMappingRepository
	coaUC ChartOfAccountUsecase
}

func NewSystemAccountMappingUsecase(repo repositories.SystemAccountMappingRepository, coaUC ChartOfAccountUsecase) SystemAccountMappingUsecase {
	return &systemAccountMappingUsecase{repo: repo, coaUC: coaUC}
}

func (uc *systemAccountMappingUsecase) GetAccountID(ctx context.Context, key string, companyID *string) (string, error) {
	code, err := uc.repo.GetByKey(ctx, key, companyID)
	if err != nil {
		return "", fmt.Errorf("mapping for key %s not found: %w", key, err)
	}

	coa, err := uc.coaUC.GetByCode(ctx, code)
	if err != nil {
		return "", fmt.Errorf("account with code %s not found for mapping %s: %w", code, key, err)
	}

	return coa.ID, nil
}

func (uc *systemAccountMappingUsecase) Upsert(ctx context.Context, key, coaCode, label string, companyID *string) error {
	m := &models.SystemAccountMapping{
		Key:       key,
		COACode:   coaCode,
		Label:     label,
		CompanyID: companyID,
	}
	return uc.repo.Upsert(ctx, m)
}
