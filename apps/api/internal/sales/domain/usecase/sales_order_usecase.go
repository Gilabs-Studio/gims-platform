package usecase

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/core/utils"
	productRepos "github.com/gilabs/gims/api/internal/product/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/data/models"
	salesQuotationRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
	salesRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"github.com/gilabs/gims/api/internal/sales/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrSalesOrderNotFound      = errors.New("sales order not found")
	ErrSalesOrderAlreadyExists = errors.New("sales order with this code already exists")
	ErrInvalidOrderStatusTransition = errors.New("invalid order status transition")
	ErrOrderProductNotFound         = errors.New("product not found in order")
	ErrInvalidOrderStatus      = errors.New("cannot modify order in current status")
	ErrQuotationNotFound       = errors.New("sales quotation not found")
	ErrQuotationNotApproved    = errors.New("quotation must be approved before converting to order")
	ErrInsufficientStock       = errors.New("insufficient stock available")
)

// SalesOrderUsecase defines the interface for sales order business logic
type SalesOrderUsecase interface {
	List(ctx context.Context, req *dto.ListSalesOrdersRequest) ([]dto.SalesOrderResponse, *utils.PaginationResult, error)
	GetByID(ctx context.Context, id string) (*dto.SalesOrderResponse, error)
	ListItems(ctx context.Context, orderID string, req *dto.ListSalesOrderItemsRequest) ([]dto.SalesOrderItemResponse, *utils.PaginationResult, error)
	Create(ctx context.Context, req *dto.CreateSalesOrderRequest, createdBy *string) (*dto.SalesOrderResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateSalesOrderRequest) (*dto.SalesOrderResponse, error)
	Delete(ctx context.Context, id string) error
	UpdateStatus(ctx context.Context, id string, req *dto.UpdateSalesOrderStatusRequest, userID *string) (*dto.SalesOrderResponse, error)
	ConvertFromQuotation(ctx context.Context, req *dto.ConvertFromQuotationRequest, createdBy *string) (*dto.SalesOrderResponse, error)
}

type salesOrderUsecase struct {
	orderRepo     salesRepos.SalesOrderRepository
	quotationRepo salesQuotationRepos.SalesQuotationRepository
	productRepo   productRepos.ProductRepository
}

// NewSalesOrderUsecase creates a new SalesOrderUsecase
func NewSalesOrderUsecase(
	orderRepo salesRepos.SalesOrderRepository,
	quotationRepo salesQuotationRepos.SalesQuotationRepository,
	productRepo productRepos.ProductRepository,
) SalesOrderUsecase {
	return &salesOrderUsecase{
		orderRepo:     orderRepo,
		quotationRepo: quotationRepo,
		productRepo:   productRepo,
	}
}

func (u *salesOrderUsecase) List(ctx context.Context, req *dto.ListSalesOrdersRequest) ([]dto.SalesOrderResponse, *utils.PaginationResult, error) {
	orders, total, err := u.orderRepo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.SalesOrderResponse, len(orders))
	for i := range orders {
		responses[i] = mapper.ToSalesOrderResponse(&orders[i])
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

func (u *salesOrderUsecase) ListItems(ctx context.Context, orderID string, req *dto.ListSalesOrderItemsRequest) ([]dto.SalesOrderItemResponse, *utils.PaginationResult, error) {
	// Verify order exists
	_, err := u.orderRepo.FindByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrSalesOrderNotFound
		}
		return nil, nil, err
	}

	// Fetch paginated items
	items, total, err := u.orderRepo.ListItems(ctx, orderID, req)
	if err != nil {
		return nil, nil, err
	}

	// Map to response DTOs
	responses := make([]dto.SalesOrderItemResponse, len(items))
	for i := range items {
		responses[i] = mapper.ToSalesOrderItemResponse(&items[i])
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

func (u *salesOrderUsecase) GetByID(ctx context.Context, id string) (*dto.SalesOrderResponse, error) {
	order, err := u.orderRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSalesOrderNotFound
		}
		return nil, err
	}

	response := mapper.ToSalesOrderResponse(order)
	return &response, nil
}

