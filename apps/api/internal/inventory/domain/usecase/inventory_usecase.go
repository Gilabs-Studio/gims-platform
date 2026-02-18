package usecase

import (
	"context"
	"math"
	"time"

	"github.com/gilabs/gims/api/internal/inventory/domain/dto"
	"github.com/gilabs/gims/api/internal/inventory/domain/repository"
)

type InventoryUsecase interface {
	GetStockList(ctx context.Context, req *dto.GetInventoryListRequest) (*dto.GetInventoryListResponse, error)

	// Tree View
	GetTreeWarehouses(ctx context.Context) ([]dto.GetInventoryTreeWarehousesResponse, error)
	GetTreeProducts(ctx context.Context, req *dto.GetInventoryTreeProductsRequest) (*dto.GetInventoryTreeProductsResponse, error)
	GetTreeBatches(ctx context.Context, req *dto.GetInventoryTreeBatchesRequest) (*dto.GetInventoryTreeBatchesResponse, error)

	// Stock Management
	ReserveStock(ctx context.Context, productID string, quantity float64) error
	ReleaseStock(ctx context.Context, productID string, quantity float64) error
	DeductStock(ctx context.Context, batchID string, quantity float64) error
	SelectBatches(ctx context.Context, productID string, quantity float64, strategy string) ([]dto.BatchSelectionItem, error)
	CreateStockMovement(ctx context.Context, req *dto.StockMovementRequest) error

	// Integration
	ReceiveStockFromGR(ctx context.Context, req *dto.ReceiveStockRequest) error
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

func (u *inventoryUsecase) GetTreeWarehouses(ctx context.Context) ([]dto.GetInventoryTreeWarehousesResponse, error) {
	return u.repo.GetTreeWarehouses(ctx)
}

func (u *inventoryUsecase) GetTreeProducts(ctx context.Context, req *dto.GetInventoryTreeProductsRequest) (*dto.GetInventoryTreeProductsResponse, error) {
	// Defaults
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PerPage <= 0 {
		req.PerPage = 20
	}

	items, total, err := u.repo.GetTreeProducts(ctx, req)
	if err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(req.PerPage)))

	return &dto.GetInventoryTreeProductsResponse{
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

func (u *inventoryUsecase) GetTreeBatches(ctx context.Context, req *dto.GetInventoryTreeBatchesRequest) (*dto.GetInventoryTreeBatchesResponse, error) {
	items, err := u.repo.GetTreeBatches(ctx, req)
	if err != nil {
		return nil, err
	}
	return &dto.GetInventoryTreeBatchesResponse{Data: items}, nil
}

func (u *inventoryUsecase) ReserveStock(ctx context.Context, productID string, quantity float64) error {
	return u.repo.UpdateProductReservedStock(ctx, productID, quantity)
}

func (u *inventoryUsecase) ReleaseStock(ctx context.Context, productID string, quantity float64) error {
	// Release is essentially negative reservation (reducing reserved count)
	// But we ensure quantity is positive for method clarity, repo handles sign
	return u.repo.UpdateProductReservedStock(ctx, productID, -quantity)
}

func (u *inventoryUsecase) DeductStock(ctx context.Context, batchID string, quantity float64) error {
	return u.repo.UpdateBatchQuantity(ctx, batchID, -quantity)
}

func (u *inventoryUsecase) SelectBatches(ctx context.Context, productID string, quantity float64, strategy string) ([]dto.BatchSelectionItem, error) {
	batches, err := u.repo.GetBatchesByProduct(ctx, productID)
	if err != nil {
		return nil, err
	}

	// Map to selection items
	var selectionItems []dto.BatchSelectionItem
	for _, b := range batches {
		selectionItems = append(selectionItems, dto.BatchSelectionItem{
			ID:          b.ID,
			BatchNumber: b.BatchNumber,
			Quantity:    b.CurrentQuantity, // Now float64 matching struct
			ExpiredAt:   *b.ExpiryDate,
			ReceivedAt:  *b.ReceivedAt,
		})
	}

	// Sort based on strategy (Simple bubble sort for now or defer to repo/sql ordering)
	// Here we just implement basic logic placeholders, assuming repo returns sorted or we sort here
	if strategy == "FEFO" {
		// Sort by ExpiredAt
		for i := 0; i < len(selectionItems)-1; i++ {
			for j := 0; j < len(selectionItems)-i-1; j++ {
				if selectionItems[j].ExpiredAt.After(selectionItems[j+1].ExpiredAt) {
					selectionItems[j], selectionItems[j+1] = selectionItems[j+1], selectionItems[j]
				}
			}
		}
	} else {
		// FIFO (Default) - Sort by ReceivedAt
		for i := 0; i < len(selectionItems)-1; i++ {
			for j := 0; j < len(selectionItems)-i-1; j++ {
				if selectionItems[j].ReceivedAt.After(selectionItems[j+1].ReceivedAt) {
					selectionItems[j], selectionItems[j+1] = selectionItems[j+1], selectionItems[j]
				}
			}
		}
	}

	// allocate logic can be here or in FE, but usually FE selects from list
	// UseCase just returns sorted available batches
	return selectionItems, nil
}

func (u *inventoryUsecase) CreateStockMovement(ctx context.Context, req *dto.StockMovementRequest) error {
	return u.repo.CreateStockMovement(ctx, req)
}

func (u *inventoryUsecase) ReceiveStockFromGR(ctx context.Context, req *dto.ReceiveStockRequest) error {
	for _, item := range req.Items {
		// 1. Calculate New Average Cost (Weighted Average)
		currentHpp, currentStock, err := u.repo.GetProductCostInfo(ctx, item.ProductID)
		if err != nil {
			return err
		}

		totalQty := currentStock + item.Quantity
		totalValue := (currentStock * currentHpp) + (item.Quantity * item.CostPrice)
		newHpp := 0.0
		if totalQty > 0 {
			newHpp = math.Round((totalValue/totalQty)*100) / 100
		} else {
			newHpp = item.CostPrice
		}

		// 2. Update Product Cost
		if err := u.repo.UpdateProductAverageCost(ctx, item.ProductID, newHpp); err != nil {
			return err
		}

		// 3. Create Batch
		batchNumber := "GR-" + time.Now().Format("20060102-150405")
		if item.BatchNumber != nil && *item.BatchNumber != "" {
			batchNumber = *item.BatchNumber
		}

		// Map DTO to CreateBatchParams
		batchParams := &dto.CreateBatchParams{
			ProductID:       item.ProductID,
			WarehouseID:     req.WarehouseID,
			BatchNumber:     batchNumber,
			ExpiryDate:      item.ExpiryDate,
			InitialQuantity: item.Quantity,
			CostPrice:       item.CostPrice,
			ReceivedAt:      req.ReceivedAt,
		}

		batchID, err := u.repo.CreateBatch(ctx, batchParams)
		if err != nil {
			return err
		}

		// 4. Create Stock Movement (IN)
		createdBy := req.ReceivedBy
		movementReq := &dto.StockMovementRequest{
			InventoryBatchID: batchID,
			ProductID:        item.ProductID,
			WarehouseID:      req.WarehouseID,
			Type:             "IN",
			Quantity:         item.Quantity,
			ReferenceType:    req.SourceType,
			ReferenceID:      req.SourceID,
			ReferenceNumber:  req.SourceNumber,
			Description:      req.Notes,
			CreatedBy:        &createdBy,
		}
		if err := u.repo.CreateStockMovement(ctx, movementReq); err != nil {
			return err
		}

		// 5. Update Product Stock (Aggregate)
		if err := u.repo.UpdateProductStock(ctx, item.ProductID, item.Quantity); err != nil {
			return err
		}
	}
	return nil
}
