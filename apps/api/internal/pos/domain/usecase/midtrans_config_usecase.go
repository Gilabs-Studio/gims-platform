package usecase

import (
	"context"
	"errors"

	posModels "github.com/gilabs/gims/api/internal/pos/data/models"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/gilabs/gims/api/internal/pos/domain/mapper"
	"gorm.io/gorm"
)

var ErrMidtransConfigNotFound = errors.New("midtrans config not found")

// MidtransConfigUsecase manages per-company Midtrans payment gateway settings
type MidtransConfigUsecase interface {
	Get(ctx context.Context, companyID string) (*dto.MidtransConfigResponse, error)
	Upsert(ctx context.Context, companyID string, req *dto.UpsertMidtransConfigRequest, updatedBy string) (*dto.MidtransConfigResponse, error)
}

type midtransConfigUsecase struct {
	repo repositories.MidtransConfigRepository
}

// NewMidtransConfigUsecase creates the usecase
func NewMidtransConfigUsecase(repo repositories.MidtransConfigRepository) MidtransConfigUsecase {
	return &midtransConfigUsecase{repo: repo}
}

func (u *midtransConfigUsecase) Get(ctx context.Context, companyID string) (*dto.MidtransConfigResponse, error) {
	cfg, err := u.repo.FindByCompanyID(ctx, companyID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrMidtransConfigNotFound
		}
		return nil, err
	}
	return mapper.ToMidtransConfigResponse(cfg), nil
}

func (u *midtransConfigUsecase) Upsert(ctx context.Context, companyID string, req *dto.UpsertMidtransConfigRequest, updatedBy string) (*dto.MidtransConfigResponse, error) {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	cfg := &posModels.MidtransConfig{
		CompanyID:   companyID,
		ServerKey:   req.ServerKey,
		ClientKey:   req.ClientKey,
		MerchantID:  req.MerchantID,
		Environment: posModels.MidtransEnvironment(req.Environment),
		IsActive:    isActive,
	}

	if err := u.repo.Upsert(ctx, cfg); err != nil {
		return nil, err
	}

	// Re-fetch to get generated ID and timestamps
	saved, err := u.repo.FindByCompanyID(ctx, companyID)
	if err != nil {
		return nil, err
	}
	return mapper.ToMidtransConfigResponse(saved), nil
}
