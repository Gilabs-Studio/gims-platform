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

	// Stock Management
	UpdateProductReservedStock(ctx context.Context, productID string, quantity float64) error
	UpdateBatchQuantity(ctx context.Context, batchID string, quantity float64) error
	GetBatchesByProduct(ctx context.Context, productID string) ([]dto.InventoryBatchItem, error)
	CreateStockMovement(ctx context.Context, movement *dto.StockMovementRequest) error
}
