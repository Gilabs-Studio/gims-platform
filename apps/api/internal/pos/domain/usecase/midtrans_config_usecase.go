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

var ErrXenditConfigNotFound = errors.New("xendit config not found")

// XenditConfigUsecase manages per-company Xendit payment gateway settings
type XenditConfigUsecase interface {
	Get(ctx context.Context, companyID string) (*dto.XenditConfigResponse, error)
	GetConnectionStatus(ctx context.Context, companyID string) (*dto.XenditConnectionStatusResponse, error)
	Connect(ctx context.Context, companyID string, req *dto.ConnectXenditRequest, updatedBy string) (*dto.XenditConfigResponse, error)
	Update(ctx context.Context, companyID string, req *dto.UpdateXenditConfigRequest, updatedBy string) (*dto.XenditConfigResponse, error)
	Disconnect(ctx context.Context, companyID string, updatedBy string) (*dto.XenditConfigResponse, error)
}

type xenditConfigUsecase struct {
	repo repositories.XenditConfigRepository
}

// NewXenditConfigUsecase creates the usecase
func NewXenditConfigUsecase(repo repositories.XenditConfigRepository) XenditConfigUsecase {
	return &xenditConfigUsecase{repo: repo}
}

func (u *xenditConfigUsecase) Get(ctx context.Context, companyID string) (*dto.XenditConfigResponse, error) {
	cfg, err := u.repo.FindByCompanyID(ctx, companyID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrXenditConfigNotFound
		}
		return nil, err
	}
	return mapper.ToXenditConfigResponse(cfg), nil
}

func (u *xenditConfigUsecase) GetConnectionStatus(ctx context.Context, companyID string) (*dto.XenditConnectionStatusResponse, error) {
	cfg, err := u.repo.FindByCompanyID(ctx, companyID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &dto.XenditConnectionStatusResponse{
				IsConnected: false,
				Status:      string(posModels.XenditStatusNotConnected),
			}, nil
		}
		return nil, err
	}
	return &dto.XenditConnectionStatusResponse{
		IsConnected: cfg.IsConnected(),
		Status:      string(cfg.ConnectionStatus),
	}, nil
}

func (u *xenditConfigUsecase) Connect(ctx context.Context, companyID string, req *dto.ConnectXenditRequest, updatedBy string) (*dto.XenditConfigResponse, error) {
	cfg := &posModels.XenditConfig{
		CompanyID:        companyID,
		SecretKey:        req.SecretKey,
		XenditAccountID:  req.XenditAccountID,
		BusinessName:     req.BusinessName,
		Environment:      posModels.XenditEnvironment(req.Environment),
		WebhookToken:     req.WebhookToken,
		ConnectionStatus: posModels.XenditStatusConnected,
		IsActive:         true,
		UpdatedBy:        &updatedBy,
	}

	if err := u.repo.Upsert(ctx, cfg); err != nil {
		return nil, err
	}

	saved, err := u.repo.FindByCompanyID(ctx, companyID)
	if err != nil {
		return nil, err
	}
	return mapper.ToXenditConfigResponse(saved), nil
}

func (u *xenditConfigUsecase) Update(ctx context.Context, companyID string, req *dto.UpdateXenditConfigRequest, updatedBy string) (*dto.XenditConfigResponse, error) {
	existing, err := u.repo.FindByCompanyID(ctx, companyID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrXenditConfigNotFound
		}
		return nil, err
	}

	if req.Environment != "" {
		existing.Environment = posModels.XenditEnvironment(req.Environment)
	}
	if req.BusinessName != "" {
		existing.BusinessName = req.BusinessName
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}
	existing.UpdatedBy = &updatedBy

	if err := u.repo.Upsert(ctx, existing); err != nil {
		return nil, err
	}

	saved, err := u.repo.FindByCompanyID(ctx, companyID)
	if err != nil {
		return nil, err
	}
	return mapper.ToXenditConfigResponse(saved), nil
}

func (u *xenditConfigUsecase) Disconnect(ctx context.Context, companyID string, updatedBy string) (*dto.XenditConfigResponse, error) {
	existing, err := u.repo.FindByCompanyID(ctx, companyID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrXenditConfigNotFound
		}
		return nil, err
	}

	existing.ConnectionStatus = posModels.XenditStatusNotConnected
	existing.IsActive = false
	existing.SecretKey = ""
	existing.WebhookToken = ""
	existing.UpdatedBy = &updatedBy

	if err := u.repo.Upsert(ctx, existing); err != nil {
		return nil, err
	}

	saved, err := u.repo.FindByCompanyID(ctx, companyID)
	if err != nil {
		return nil, err
	}
	return mapper.ToXenditConfigResponse(saved), nil
}

