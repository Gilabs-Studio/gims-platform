package usecase

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/core/utils"
	inventoryDto "github.com/gilabs/gims/api/internal/inventory/domain/dto"
	inventoryUsecase "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	productRepos "github.com/gilabs/gims/api/internal/product/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/data/models"
	salesOrderRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
	salesRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"github.com/gilabs/gims/api/internal/sales/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrDeliveryOrderNotFound      = errors.New("delivery order not found")
	ErrDeliveryOrderAlreadyExists = errors.New("delivery order with this code already exists")
	ErrInvalidDeliveryStatusTransition = errors.New("invalid delivery status transition")
	ErrDeliveryProductNotFound            = errors.New("product not found in delivery")
	ErrInvalidDeliveryOrderStatus = errors.New("cannot modify delivery order in current status")
	ErrDeliverySalesOrderNotFound         = errors.New("sales order not found for delivery")
	ErrInsufficientBatchStock     = errors.New("insufficient stock in selected batch")
	ErrBatchNotFound              = errors.New("inventory batch not found")
)

// DeliveryOrderUsecase defines the interface for delivery order business logic
type DeliveryOrderUsecase interface {
	List(ctx context.Context, req *dto.ListDeliveryOrdersRequest) ([]dto.DeliveryOrderResponse, *utils.PaginationResult, error)
	GetByID(ctx context.Context, id string) (*dto.DeliveryOrderResponse, error)
	ListItems(ctx context.Context, deliveryOrderID string, req *dto.ListDeliveryOrderItemsRequest) ([]dto.DeliveryOrderItemResponse, *utils.PaginationResult, error)
	Create(ctx context.Context, req *dto.CreateDeliveryOrderRequest, createdBy *string) (*dto.DeliveryOrderResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateDeliveryOrderRequest) (*dto.DeliveryOrderResponse, error)
	Delete(ctx context.Context, id string) error
	UpdateStatus(ctx context.Context, id string, req *dto.UpdateDeliveryOrderStatusRequest, userID *string) (*dto.DeliveryOrderResponse, error)
	Ship(ctx context.Context, id string, req *dto.ShipDeliveryOrderRequest, userID *string) (*dto.DeliveryOrderResponse, error)
	Deliver(ctx context.Context, id string, req *dto.DeliverDeliveryOrderRequest, userID *string) (*dto.DeliveryOrderResponse, error)
	SelectBatches(ctx context.Context, req *dto.BatchSelectionRequest) (*dto.BatchSelectionResponse, error)
}

type deliveryOrderUsecase struct {
	deliveryOrderRepo salesRepos.DeliveryOrderRepository
	salesOrderRepo   salesOrderRepos.SalesOrderRepository
	productRepo      productRepos.ProductRepository
	inventoryUC       inventoryUsecase.InventoryUsecase
}

// NewDeliveryOrderUsecase creates a new DeliveryOrderUsecase
func NewDeliveryOrderUsecase(
	deliveryOrderRepo salesRepos.DeliveryOrderRepository,
	salesOrderRepo salesOrderRepos.SalesOrderRepository,
	productRepo productRepos.ProductRepository,
	inventoryUC inventoryUsecase.InventoryUsecase,
) DeliveryOrderUsecase {
	return &deliveryOrderUsecase{
		deliveryOrderRepo: deliveryOrderRepo,
		salesOrderRepo:    salesOrderRepo,
		productRepo:       productRepo,
		inventoryUC:       inventoryUC,
	}
}

func (u *deliveryOrderUsecase) List(ctx context.Context, req *dto.ListDeliveryOrdersRequest) ([]dto.DeliveryOrderResponse, *utils.PaginationResult, error) {
	deliveryOrders, total, err := u.deliveryOrderRepo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.DeliveryOrderResponse, len(deliveryOrders))
	for i := range deliveryOrders {
		responses[i] = mapper.ToDeliveryOrderResponse(&deliveryOrders[i])
	}

	// Calculate pagination
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	return responses, pagination, nil
}

func (u *deliveryOrderUsecase) ListItems(ctx context.Context, deliveryOrderID string, req *dto.ListDeliveryOrderItemsRequest) ([]dto.DeliveryOrderItemResponse, *utils.PaginationResult, error) {
	// Verify delivery order exists
	_, err := u.deliveryOrderRepo.FindByID(ctx, deliveryOrderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrDeliveryOrderNotFound
		}
		return nil, nil, err
	}

	// Fetch paginated items
	items, total, err := u.deliveryOrderRepo.ListItems(ctx, deliveryOrderID, req)
	if err != nil {
		return nil, nil, err
	}

	// Map to response DTOs
	responses := make([]dto.DeliveryOrderItemResponse, len(items))
	for i := range items {
		responses[i] = mapper.ToDeliveryOrderItemResponse(&items[i])
	}

	// Calculate pagination
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	return responses, pagination, nil
}

