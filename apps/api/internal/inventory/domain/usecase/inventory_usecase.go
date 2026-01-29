package usecase

import (
	"context"
	"math"

	"github.com/gilabs/gims/api/internal/inventory/domain/dto"
	"github.com/gilabs/gims/api/internal/inventory/domain/repository"
)

type InventoryUsecase interface {
	GetStockList(ctx context.Context, req *dto.GetInventoryListRequest) (*dto.GetInventoryListResponse, error)
}

type inventoryUsecase struct {
	repo repository.InventoryRepository
}

func NewInventoryUsecase(repo repository.InventoryRepository) InventoryUsecase {
	return &inventoryUsecase{
		repo: repo,
	}
}

func (u *inventoryUsecase) GetStockList(ctx context.Context, req *dto.GetInventoryListRequest) (*dto.GetInventoryListResponse, error) {
	// Set defaults
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PerPage <= 0 {
		req.PerPage = 20
	}

	items, total, err := u.repo.GetStockList(ctx, req)
	if err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(req.PerPage)))

	return &dto.GetInventoryListResponse{
		Data: items,
		Meta: dto.PaginationMeta{
			Total:      total,
			Page:       req.Page,
			PerPage:    req.PerPage,
			TotalPages: totalPages,
			HasNext:    req.Page < totalPages,
			HasPrev:    req.Page > 1,
		},
	}, nil
}