func (u *salesOrderUsecase) Create(ctx context.Context, req *dto.CreateSalesOrderRequest, createdBy *string) (*dto.SalesOrderResponse, error) {
	// Validate products exist and get default prices
	for _, item := range req.Items {
		product, err := u.productRepo.FindByID(ctx, item.ProductID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, ErrOrderProductNotFound
			}
			return nil, err
		}

		// Use product selling price if price not provided
		if item.Price == 0 {
			item.Price = product.SellingPrice
		}
	}

	// Generate order number
	code, err := u.orderRepo.GetNextOrderNumber(ctx, "SO")
	if err != nil {
		return nil, err
	}

	// Convert request to model
	order, err := mapper.ToSalesOrderModel(req, code, createdBy)
	if err != nil {
		return nil, err
	}

	// Calculate totals
	u.calculateTotals(order)

	// Create order
	if err := u.orderRepo.Create(ctx, order); err != nil {
		return nil, err
	}

	// Update quotation status if linked
	if order.SalesQuotationID != nil {
		if err := u.quotationRepo.UpdateStatus(ctx, *order.SalesQuotationID, models.SalesQuotationStatusConverted, createdBy, nil); err != nil {
			// Log error but don't fail transaction as order is created
		}
	}

	// Fetch created order with relations
	created, err := u.orderRepo.FindByID(ctx, order.ID)
	if err != nil {
		return nil, err
	}

	response := mapper.ToSalesOrderResponse(created)
	return &response, nil
}

func (u *salesOrderUsecase) Update(ctx context.Context, id string, req *dto.UpdateSalesOrderRequest) (*dto.SalesOrderResponse, error) {
	order, err := u.orderRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSalesOrderNotFound
		}
		return nil, err
	}

	// Check if order can be modified
	if order.Status != models.SalesOrderStatusDraft {
		return nil, ErrInvalidOrderStatus
	}

	// Validate products if items are being updated
	if len(req.Items) > 0 {
		for _, item := range req.Items {
			product, err := u.productRepo.FindByID(ctx, item.ProductID)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return nil, ErrOrderProductNotFound
				}
				return nil, err
			}

			// Use product selling price if price not provided
			if item.Price == 0 {
				item.Price = product.SellingPrice
			}
		}
	}

	// Update model
	if err := mapper.UpdateSalesOrderModel(order, req); err != nil {
		return nil, err
	}

	// Recalculate totals
	u.calculateTotals(order)

	// Update order
	if err := u.orderRepo.Update(ctx, order); err != nil {
		return nil, err
	}

	// Fetch updated order with relations
	updated, err := u.orderRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToSalesOrderResponse(updated)
	return &response, nil
}

func (u *salesOrderUsecase) Delete(ctx context.Context, id string) error {
	order, err := u.orderRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrSalesOrderNotFound
		}
		return err
	}

	// Only allow deletion of draft orders
	if order.Status != models.SalesOrderStatusDraft {
		return ErrInvalidOrderStatus
	}

	// Release stock if reserved
	if order.ReservedStock {
		if err := u.orderRepo.ReleaseStock(ctx, id); err != nil {
			return err
		}
	}

	return u.orderRepo.Delete(ctx, id)
}

func (u *salesOrderUsecase) UpdateStatus(ctx context.Context, id string, req *dto.UpdateSalesOrderStatusRequest, userID *string) (*dto.SalesOrderResponse, error) {
	order, err := u.orderRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSalesOrderNotFound
		}
		return nil, err
	}

	newStatus := models.SalesOrderStatus(req.Status)

	// Validate status transition
	if !u.isValidStatusTransition(order.Status, newStatus) {
		return nil, ErrInvalidOrderStatusTransition
	}

	// Handle stock reservation on confirmation
	if newStatus == models.SalesOrderStatusConfirmed && !order.ReservedStock {
		// Reserve stock
		if err := u.orderRepo.ReserveStock(ctx, id); err != nil {
			return nil, err
		}
	}

	// Handle stock release on cancellation
	if newStatus == models.SalesOrderStatusCancelled && order.ReservedStock {
		// Release stock
		if err := u.orderRepo.ReleaseStock(ctx, id); err != nil {
			return nil, err
		}
	}

	// Update status
	var reason *string
	if req.CancellationReason != nil {
		reason = req.CancellationReason
	}

	if err := u.orderRepo.UpdateStatus(ctx, id, newStatus, userID, reason); err != nil {
		return nil, err
	}

	// Fetch updated order
	updated, err := u.orderRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToSalesOrderResponse(updated)
	return &response, nil
}