func (u *deliveryOrderUsecase) GetByID(ctx context.Context, id string) (*dto.DeliveryOrderResponse, error) {
	deliveryOrder, err := u.deliveryOrderRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDeliveryOrderNotFound
		}
		return nil, err
	}

	response := mapper.ToDeliveryOrderResponse(deliveryOrder)
	return &response, nil
}

func (u *deliveryOrderUsecase) Create(ctx context.Context, req *dto.CreateDeliveryOrderRequest, createdBy *string) (*dto.DeliveryOrderResponse, error) {
	// Verify sales order exists
	salesOrder, err := u.salesOrderRepo.FindByID(ctx, req.SalesOrderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDeliverySalesOrderNotFound
		}
		return nil, err
	}

	// Validate products and batches
	for _, item := range req.Items {
		product, err := u.productRepo.FindByID(ctx, item.ProductID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, ErrDeliveryProductNotFound
			}
			return nil, err
		}

		// Use product selling price if price not provided
		if item.Price == 0 {
			item.Price = product.SellingPrice
		}

		// Check for over-delivery
		if item.SalesOrderItemID != nil {
			var soItem *models.SalesOrderItem
			for _, soi := range salesOrder.Items {
				if soi.ID == *item.SalesOrderItemID {
					soItem = &soi
					break
				}
			}

			if soItem != nil {
				remaining := soItem.Quantity - soItem.DeliveredQuantity
				if item.Quantity > remaining {
					// Use a formatted string or specific error
					return nil, errors.New("cannot deliver more than remaining quantity (over-delivery)")
				}
			}
		}

		// TODO: Validate batch exists and has sufficient stock
		// This will be implemented when InventoryBatchRepository is available
		if item.InventoryBatchID == nil {
			return nil, errors.New("inventory_batch_id is required")
		}
	}

	// Generate delivery order number
	code, err := u.deliveryOrderRepo.GetNextDeliveryNumber(ctx, "DO")
	if err != nil {
		return nil, err
	}

	// Convert request to model
	deliveryOrder, err := mapper.ToDeliveryOrderModel(req, code, createdBy)
	if err != nil {
		return nil, err
	}

	// Check if this is a partial delivery
	deliveryOrder.IsPartialDelivery = u.isPartialDelivery(salesOrder, deliveryOrder)

	// Create delivery order
	if err := u.deliveryOrderRepo.Create(ctx, deliveryOrder); err != nil {
		return nil, err
	}

	// Update sales order status to Processing if it's Confirmed
	if salesOrder.Status == models.SalesOrderStatusConfirmed {
		// Use "System" or createdBy as updater
		// Note: We ignore error if status update fails to prevent blocking DO creation? 
		// Ideally strict consistency, but for now we try to update.
		if err := u.salesOrderRepo.UpdateStatus(ctx, salesOrder.ID, models.SalesOrderStatusProcessing, createdBy, nil); err != nil {
			return nil, err
		}
	}

	// Fetch created delivery order with relations
	created, err := u.deliveryOrderRepo.FindByID(ctx, deliveryOrder.ID)
	if err != nil {
		return nil, err
	}

	response := mapper.ToDeliveryOrderResponse(created)
	return &response, nil
}

func (u *deliveryOrderUsecase) Update(ctx context.Context, id string, req *dto.UpdateDeliveryOrderRequest) (*dto.DeliveryOrderResponse, error) {
	deliveryOrder, err := u.deliveryOrderRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDeliveryOrderNotFound
		}
		return nil, err
	}

	// Check if delivery order can be modified
	if deliveryOrder.Status != models.DeliveryOrderStatusDraft && deliveryOrder.Status != models.DeliveryOrderStatusPrepared {
		return nil, ErrInvalidDeliveryOrderStatus
	}

	// Validate products and batches if items are being updated
	if len(req.Items) > 0 {
		for _, item := range req.Items {
			product, err := u.productRepo.FindByID(ctx, item.ProductID)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return nil, ErrProductNotFound
				}
				return nil, err
			}

			// Use product selling price if price not provided
			if item.Price == 0 {
				item.Price = product.SellingPrice
			}

			// TODO: Validate batch exists and has sufficient stock
			if item.InventoryBatchID == nil {
				return nil, errors.New("inventory_batch_id is required")
			}
		}
	}

	// Update model
	if err := mapper.UpdateDeliveryOrderModel(deliveryOrder, req); err != nil {
		return nil, err
	}

	// Update delivery order
	if err := u.deliveryOrderRepo.Update(ctx, deliveryOrder); err != nil {
		return nil, err
	}

	// Fetch updated delivery order with relations
	updated, err := u.deliveryOrderRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToDeliveryOrderResponse(updated)
	return &response, nil
}

