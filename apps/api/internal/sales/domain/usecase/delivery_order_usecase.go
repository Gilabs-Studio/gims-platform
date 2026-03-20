package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
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
	ErrDeliveryOrderNotFound           = errors.New("delivery order not found")
	ErrDeliveryOrderAlreadyExists      = errors.New("delivery order with this code already exists")
	ErrInvalidDeliveryStatusTransition = errors.New("invalid delivery status transition")
	ErrDeliveryProductNotFound         = errors.New("product not found in delivery")
	ErrInvalidDeliveryOrderStatus      = errors.New("cannot modify delivery order in current status")
	ErrDeliverySalesOrderNotFound      = errors.New("sales order not found for delivery")
	ErrInsufficientBatchStock          = errors.New("insufficient stock in selected batch")
	ErrBatchNotFound                   = errors.New("inventory batch not found")
)

const (
	errDeliveryWarehouseIDRequired = "warehouse_id is required"
	errDeliveryDBNil               = "db is nil"
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
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.CustomerInvoiceAuditTrailEntry, int64, error)
}

type deliveryOrderUsecase struct {
	db                *gorm.DB
	deliveryOrderRepo salesRepos.DeliveryOrderRepository
	salesOrderRepo    salesOrderRepos.SalesOrderRepository
	productRepo       productRepos.ProductRepository
	inventoryUC       inventoryUsecase.InventoryUsecase
	auditService      audit.AuditService
}

