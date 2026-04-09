package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	invModels "github.com/gilabs/gims/api/internal/inventory/data/models"
	invUsecase "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	posModels "github.com/gilabs/gims/api/internal/pos/data/models"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/gilabs/gims/api/internal/pos/domain/mapper"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ---------------------------------------------------------------------------
// Error sentinels – exported for handler error mapping
// ---------------------------------------------------------------------------

var (
	ErrPOSOrderNotFound       = errors.New("pos order not found")
	ErrPOSOrderCannotModify   = errors.New("order cannot be modified in its current state")
	ErrPOSOrderItemNotFound   = errors.New("pos order item not found")
	ErrPOSProductNotAvailable = errors.New("product is not available in this outlet")
	ErrPOSInsufficientStock   = errors.New("insufficient stock for requested quantity")
	ErrPOSOrderAlreadyPaid    = errors.New("order has already been paid")
	ErrPOSSessionNotFound     = errors.New("pos session not found")
	ErrPOSSessionAlreadyOpen  = errors.New("cashier already has an open session")
	ErrPOSInvalidPayment      = errors.New("invalid payment data")
)

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

// POSOrderUsecase defines business logic for POS order management.
type POSOrderUsecase interface {
	Create(ctx context.Context, req *dto.CreateOrderRequest, userID string) (*dto.POSOrderResponse, error)
	GetByID(ctx context.Context, id string) (*dto.POSOrderResponse, error)
	List(ctx context.Context, params repositories.POSOrderListParams) ([]dto.POSOrderResponse, int64, error)
	Confirm(ctx context.Context, id string, req *dto.ConfirmOrderRequest, userID string) (*dto.POSOrderResponse, error)
	Void(ctx context.Context, id string, req *dto.VoidOrderRequest, userID string) (*dto.POSOrderResponse, error)
	AddItem(ctx context.Context, orderID string, req *dto.AddOrderItemRequest) (*dto.POSOrderResponse, error)
	UpdateItem(ctx context.Context, orderID, itemID string, req *dto.UpdateOrderItemRequest) (*dto.POSOrderResponse, error)
	RemoveItem(ctx context.Context, orderID, itemID string) (*dto.POSOrderResponse, error)
	GetCatalog(ctx context.Context, outletID string) ([]dto.POSCatalogItem, error)
	AssignTable(ctx context.Context, orderID string, req *dto.AssignTableRequest) (*dto.POSOrderResponse, error)
	// DeductStock is called by POSPaymentUsecase after a successful payment
	DeductStock(ctx context.Context, order *posModels.PosOrder, refNumber, userID string) error
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

type posOrderUsecase struct {
	db            *gorm.DB
	orderRepo     repositories.PosOrderRepository
	outletRepo    orgRepos.OutletRepository
	productRepo   repositories.POSProductRepository
	recipeService invUsecase.RecipeConsumptionService
}

// NewPOSOrderUsecase constructs a POSOrderUsecase.
func NewPOSOrderUsecase(
	db *gorm.DB,
	orderRepo repositories.PosOrderRepository,
	outletRepo orgRepos.OutletRepository,
	productRepo repositories.POSProductRepository,
	recipeService invUsecase.RecipeConsumptionService,
) POSOrderUsecase {
	return &posOrderUsecase{
		db:            db,
		orderRepo:     orderRepo,
		outletRepo:    outletRepo,
		productRepo:   productRepo,
		recipeService: recipeService,
	}
}

// ─── Create ──────────────────────────────────────────────────────────────────

func (u *posOrderUsecase) Create(ctx context.Context, req *dto.CreateOrderRequest, userID string) (*dto.POSOrderResponse, error) {
	if req.TableID != nil && *req.TableID != "" {
		existing, findErr := u.orderRepo.FindActiveByOutletAndTable(ctx, req.OutletID, *req.TableID)
		if findErr == nil {
			return mapper.ToPOSOrderResponse(existing), nil
		}
		if !errors.Is(findErr, gorm.ErrRecordNotFound) {
			return nil, findErr
		}
	}

	orderNum, err := u.orderRepo.GetNextOrderNumber(ctx, "ORD")
	if err != nil {
		return nil, err
	}

	actorID := normalizeUUID(userID)

	order := &posModels.PosOrder{
		OrderNumber:  orderNum,
		SessionID:    nil,
		OutletID:     req.OutletID,
		OrderType:    posModels.PosOrderType(req.OrderType),
		TableID:      req.TableID,
		TableLabel:   req.TableLabel,
		CustomerID:   req.CustomerID,
		CustomerName: req.CustomerName,
		GuestCount:   req.GuestCount,
		Status:       posModels.PosOrderStatusDraft,
		Notes:        req.Notes,
		CreatedBy:    actorID,
	}
	if order.GuestCount < 1 {
		order.GuestCount = 1
	}

	if err := u.orderRepo.Create(ctx, order); err != nil {
		return nil, err
	}

	return mapper.ToPOSOrderResponse(order), nil
}

// ─── GetByID ─────────────────────────────────────────────────────────────────

func (u *posOrderUsecase) GetByID(ctx context.Context, id string) (*dto.POSOrderResponse, error) {
	order, err := u.orderRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPOSOrderNotFound
		}
		return nil, err
	}
	return mapper.ToPOSOrderResponse(order), nil
}