func (u *salesOrderUsecase) ConvertFromQuotation(ctx context.Context, req *dto.ConvertFromQuotationRequest, createdBy *string) (*dto.SalesOrderResponse, error) {
	// Fetch quotation
	quotation, err := u.quotationRepo.FindByID(ctx, req.QuotationID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrQuotationNotFound
		}
		return nil, err
	}

	// Validate quotation status
	if quotation.Status != models.SalesQuotationStatusApproved {
		return nil, ErrQuotationNotApproved
	}

	// Generate order number
	code, err := u.orderRepo.GetNextOrderNumber(ctx, "SO")
	if err != nil {
		return nil, err
	}

	// Convert quotation to order
	order, err := mapper.ConvertQuotationToOrderModel(quotation, req.DeliveryAreaID, req.Notes, code, createdBy)
	if err != nil {
		return nil, err
	}

	// Create order
	if err := u.orderRepo.Create(ctx, order); err != nil {
		return nil, err
	}

	// Update quotation status to converted
	if err := u.quotationRepo.UpdateStatus(ctx, quotation.ID, models.SalesQuotationStatusConverted, createdBy, nil); err != nil {
		// Log error but don't fail the order creation
		// TODO: Add logging
	}

	// Fetch created order with relations
	created, err := u.orderRepo.FindByID(ctx, order.ID)
	if err != nil {
		return nil, err
	}

	response := mapper.ToSalesOrderResponse(created)
	return &response, nil
}

// calculateTotals calculates all financial totals for the order
func (u *salesOrderUsecase) calculateTotals(order *models.SalesOrder) {
	// Calculate subtotal from items
	subtotal := 0.0
	for i := range order.Items {
		order.Items[i].CalculateSubtotal()
		subtotal += order.Items[i].Subtotal
	}

	order.Subtotal = subtotal

	// Apply discount
	subtotalAfterDiscount := order.Subtotal - order.DiscountAmount
	if subtotalAfterDiscount < 0 {
		subtotalAfterDiscount = 0
	}

	// Calculate tax (on subtotal after discount)
	if order.TaxRate == 0 {
		order.TaxRate = 11.00 // Default 11% PPN
	}
	order.TaxAmount = subtotalAfterDiscount * (order.TaxRate / 100.0)

	// Calculate total: Subtotal - Discount + Tax + Delivery + Other
	order.TotalAmount = subtotalAfterDiscount + order.TaxAmount + order.DeliveryCost + order.OtherCost
}

// isValidStatusTransition validates if status transition is allowed
func (u *salesOrderUsecase) isValidStatusTransition(current, new models.SalesOrderStatus) bool {
	validTransitions := map[models.SalesOrderStatus][]models.SalesOrderStatus{
		models.SalesOrderStatusDraft: {
			models.SalesOrderStatusConfirmed,
			models.SalesOrderStatusCancelled,
		},
		models.SalesOrderStatusConfirmed: {
			models.SalesOrderStatusProcessing,
			models.SalesOrderStatusCancelled,
		},
		models.SalesOrderStatusProcessing: {
			models.SalesOrderStatusShipped,
			models.SalesOrderStatusCancelled,
		},
		models.SalesOrderStatusShipped: {
			models.SalesOrderStatusDelivered,
		},
		models.SalesOrderStatusDelivered: {
			// Cannot transition from delivered
		},
		models.SalesOrderStatusCancelled: {
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
