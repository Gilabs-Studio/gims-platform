package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/inventory/domain/dto"
	"github.com/gilabs/gims/api/internal/inventory/domain/repository"
)

var (
	ErrBatchNotFound          = errors.New("inventory batch not found")
	ErrInsufficientBatchStock = errors.New("insufficient stock in selected batch")
)

type InventoryUsecase interface {
	GetStockList(ctx context.Context, req *dto.GetInventoryListRequest) (*dto.GetInventoryListResponse, error)
	GetInventoryMetrics(ctx context.Context) (*dto.InventoryMetrics, error)

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
	CreateManualStockMovement(ctx context.Context, req *dto.CreateManualMovementRequest) error

	// Integration
	ReceiveStockFromGR(ctx context.Context, req *dto.ReceiveStockRequest) error
	AdjustStockFromOpname(ctx context.Context, req *dto.AdjustStockFromOpnameRequest) error

	// Batch-level Stock Reservation
	ValidateBatchStock(ctx context.Context, batchID string, requiredQty float64) error
	ReserveBatchStock(ctx context.Context, batchID string, quantity float64) error
	ReleaseBatchStock(ctx context.Context, batchID string, quantity float64) error
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
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PerPage <= 0 {
		req.PerPage = 10
	}

	items, total, err := u.repo.GetTreeBatches(ctx, req)
	if err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(req.PerPage)))

	return &dto.GetInventoryTreeBatchesResponse{
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

func (u *inventoryUsecase) GetInventoryMetrics(ctx context.Context) (*dto.InventoryMetrics, error) {
	return u.repo.GetInventoryMetrics(ctx)
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
	for idx, item := range req.Items {
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
		batchToken := sanitizeBatchToken(req.SourceNumber)
		if batchToken == "" {
			batchToken = sanitizeBatchToken(req.SourceID)
		}
		if batchToken == "" {
			batchToken = apptime.Now().Format("20060102150405")
		}

		batchNumber := fmt.Sprintf("GR-%s-%03d", batchToken, idx+1)
		if len(batchNumber) > 100 {
			batchNumber = batchNumber[:100]
		}
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

func sanitizeBatchToken(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}

	replacer := strings.NewReplacer(
		"/", "-",
		"\\", "-",
		" ", "-",
		":", "-",
		".", "-",
	)

	normalized := strings.ToUpper(replacer.Replace(trimmed))
	normalized = strings.Trim(normalized, "-")
	for strings.Contains(normalized, "--") {
		normalized = strings.ReplaceAll(normalized, "--", "-")
	}

	return normalized
}

func (u *inventoryUsecase) ValidateBatchStock(ctx context.Context, batchID string, requiredQty float64) error {
	batch, err := u.repo.GetBatchByID(ctx, batchID)
	if err != nil {
		return err
	}
	if batch == nil {
		return ErrBatchNotFound
	}
	if batch.Available < requiredQty {
		return ErrInsufficientBatchStock
	}
	return nil
}

func (u *inventoryUsecase) ReserveBatchStock(ctx context.Context, batchID string, quantity float64) error {
	return u.repo.UpdateBatchReservedQuantity(ctx, batchID, quantity)
}

func (u *inventoryUsecase) ReleaseBatchStock(ctx context.Context, batchID string, quantity float64) error {
	return u.repo.UpdateBatchReservedQuantity(ctx, batchID, -quantity)
}

// AdjustStockFromOpname creates ADJUST stock movements and updates batch/product quantities
// based on variance data from a posted Stock Opname.
// Positive variance = surplus (qty found more than system) → IN adjustment
// Negative variance = shortage (qty found less than system) → OUT adjustment
func (u *inventoryUsecase) AdjustStockFromOpname(ctx context.Context, req *dto.AdjustStockFromOpnameRequest) error {
	for _, item := range req.Items {
		if item.VarianceQty == 0 {
			continue // No adjustment needed for matching items
		}

		// Find the oldest batch for this product+warehouse to attach the movement
		batches, err := u.repo.GetBatchesByProductAndWarehouse(ctx, item.ProductID, req.WarehouseID)
		if err != nil {
			return err
		}

		// Determine batch ID — use the first (oldest) batch if available
		batchID := ""
		if len(batches) > 0 {
			batchID = batches[0].ID
		}

		// Create the ADJUST stock movement
		// Pass signed variance so the repo can determine QtyIn vs QtyOut
		// Positive variance = surplus = QtyIn; Negative = shortage = QtyOut
		movementReq := &dto.StockMovementRequest{
			InventoryBatchID: batchID,
			ProductID:        item.ProductID,
			WarehouseID:      req.WarehouseID,
			Type:             "ADJUST",
			Quantity:         item.VarianceQty,
			ReferenceType:    "OPNAME",
			ReferenceID:      req.OpnameID,
			ReferenceNumber:  req.OpnameNumber,
			Description:      req.Notes,
			CreatedBy:        &req.PostedBy,
		}

		if err := u.repo.CreateStockMovement(ctx, movementReq); err != nil {
			return err
		}

		// Update batch quantity with the variance delta
		if batchID != "" {
			if err := u.repo.UpdateBatchQuantity(ctx, batchID, item.VarianceQty); err != nil {
				return err
			}
		}

		// Update aggregate product stock
		if err := u.repo.UpdateProductStock(ctx, item.ProductID, item.VarianceQty); err != nil {
			return err
		}
	}
	return nil
}

var ErrTargetWarehouseRequired = errors.New("target warehouse is required for TRANSFER")
var ErrInsufficientStock = errors.New("insufficient stock for movement")

func (u *inventoryUsecase) CreateManualStockMovement(ctx context.Context, req *dto.CreateManualMovementRequest) error {
	zeroUUID := "00000000-0000-0000-0000-000000000000"
	
	if req.ReferenceNumber == "" {
		req.ReferenceNumber = "MANUAL-" + time.Now().Format("20060102-150405")
	}

	deductStock := func(warehouseID string, qty float64, movementType string) error {
		batches, err := u.repo.GetBatchesByProductAndWarehouse(ctx, req.ProductID, warehouseID)
		if err != nil {
			return err
		}

		remaining := qty
		for _, batch := range batches {
			if remaining <= 0 {
				break
			}
			
			available := batch.Available
			if available <= 0 {
				continue
			}

			toDeduct := math.Min(available, remaining)

			movReq := &dto.StockMovementRequest{
				InventoryBatchID: batch.ID,
				ProductID:        req.ProductID,
				WarehouseID:      warehouseID,
				Type:             movementType,
				Quantity:         toDeduct,
				ReferenceType:    "TRANSFER",
				ReferenceID:      zeroUUID,
				ReferenceNumber:  req.ReferenceNumber,
				Description:      req.Description,
				CreatedBy:        &req.CreatedBy,
				MovementDirection: "OUT",
			}
			if err := u.repo.CreateStockMovement(ctx, movReq); err != nil {
				return err
			}

			if err := u.repo.UpdateBatchQuantity(ctx, batch.ID, -toDeduct); err != nil {
				return err
			}

			remaining -= toDeduct
		}

		if remaining > 0 {
			return ErrInsufficientStock
		}

		if err := u.repo.UpdateProductStock(ctx, req.ProductID, -qty); err != nil {
			return err
		}

		return nil
	}

	addStock := func(warehouseID string, qty float64, movementType string) error {
		currentHpp, _, err := u.repo.GetProductCostInfo(ctx, req.ProductID)
		if err != nil {
			return err
		}

		now := apptime.Now()
		batchNumber := "MB-" + now.Format("060102150405")
		
		batchParams := &dto.CreateBatchParams{
			ProductID:       req.ProductID,
			WarehouseID:     warehouseID,
			BatchNumber:     batchNumber,
			InitialQuantity: qty,
			CostPrice:       currentHpp,
			ReceivedAt:      now,
		}

		batchID, err := u.repo.CreateBatch(ctx, batchParams)
		if err != nil {
			return err
		}

		movReq := &dto.StockMovementRequest{
			InventoryBatchID: batchID,
			ProductID:        req.ProductID,
			WarehouseID:      warehouseID,
			Type:             movementType,
			Quantity:         qty,
			ReferenceType:    "TRANSFER",
			ReferenceID:      zeroUUID,
			ReferenceNumber:  req.ReferenceNumber,
			Description:      req.Description,
			CreatedBy:        &req.CreatedBy,
			MovementDirection: "IN",
		}
		if err := u.repo.CreateStockMovement(ctx, movReq); err != nil {
			return err
		}

		if err := u.repo.UpdateProductStock(ctx, req.ProductID, qty); err != nil {
			return err
		}

		return nil
	}

	switch req.Type {
	case "IN":
		return addStock(req.WarehouseID, req.Quantity, "IN")
	case "OUT":
		return deductStock(req.WarehouseID, req.Quantity, "OUT")
	case "ADJUST":
		return errors.New("please use stock opname for adjustments")
	case "TRANSFER":
		if req.TargetWarehouseID == nil || *req.TargetWarehouseID == "" {
			return ErrTargetWarehouseRequired
		}
		if err := deductStock(req.WarehouseID, req.Quantity, "TRANSFER"); err != nil {
			return err
		}
		if err := addStock(*req.TargetWarehouseID, req.Quantity, "TRANSFER"); err != nil {
			return err
		}
	}

	return nil
}