// ─── List ────────────────────────────────────────────────────────────────────

func (u *posOrderUsecase) List(ctx context.Context, params repositories.POSOrderListParams) ([]dto.POSOrderResponse, int64, error) {
	orders, total, err := u.orderRepo.ListByParams(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	resps := make([]dto.POSOrderResponse, 0, len(orders))
	for i := range orders {
		resps = append(resps, *mapper.ToPOSOrderResponse(&orders[i]))
	}
	return resps, total, nil
}

// ─── Confirm ─────────────────────────────────────────────────────────────────

// Confirm transitions an order to IN_PROGRESS after validating stock availability.
func (u *posOrderUsecase) Confirm(ctx context.Context, id string, req *dto.ConfirmOrderRequest, userID string) (*dto.POSOrderResponse, error) {
	order, err := u.orderRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPOSOrderNotFound
		}
		return nil, err
	}
	if order.Status == posModels.PosOrderStatusPaid || order.Status == posModels.PosOrderStatusCompleted {
		return nil, ErrPOSOrderAlreadyPaid
	}
	if order.Status == posModels.PosOrderStatusVoided {
		return nil, ErrPOSOrderCannotModify
	}

	items := order.Items
	if len(items) == 0 {
		items, err = u.orderRepo.GetItems(ctx, id)
		if err != nil {
			return nil, err
		}
	}

	warehouseID, err := u.getWarehouseIDByOutlet(ctx, order.OutletID)
	if err != nil {
		return nil, err
	}
	for _, item := range items {
		if err := u.checkStockAvailability(ctx, item.ProductID, warehouseID, item.Quantity); err != nil {
			return nil, err
		}
	}

	order.Status = posModels.PosOrderStatusInProgress
	if err := u.orderRepo.Update(ctx, order); err != nil {
		return nil, err
	}
	return mapper.ToPOSOrderResponse(order), nil
}

// ─── Void ────────────────────────────────────────────────────────────────────

func (u *posOrderUsecase) Void(ctx context.Context, id string, req *dto.VoidOrderRequest, userID string) (*dto.POSOrderResponse, error) {
	order, err := u.orderRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPOSOrderNotFound
		}
		return nil, err
	}
	if order.Status == posModels.PosOrderStatusPaid || order.Status == posModels.PosOrderStatusCompleted {
		return nil, ErrPOSOrderCannotModify
	}

	order.Status = posModels.PosOrderStatusVoided
	order.VoidReason = &req.Reason
	if err := u.orderRepo.Update(ctx, order); err != nil {
		return nil, err
	}
	return mapper.ToPOSOrderResponse(order), nil
}

// ─── AddItem ─────────────────────────────────────────────────────────────────

func (u *posOrderUsecase) AddItem(ctx context.Context, orderID string, req *dto.AddOrderItemRequest) (*dto.POSOrderResponse, error) {
	order, err := u.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPOSOrderNotFound
		}
		return nil, err
	}
	if isTerminalStatus(order.Status) {
		return nil, ErrPOSOrderCannotModify
	}

	product, err := u.productRepo.FindByID(ctx, req.ProductID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPOSProductNotAvailable
		}
		return nil, err
	}

	item := &posModels.PosOrderItem{
		PosOrderID:  orderID,
		ProductID:   req.ProductID,
		ProductName: product.Name,
		ProductCode: product.Code,
		Quantity:    req.Quantity,
		UnitPrice:   product.SellingPrice,
		Subtotal:    product.SellingPrice * req.Quantity,
		Notes:       req.Notes,
		Status:      posModels.PosItemStatusPending,
	}
	if err := u.orderRepo.AddItem(ctx, item); err != nil {
		return nil, err
	}
	if err := u.recalculateAndSave(ctx, order); err != nil {
		return nil, err
	}
	return u.fetchOrderResponse(ctx, orderID)
}

// ─── UpdateItem ──────────────────────────────────────────────────────────────

