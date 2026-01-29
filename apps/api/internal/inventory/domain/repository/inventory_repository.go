package repository

import (
	"context"

	"github.com/gilabs/gims/api/internal/inventory/domain/dto"
)

type InventoryRepository interface {
	GetStockList(ctx context.Context, req *dto.GetInventoryListRequest) ([]dto.InventoryStockItem, int64, error)
	
	// Tree View
	GetTreeWarehouses(ctx context.Context) ([]dto.GetInventoryTreeWarehousesResponse, error)
	GetTreeProducts(ctx context.Context, req *dto.GetInventoryTreeProductsRequest) ([]dto.InventoryStockItem, int64, error)
	GetTreeBatches(ctx context.Context, req *dto.GetInventoryTreeBatchesRequest) ([]dto.InventoryBatchItem, error)
}