func (u *deliveryOrderUsecase) Delete(ctx context.Context, id string) error {
	deliveryOrder, err := u.deliveryOrderRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrDeliveryOrderNotFound
		}
		return err
	}

	// Only allow deletion of draft delivery orders
	if deliveryOrder.Status != models.DeliveryOrderStatusDraft {
		return ErrInvalidDeliveryOrderStatus
	}

	// TODO: Release stock and update sales order delivered quantities

	return u.deliveryOrderRepo.Delete(ctx, id)
}

func (u *deliveryOrderUsecase) UpdateStatus(ctx context.Context, id string, req *dto.UpdateDeliveryOrderStatusRequest, userID *string) (*dto.DeliveryOrderResponse, error) {
	deliveryOrder, err := u.deliveryOrderRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDeliveryOrderNotFound
		}
		return nil, err
	}

	newStatus := models.DeliveryOrderStatus(req.Status)

	// Validate status transition
	if !u.isValidStatusTransition(deliveryOrder.Status, newStatus) {
		return nil, ErrInvalidDeliveryStatusTransition
	}

	// Update status
	var reason *string
	if req.CancellationReason != nil {
		reason = req.CancellationReason
	}

	if err := u.deliveryOrderRepo.UpdateStatus(ctx, id, newStatus, userID, reason); err != nil {
		return nil, err
	}

	// Fetch updated delivery order
	updated, err := u.deliveryOrderRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToDeliveryOrderResponse(updated)
	return &response, nil
}

func (u *deliveryOrderUsecase) Ship(ctx context.Context, id string, req *dto.ShipDeliveryOrderRequest, userID *string) (*dto.DeliveryOrderResponse, error) {
	deliveryOrder, err := u.deliveryOrderRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDeliveryOrderNotFound
		}
		return nil, err
	}

	// Validate status
	if deliveryOrder.Status != models.DeliveryOrderStatusPrepared {
		return nil, ErrInvalidDeliveryStatusTransition
	}

	// Ship delivery order
	if err := u.deliveryOrderRepo.Ship(ctx, id, userID, req.TrackingNumber); err != nil {
		return nil, err
	}

	// Reduce batch quantities and create stock movement
	// Note: We should strictly validate batch ID presence here, but Create() already checks it.
	for _, item := range deliveryOrder.Items {
		if item.InventoryBatchID != nil {
			// Deduct from batch
			if err := u.inventoryUC.DeductStock(ctx, *item.InventoryBatchID, item.Quantity); err != nil {
				return nil, err 
			}
			
			// Create stock movement record (Outbound)
			movementReq := &inventoryDto.StockMovementRequest{
				InventoryBatchID: *item.InventoryBatchID,
				ProductID:        item.ProductID,
				WarehouseID:      *deliveryOrder.WarehouseID,
				Type:             "OUT",
				Quantity:         item.Quantity,
				ReferenceType:    "DO",
				ReferenceID:      deliveryOrder.ID,
				ReferenceNumber:  deliveryOrder.Code,
				Description:      "Delivery Order Shipment",
				CreatedBy:        userID,
			}

			if err := u.inventoryUC.CreateStockMovement(ctx, movementReq); err != nil {
				return nil, err
			}
		}
	}

	// Fetch updated delivery order
	updated, err := u.deliveryOrderRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToDeliveryOrderResponse(updated)
	return &response, nil
}

func (u *deliveryOrderUsecase) Deliver(ctx context.Context, id string, req *dto.DeliverDeliveryOrderRequest, userID *string) (*dto.DeliveryOrderResponse, error) {
	deliveryOrder, err := u.deliveryOrderRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDeliveryOrderNotFound
		}
		return nil, err
	}

	// Validate status
	if deliveryOrder.Status != models.DeliveryOrderStatusShipped {
		return nil, ErrInvalidDeliveryStatusTransition
	}

	// Mark as delivered
	if err := u.deliveryOrderRepo.Deliver(ctx, id, userID, req.ReceiverSignature); err != nil {
		return nil, err
	}

	// Update delivered quantities in sales order items
	for _, item := range deliveryOrder.Items {
		if item.SalesOrderItemID != nil {
			if err := u.salesOrderRepo.UpdateItemDeliveredQty(ctx, *item.SalesOrderItemID, item.Quantity); err != nil {
				return nil, err
			}
		}
	}

	// Check if sales order is fully delivered
	if err := u.updateSalesOrderStatusIfCompleted(ctx, deliveryOrder.SalesOrderID, userID); err != nil {
		return nil, err
	}

	// Fetch updated delivery order
	updated, err := u.deliveryOrderRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToDeliveryOrderResponse(updated)
	return &response, nil
}