func (u *posOrderUsecase) UpdateItem(ctx context.Context, orderID, itemID string, req *dto.UpdateOrderItemRequest) (*dto.POSOrderResponse, error) {
	order, err := u.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPOSOrderNotFound
		}
		return nil, err
	}
	if isTerminalStatus(order.Status) {
		return nil, ErrPOSOrderCannotModify
	}

	var target *posModels.PosOrderItem
	for i := range order.Items {
		if order.Items[i].ID == itemID {
			target = &order.Items[i]
			break
		}
	}
	if target == nil {
		return nil, ErrPOSOrderItemNotFound
	}

	target.Quantity = req.Quantity
	target.Subtotal = target.UnitPrice * req.Quantity
	target.Notes = req.Notes
	if err := u.orderRepo.UpdateItem(ctx, target); err != nil {
		return nil, err
	}
	if err := u.recalculateAndSave(ctx, order); err != nil {
		return nil, err
	}
	return u.fetchOrderResponse(ctx, orderID)
}

// ─── RemoveItem ──────────────────────────────────────────────────────────────

func (u *posOrderUsecase) RemoveItem(ctx context.Context, orderID, itemID string) (*dto.POSOrderResponse, error) {
	order, err := u.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPOSOrderNotFound
		}
		return nil, err
	}
	if isTerminalStatus(order.Status) {
		return nil, ErrPOSOrderCannotModify
	}
	if err := u.orderRepo.DeleteItem(ctx, itemID); err != nil {
		return nil, err
	}
	if err := u.recalculateAndSave(ctx, order); err != nil {
		return nil, err
	}
	return u.fetchOrderResponse(ctx, orderID)
}

// ─── GetCatalog ──────────────────────────────────────────────────────────────

func (u *posOrderUsecase) GetCatalog(ctx context.Context, outletID string) ([]dto.POSCatalogItem, error) {
	warehouseID := ""
	if outlet, err := u.outletRepo.GetByID(ctx, outletID); err == nil && outlet != nil && outlet.WarehouseID != nil {
		warehouseID = *outlet.WarehouseID
	}

	products, err := u.productRepo.FindPOSAvailable(ctx, warehouseID)
	if err != nil {
		return nil, err
	}

	items := make([]dto.POSCatalogItem, 0, len(products))
	for _, p := range products {
		items = append(items, dto.POSCatalogItem{
			ProductID:   p.ProductID,
			ProductCode: p.ProductCode,
			ProductName: p.ProductName,
			ProductKind: p.ProductKind,
			Price:       p.Price,
			Stock:       p.Stock,
			ImageURL:    p.ImageURL,
			Category:    p.Category,
			IsAvailable: p.IsAvailable,
		})
	}
	return items, nil
}

// ─── AssignTable ─────────────────────────────────────────────────────────────

func (u *posOrderUsecase) AssignTable(ctx context.Context, orderID string, req *dto.AssignTableRequest) (*dto.POSOrderResponse, error) {
	order, err := u.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPOSOrderNotFound
		}
		return nil, err
	}
	if isTerminalStatus(order.Status) {
		return nil, ErrPOSOrderCannotModify
	}

	order.TableID = &req.TableID
	order.TableLabel = &req.TableLabel
	if err := u.orderRepo.Update(ctx, order); err != nil {
		return nil, err
	}

	return mapper.ToPOSOrderResponse(order), nil
}

// ─── DeductStock ─────────────────────────────────────────────────────────────

// DeductStock reduces warehouse inventory for every item in the order.
// Called by POSPaymentUsecase after payment is confirmed.
func (u *posOrderUsecase) DeductStock(ctx context.Context, order *posModels.PosOrder, refNumber, userID string) error {
	warehouseID, err := u.getWarehouseIDByOutlet(ctx, order.OutletID)
	if err != nil {
		return err
	}

	items := order.Items
	if len(items) == 0 {
		items, err = u.orderRepo.GetItems(ctx, order.ID)
		if err != nil {
			return fmt.Errorf("load items for stock deduction: %w", err)
		}
	}

	now := apptime.Now()
	return u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, item := range items {
			product, err := u.productRepo.FindByID(ctx, item.ProductID)
			if err != nil {
				return fmt.Errorf("product %s not found: %w", item.ProductID, err)
			}
			if err := u.deductProductStock(ctx, tx, product, item.Quantity, warehouseID, order.ID, refNumber, now); err != nil {
				return fmt.Errorf("stock deduction for %s: %w", product.Code, err)
			}
		}
		return nil
	})
}

// ─── Private helpers ─────────────────────────────────────────────────────────

