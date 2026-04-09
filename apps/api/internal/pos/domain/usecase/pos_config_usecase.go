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

// POSConfigUsecase manages POS configuration per outlet.
type POSConfigUsecase interface {
// GetOrCreate returns the existing config or creates a default one if absent.
GetOrCreate(ctx context.Context, outletID string) (*dto.POSConfigResponse, error)
// Upsert creates or updates the POS config for the given outlet.
Upsert(ctx context.Context, outletID string, req *dto.UpsertPOSConfigRequest, userID string) (*dto.POSConfigResponse, error)
}

type posConfigUsecase struct {
repo repositories.POSConfigRepository
}

// NewPOSConfigUsecase constructs a POSConfigUsecase.
func NewPOSConfigUsecase(repo repositories.POSConfigRepository) POSConfigUsecase {
return &posConfigUsecase{repo: repo}
}

func (u *posConfigUsecase) GetOrCreate(ctx context.Context, outletID string) (*dto.POSConfigResponse, error) {
cfg, err := u.repo.FindByOutletID(ctx, outletID)
if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
return nil, err
}
if cfg == nil {
// Auto-create a sensible default config for the outlet
cfg = &posModels.POSConfig{
OutletID:           outletID,
TaxRate:            0.11, // 11% VAT (Indonesia default)
ServiceChargeRate:  0,
AllowDiscount:      true,
MaxDiscountPercent: 100,
PrintReceiptAuto:   false,
Currency:           "IDR",
}
if upsertErr := u.repo.Upsert(ctx, cfg); upsertErr != nil {
return nil, upsertErr
}
// Re-fetch to get the generated ID and timestamps
cfg, err = u.repo.FindByOutletID(ctx, outletID)
if err != nil {
return nil, err
}
}
return mapper.ToPOSConfigResponse(cfg), nil
}

func (u *posConfigUsecase) Upsert(ctx context.Context, outletID string, req *dto.UpsertPOSConfigRequest, userID string) (*dto.POSConfigResponse, error) {
	// Start from existing config or defaults so partial updates don't zero out fields
	existing, _ := u.repo.FindByOutletID(ctx, outletID)

	cfg := &posModels.POSConfig{OutletID: outletID}
	if existing != nil {
		cfg.TaxRate = existing.TaxRate
		cfg.ServiceChargeRate = existing.ServiceChargeRate
		cfg.AllowDiscount = existing.AllowDiscount
		cfg.MaxDiscountPercent = existing.MaxDiscountPercent
		cfg.PrintReceiptAuto = existing.PrintReceiptAuto
		cfg.ReceiptFooter = existing.ReceiptFooter
		cfg.Currency = existing.Currency
	} else {
		cfg.Currency = "IDR"
		cfg.AllowDiscount = true
	}

	if req.TaxRate != nil {
		cfg.TaxRate = *req.TaxRate
	}
	if req.ServiceChargeRate != nil {
		cfg.ServiceChargeRate = *req.ServiceChargeRate
	}
	if req.AllowDiscount != nil {
		cfg.AllowDiscount = *req.AllowDiscount
	}
	if req.MaxDiscountPercent != nil {
		cfg.MaxDiscountPercent = *req.MaxDiscountPercent
	}
	if req.PrintReceiptAuto != nil {
		cfg.PrintReceiptAuto = *req.PrintReceiptAuto
	}
	if req.ReceiptFooter != nil {
		cfg.ReceiptFooter = req.ReceiptFooter
	}
	if req.Currency != nil {
		cfg.Currency = *req.Currency
	}

	if err := u.repo.Upsert(ctx, cfg); err != nil {
		return nil, err
	}

	saved, err := u.repo.FindByOutletID(ctx, outletID)
	if err != nil {
		return nil, err
	}
	return mapper.ToPOSConfigResponse(saved), nil
}