// SelectBatches selects available batches using FIFO or FEFO method
func (u *deliveryOrderUsecase) SelectBatches(ctx context.Context, req *dto.BatchSelectionRequest) (*dto.BatchSelectionResponse, error) {
	// Validate product exists
	_, err := u.productRepo.FindByID(ctx, req.ProductID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDeliveryProductNotFound
		}
		return nil, err
	}

	// Fetch available batches from Inventory Module
	batches, err := u.inventoryUC.SelectBatches(ctx, req.ProductID, req.Quantity, req.Method)
	if err != nil {
		return nil, err
	}
	
	// Map to response DTO
	var responseBatches []dto.BatchInfo
	var totalAvailable float64
	
	for _, b := range batches {
		responseBatches = append(responseBatches, dto.BatchInfo{
			ID:          b.ID,
			BatchNumber: b.BatchNumber,
			Quantity:    b.Quantity, // Current Quantity
			ExpiryDate:  b.ExpiredAt,
			ReceivedDate: b.ReceivedAt,
			Available:   float64(b.Quantity), // Simplified available
		})
		totalAvailable += float64(b.Quantity)
	}

	return &dto.BatchSelectionResponse{
		Batches:        responseBatches,
		TotalAvailable: totalAvailable,
	}, nil
}

// isValidStatusTransition validates if status transition is allowed
func (u *deliveryOrderUsecase) isValidStatusTransition(current, new models.DeliveryOrderStatus) bool {
	validTransitions := map[models.DeliveryOrderStatus][]models.DeliveryOrderStatus{
		models.DeliveryOrderStatusDraft: {
			models.DeliveryOrderStatusPrepared,
			models.DeliveryOrderStatusCancelled,
		},
		models.DeliveryOrderStatusPrepared: {
			models.DeliveryOrderStatusShipped,
			models.DeliveryOrderStatusCancelled,
		},
		models.DeliveryOrderStatusShipped: {
			models.DeliveryOrderStatusDelivered,
		},
		models.DeliveryOrderStatusDelivered: {
			// Cannot transition from delivered
		},
		models.DeliveryOrderStatusCancelled: {
			// Cannot transition from cancelled
		},
	}

	allowed, exists := validTransitions[current]
	if !exists {
		return false
	}

	for _, status := range allowed {
		if status == new {
			return true
		}
	}

	return false
}

// isPartialDelivery checks if delivery order is a partial delivery
func (u *deliveryOrderUsecase) isPartialDelivery(salesOrder *models.SalesOrder, deliveryOrder *models.DeliveryOrder) bool {
	// Calculate total delivered quantity per product
	deliveredByProduct := make(map[string]float64)
	for _, item := range deliveryOrder.Items {
		deliveredByProduct[item.ProductID] += item.Quantity
	}

	// Check if any item is partially delivered
	for _, orderItem := range salesOrder.Items {
		deliveredQty := deliveredByProduct[orderItem.ProductID]
		if deliveredQty > 0 && deliveredQty < orderItem.Quantity {
			return true
		}
	}

	return false
}

// updateSalesOrderStatusIfCompleted checks if all items in sales order are delivered and updates status
func (u *deliveryOrderUsecase) updateSalesOrderStatusIfCompleted(ctx context.Context, salesOrderID string, userID *string) error {
	salesOrder, err := u.salesOrderRepo.FindByID(ctx, salesOrderID)
	if err != nil {
		return err
	}

	allDelivered := true
	anyDelivered := false

	for _, item := range salesOrder.Items {
		if item.DeliveredQuantity < item.Quantity {
			allDelivered = false
		}
		if item.DeliveredQuantity > 0 {
			anyDelivered = true
		}
	}

	// Update status based on delivery progress
	var newStatus models.SalesOrderStatus

	if allDelivered {
		newStatus = models.SalesOrderStatusDelivered
	} else if anyDelivered {
		newStatus = models.SalesOrderStatusPartial
	} else {
		// Should generally be processing if we are calling this after a delivery
		newStatus = models.SalesOrderStatusProcessing
	}

	// Only update if status is different
	if salesOrder.Status != newStatus {
		return u.salesOrderRepo.UpdateStatus(ctx, salesOrderID, newStatus, userID, nil)
	}

	return nil
}