func (u *posOrderUsecase) recalculateAndSave(ctx context.Context, order *posModels.PosOrder) error {
	items, err := u.orderRepo.GetItems(ctx, order.ID)
	if err != nil {
		return err
	}
	var subtotal float64
	for _, item := range items {
		subtotal += item.Subtotal
	}
	order.Subtotal = subtotal
	order.TotalAmount = subtotal + order.TaxAmount + order.ServiceCharge - order.DiscountAmount
	return u.orderRepo.Update(ctx, order)
}

func (u *posOrderUsecase) fetchOrderResponse(ctx context.Context, orderID string) (*dto.POSOrderResponse, error) {
	order, err := u.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	return mapper.ToPOSOrderResponse(order), nil
}

func (u *posOrderUsecase) checkStockAvailability(ctx context.Context, productID, warehouseID string, qty float64) error {
	product, err := u.productRepo.FindByID(ctx, productID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrPOSProductNotAvailable
		}
		return err
	}
	if product.ProductKind == productModels.ProductKindService ||
		product.ProductKind == productModels.ProductKindRecipe {
		return nil
	}
	var available float64
	u.db.WithContext(ctx).
		Table("inventory_batches").
		Where("product_id = ? AND warehouse_id = ? AND deleted_at IS NULL", productID, warehouseID).
		Select("COALESCE(SUM(current_quantity - reserved_quantity), 0)").
		Scan(&available)
	if available < qty {
		return ErrPOSInsufficientStock
	}
	return nil
}

func (u *posOrderUsecase) getWarehouseIDByOutlet(ctx context.Context, outletID string) (string, error) {
	outlet, err := u.outletRepo.GetByID(ctx, outletID)
	if err != nil {
		return "", fmt.Errorf("failed to get outlet: %w", err)
	}
	if outlet == nil || outlet.WarehouseID == nil || *outlet.WarehouseID == "" {
		return "", ErrPOSProductNotAvailable
	}
	return *outlet.WarehouseID, nil
}

func (u *posOrderUsecase) deductProductStock(
	ctx context.Context, tx *gorm.DB,
	product *productModels.Product, qty float64,
	warehouseID, refID, refNumber string, now time.Time,
) error {
	if product.ProductKind == productModels.ProductKindRecipe {
		return u.recipeService.ConsumeRecipeIngredients(ctx, invUsecase.ConsumeRecipeRequest{
			ProductID:   product.ID,
			WarehouseID: warehouseID,
			QtySold:     qty,
			RefType:     "POS_SALE",
			RefID:       refID,
		})
	}
	if product.ProductKind != productModels.ProductKindStock {
		return nil // SERVICE kind: no stock to deduct
	}

	var batches []invModels.InventoryBatch
	if err := tx.Where(
		"product_id = ? AND warehouse_id = ? AND current_quantity > 0 AND deleted_at IS NULL",
		product.ID, warehouseID,
	).Order("created_at ASC").Find(&batches).Error; err != nil {
		return fmt.Errorf("read batches: %w", err)
	}

	remaining := qty
	for _, batch := range batches {
		if remaining <= 0 {
			break
		}
		deduct := batch.CurrentQuantity
		if deduct > remaining {
			deduct = remaining
		}
		remaining -= deduct
		if err := tx.Model(&invModels.InventoryBatch{}).
			Where("id = ?", batch.ID).
			Update("current_quantity", batch.CurrentQuantity-deduct).Error; err != nil {
			return fmt.Errorf("update batch %s: %w", batch.ID, err)
		}
		batchID := batch.ID
		movement := &invModels.StockMovement{
			ID:               uuid.New().String(),
			ProductID:        product.ID,
			WarehouseID:      warehouseID,
			InventoryBatchID: &batchID,
			MovementType:     invModels.MovementTypeOut,
			QtyOut:           deduct,
			RefType:          "POS_SALE",
			RefID:            refID,
			RefNumber:        refNumber,
			Source:           "POS",
		}
		if err := tx.Create(movement).Error; err != nil {
			return fmt.Errorf("create movement: %w", err)
		}
	}
	return nil
}

func isTerminalStatus(status posModels.PosOrderStatus) bool {
	return status == posModels.PosOrderStatusPaid ||
		status == posModels.PosOrderStatusCompleted ||
		status == posModels.PosOrderStatusVoided
}

func normalizeUUID(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return uuid.Nil.String()
	}
	if _, err := uuid.Parse(trimmed); err == nil {
		return trimmed
	}
	return uuid.NewSHA1(uuid.NameSpaceOID, []byte(trimmed)).String()
}