// NewDeliveryOrderUsecase creates a new DeliveryOrderUsecase
func NewDeliveryOrderUsecase(
	db *gorm.DB,
	deliveryOrderRepo salesRepos.DeliveryOrderRepository,
	salesOrderRepo salesOrderRepos.SalesOrderRepository,
	productRepo productRepos.ProductRepository,
	inventoryUC inventoryUsecase.InventoryUsecase,
	auditService audit.AuditService,
) DeliveryOrderUsecase {
	return &deliveryOrderUsecase{
		db:                db,
		deliveryOrderRepo: deliveryOrderRepo,
		salesOrderRepo:    salesOrderRepo,
		productRepo:       productRepo,
		inventoryUC:       inventoryUC,
		auditService:      auditService,
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

	// Scope-based access control: consistent with List filtering
	if !security.CheckRecordScopeAccess(u.db, ctx, &models.DeliveryOrder{}, id, security.DefaultScopeQueryOptions()) {
		return nil, ErrDeliveryOrderNotFound
	}

	response := mapper.ToDeliveryOrderResponse(deliveryOrder)
	return &response, nil
}

func (u *deliveryOrderUsecase) Create(ctx context.Context, req *dto.CreateDeliveryOrderRequest, createdBy *string) (*dto.DeliveryOrderResponse, error) {
	warehouseID := strings.TrimSpace(req.WarehouseID)
	if warehouseID == "" {
		return nil, errors.New(errDeliveryWarehouseIDRequired)
	}
	req.WarehouseID = warehouseID

	// Verify sales order exists
	salesOrder, err := u.salesOrderRepo.FindByID(ctx, req.SalesOrderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDeliverySalesOrderNotFound
		}
		return nil, err
	}

	// Auto-fill receiver info from sales order customer if not provided
	if req.ReceiverName == "" && salesOrder.CustomerName != "" {
		req.ReceiverName = salesOrder.CustomerName
	}
	if req.ReceiverPhone == "" && salesOrder.CustomerPhone != "" {
		req.ReceiverPhone = salesOrder.CustomerPhone
	}

	// Query pending delivery quantities from existing non-cancelled DOs
	pendingQtyMap, err := u.deliveryOrderRepo.GetPendingDeliveryQtyBySalesOrder(ctx, req.SalesOrderID)
	if err != nil {
		return nil, err
	}

	// Check if sales order is already fully allocated (delivered + pending DO qty >= ordered qty)
	isFullyAllocated := true
	for _, item := range salesOrder.Items {
		pendingQty := pendingQtyMap[item.ID]
		allocatedQty := item.DeliveredQuantity + pendingQty
		if item.Quantity > allocatedQty {
			isFullyAllocated = false
			break
		}
	}
	if len(salesOrder.Items) > 0 && isFullyAllocated {
		return nil, errors.New("sales order is already fully fulfilled — all items have been delivered or allocated to existing delivery orders")
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

		// Check for over-delivery (including pending DO quantities)
		if item.SalesOrderItemID != nil {
			var soItem *models.SalesOrderItem
			for _, soi := range salesOrder.Items {
				if soi.ID == *item.SalesOrderItemID {
					soItem = &soi
					break
				}
			}

			if soItem != nil {
				pendingQty := pendingQtyMap[soItem.ID]
				remaining := soItem.Quantity - soItem.DeliveredQuantity - pendingQty
				if item.Quantity > remaining {
					return nil, errors.New("cannot deliver more than remaining quantity (over-delivery)")
				}
			}
		}

		// Validate batch exists and has sufficient stock
		if item.InventoryBatchID == nil {
			return nil, errors.New("inventory_batch_id is required")
		}
		if err := u.inventoryUC.ValidateBatchStock(ctx, *item.InventoryBatchID, item.Quantity); err != nil {
			return nil, err
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

	// Create delivery order and reserve batch stock (wrapped in transaction)
	err = u.db.Transaction(func(tx *gorm.DB) error {
		txCtx := database.WithTx(ctx, tx)

		// Create delivery order
		if err := u.deliveryOrderRepo.Create(txCtx, deliveryOrder); err != nil {
			return err
		}

		// Reserve stock at batch level for each item
		for _, item := range deliveryOrder.Items {
			if item.InventoryBatchID != nil {
				if err := u.inventoryUC.ReserveBatchStock(txCtx, *item.InventoryBatchID, item.Quantity); err != nil {
					return err
				}
			}
		}

		// Sales order status no longer changes based on Delivery Order creation

		return nil
	})
	if err != nil {
		return nil, err
	}

	// Fetch created delivery order with relations
	created, err := u.deliveryOrderRepo.FindByID(ctx, deliveryOrder.ID)
	if err != nil {
		return nil, err
	}

	response := mapper.ToDeliveryOrderResponse(created)
	logSalesAudit(u.auditService, ctx, "delivery_order.create", created.ID, map[string]interface{}{
		"after": map[string]interface{}{
			"code":           created.Code,
			"status":         created.Status,
			"delivery_date":  created.DeliveryDate,
			"sales_order_id": created.SalesOrderID,
		},
	})
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
	if deliveryOrder.Status != models.DeliveryOrderStatusDraft && deliveryOrder.Status != models.DeliveryOrderStatusApproved && deliveryOrder.Status != models.DeliveryOrderStatusPrepared {
		return nil, ErrInvalidDeliveryOrderStatus
	}
	if deliveryOrder.WarehouseID == nil || strings.TrimSpace(*deliveryOrder.WarehouseID) == "" {
		return nil, errors.New(errDeliveryWarehouseIDRequired)
	}

	beforeSnapshot := deliveryOrderAuditSnapshot(deliveryOrder)
	if req.WarehouseID != nil {
		trimmedWarehouseID := strings.TrimSpace(*req.WarehouseID)
		if trimmedWarehouseID == "" {
			return nil, errors.New(errDeliveryWarehouseIDRequired)
		}
		req.WarehouseID = &trimmedWarehouseID
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

			// Validate batch exists and has sufficient stock
			if item.InventoryBatchID == nil {
				return nil, errors.New("inventory_batch_id is required")
			}
			if err := u.inventoryUC.ValidateBatchStock(ctx, *item.InventoryBatchID, item.Quantity); err != nil {
				return nil, err
			}
		}
	}

	// Release old batch reservations before applying new ones
	err = u.db.Transaction(func(tx *gorm.DB) error {
		txCtx := database.WithTx(ctx, tx)

		// Release existing batch reservations
		for _, oldItem := range deliveryOrder.Items {
			if oldItem.InventoryBatchID != nil {
				if err := u.inventoryUC.ReleaseBatchStock(txCtx, *oldItem.InventoryBatchID, oldItem.Quantity); err != nil {
					return err
				}
			}
		}

		// Update model
		if err := mapper.UpdateDeliveryOrderModel(deliveryOrder, req); err != nil {
			return err
		}

		// Update delivery order
		if err := u.deliveryOrderRepo.Update(txCtx, deliveryOrder); err != nil {
			return err
		}

		// Reserve new batch stock
		for _, item := range deliveryOrder.Items {
			if item.InventoryBatchID != nil {
				if err := u.inventoryUC.ReserveBatchStock(txCtx, *item.InventoryBatchID, item.Quantity); err != nil {
					return err
				}
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	// Fetch updated delivery order with relations
	updated, err := u.deliveryOrderRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToDeliveryOrderResponse(updated)
	logSalesAudit(u.auditService, ctx, "delivery_order.update", id, map[string]interface{}{
		"before": beforeSnapshot,
		"after":  deliveryOrderAuditSnapshot(updated),
	})
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

	// Release batch stock reservations and delete (wrapped in transaction)
	return u.db.Transaction(func(tx *gorm.DB) error {
		txCtx := database.WithTx(ctx, tx)

		for _, item := range deliveryOrder.Items {
			if item.InventoryBatchID != nil {
				if err := u.inventoryUC.ReleaseBatchStock(txCtx, *item.InventoryBatchID, item.Quantity); err != nil {
					return err
				}
			}
			// Release product-level reservation as well
			if err := u.inventoryUC.ReleaseStock(txCtx, item.ProductID, item.Quantity); err != nil {
				return err
			}
		}

		return u.deliveryOrderRepo.Delete(txCtx, id)
	})
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
	previousStatus := deliveryOrder.Status

	// Validate status transition
	if !u.isValidStatusTransition(deliveryOrder.Status, newStatus) {
		return nil, ErrInvalidDeliveryStatusTransition
	}

	var reason *string
	if req.CancellationReason != nil {
		reason = req.CancellationReason
	}

	// Release stock reservations when cancelling to prevent "trapped" inventory
	if newStatus == models.DeliveryOrderStatusCancelled {
		return u.cancelAndReleaseStock(ctx, deliveryOrder, userID, reason)
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
	logSalesAudit(u.auditService, ctx, "delivery_order.status_change", id, map[string]interface{}{
		"before_status": previousStatus,
		"after_status":  updated.Status,
		"reason":        req.CancellationReason,
	})
	return &response, nil
}

// cancelAndReleaseStock handles DO cancellation with proper stock release in a single transaction.
// This mirrors the stock release logic in Delete() but applies to status cancellation
// from draft, approved, or prepared states where batch/product reservations exist.
func (u *deliveryOrderUsecase) cancelAndReleaseStock(
	ctx context.Context,
	deliveryOrder *models.DeliveryOrder,
	userID *string,
	reason *string,
) (*dto.DeliveryOrderResponse, error) {
	err := u.db.Transaction(func(tx *gorm.DB) error {
		txCtx := database.WithTx(ctx, tx)

		// Release batch-level and product-level stock reservations for each item
		for _, item := range deliveryOrder.Items {
			if item.InventoryBatchID != nil {
				if err := u.inventoryUC.ReleaseBatchStock(txCtx, *item.InventoryBatchID, item.Quantity); err != nil {
					return fmt.Errorf("failed to release batch stock for item %s: %w", item.ID, err)
				}
			}
			if err := u.inventoryUC.ReleaseStock(txCtx, item.ProductID, item.Quantity); err != nil {
				return fmt.Errorf("failed to release product stock for item %s: %w", item.ID, err)
			}
		}

		return u.deliveryOrderRepo.UpdateStatus(txCtx, deliveryOrder.ID, models.DeliveryOrderStatusCancelled, userID, reason)
	})
	if err != nil {
		return nil, err
	}

	updated, err := u.deliveryOrderRepo.FindByID(ctx, deliveryOrder.ID)
	if err != nil {
		return nil, err
	}

	response := mapper.ToDeliveryOrderResponse(updated)
	logSalesAudit(u.auditService, ctx, "delivery_order.status_change", updated.ID, map[string]interface{}{
		"before_status": deliveryOrder.Status,
		"after_status":  updated.Status,
		"reason":        reason,
	})
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
	if deliveryOrder.WarehouseID == nil || strings.TrimSpace(*deliveryOrder.WarehouseID) == "" {
		return nil, errors.New(errDeliveryWarehouseIDRequired)
	}

	// Ship delivery order
	if err := u.deliveryOrderRepo.Ship(ctx, id, userID, req.TrackingNumber); err != nil {
		return nil, err
	}

	// Reduce batch quantities, release reservations, and create stock movement
	for _, item := range deliveryOrder.Items {
		if item.InventoryBatchID != nil {
			// Release batch reservation (stock is leaving warehouse, no longer reserved)
			if err := u.inventoryUC.ReleaseBatchStock(ctx, *item.InventoryBatchID, item.Quantity); err != nil {
				return nil, err
			}

			// Release product-level reservation
			if err := u.inventoryUC.ReleaseStock(ctx, item.ProductID, item.Quantity); err != nil {
				return nil, err
			}

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
	logSalesAudit(u.auditService, ctx, "delivery_order.ship", id, map[string]interface{}{
		"after": map[string]interface{}{
			"status":          updated.Status,
			"tracking_number": updated.TrackingNumber,
			"shipped_at":      updated.ShippedAt,
		},
	})
	return &response, nil
}

func (u *deliveryOrderUsecase) ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.CustomerInvoiceAuditTrailEntry, int64, error) {
	if u.db == nil {
		return nil, 0, errors.New(errDeliveryDBNil)
	}

	return listAuditTrailEntries(ctx, u.db, id, "delivery_order.", page, perPage)
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
	if err := u.deliveryOrderRepo.Deliver(ctx, id, userID, req.ReceiverSignature, req.ReceiverName); err != nil {
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

	// Sales order status is no longer tied strictly to Delivery completion

	// Fetch updated delivery order
	updated, err := u.deliveryOrderRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToDeliveryOrderResponse(updated)
	logSalesAudit(u.auditService, ctx, "delivery_order.deliver", id, map[string]interface{}{
		"after": map[string]interface{}{
			"status":        updated.Status,
			"delivered_at":  updated.DeliveredAt,
			"receiver_name": updated.ReceiverName,
		},
	})
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
			ID:           b.ID,
			BatchNumber:  b.BatchNumber,
			Quantity:     b.Quantity, // Current Quantity
			ExpiryDate:   b.ExpiredAt,
			ReceivedDate: b.ReceivedAt,
			Available:    float64(b.Quantity), // Simplified available
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
			models.DeliveryOrderStatusSent,
			models.DeliveryOrderStatusCancelled,
		},
		models.DeliveryOrderStatusSent: {
			models.DeliveryOrderStatusApproved,
			models.DeliveryOrderStatusRejected,
		},
		models.DeliveryOrderStatusApproved: {
			models.DeliveryOrderStatusPrepared,
			models.DeliveryOrderStatusCancelled,
		},
		models.DeliveryOrderStatusRejected: {
			models.DeliveryOrderStatusDraft,
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

func deliveryOrderAuditSnapshot(deliveryOrder *models.DeliveryOrder) map[string]interface{} {
	if deliveryOrder == nil {
		return nil
	}

	return map[string]interface{}{
		"code":                deliveryOrder.Code,
		"status":              deliveryOrder.Status,
		"delivery_date":       deliveryOrder.DeliveryDate,
		"sales_order_id":      deliveryOrder.SalesOrderID,
		"warehouse_id":        deliveryOrder.WarehouseID,
		"delivered_by_id":     deliveryOrder.DeliveredByID,
		"courier_agency_id":   deliveryOrder.CourierAgencyID,
		"tracking_number":     deliveryOrder.TrackingNumber,
		"receiver_name":       deliveryOrder.ReceiverName,
		"receiver_phone":      deliveryOrder.ReceiverPhone,
		"delivery_address":    deliveryOrder.DeliveryAddress,
		"receiver_signature":  deliveryOrder.ReceiverSignature,
		"is_partial_delivery": deliveryOrder.IsPartialDelivery,
		"notes":               deliveryOrder.Notes,
		"items":               deliveryOrderAuditItems(deliveryOrder.Items),
	}
}

func deliveryOrderAuditItems(items []models.DeliveryOrderItem) []map[string]interface{} {
	if len(items) == 0 {
		return []map[string]interface{}{}
	}

	out := make([]map[string]interface{}, 0, len(items))
	for _, item := range items {
		out = append(out, map[string]interface{}{
			"id":                    item.ID,
			"sales_order_item_id":   item.SalesOrderItemID,
			"product_id":            item.ProductID,
			"inventory_batch_id":    item.InventoryBatchID,
			"quantity":              item.Quantity,
			"price":                 item.Price,
			"subtotal":              item.Subtotal,
			"is_equipment":          item.IsEquipment,
			"installation_status":   item.InstallationStatus,
			"function_test_status":  item.FunctionTestStatus,
			"installation_date":     item.InstallationDate,
			"function_test_date":    item.FunctionTestDate,
			"installation_notes":    item.InstallationNotes,
		})
	}

	return out
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
