package usecase

import (
	"context"

	"github.com/gilabs/gims/api/internal/purchase/data/repositories"
	"github.com/gilabs/gims/api/internal/purchase/domain/dto"
	"github.com/gilabs/gims/api/internal/purchase/domain/mapper"
)

type PurchaseRequisitionUsecase interface {
	List(ctx context.Context, params repositories.PurchaseRequisitionListParams) ([]*dto.PurchaseRequisitionListResponse, int64, error)
}

type purchaseRequisitionUsecase struct {
	repo   repositories.PurchaseRequisitionRepository
	mapper *mapper.PurchaseRequisitionMapper
}

func NewPurchaseRequisitionUsecase(repo repositories.PurchaseRequisitionRepository) PurchaseRequisitionUsecase {
	return &purchaseRequisitionUsecase{
		repo:   repo,
		mapper: mapper.NewPurchaseRequisitionMapper(),
	}
}

func (uc *purchaseRequisitionUsecase) List(ctx context.Context, params repositories.PurchaseRequisitionListParams) ([]*dto.PurchaseRequisitionListResponse, int64, error) {
	items, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return uc.mapper.ToListResponseList(items), total, nil
}
