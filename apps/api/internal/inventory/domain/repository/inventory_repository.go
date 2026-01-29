package repository

import (
	"context"

	"github.com/gilabs/gims/api/internal/inventory/domain/dto"
)

type InventoryRepository interface {
	GetStockList(ctx context.Context, req *dto.GetInventoryListRequest) ([]dto.InventoryStockItem, int64, error)
}
