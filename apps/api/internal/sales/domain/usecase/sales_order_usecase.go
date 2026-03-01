package usecase

import (
	"context"
	"errors"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/core/utils"
	inventoryUsecase "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	organizationRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	productRepos "github.com/gilabs/gims/api/internal/product/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/data/models"
	salesQuotationRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
	salesRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"github.com/gilabs/gims/api/internal/sales/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrSalesOrderNotFound           = errors.New("sales order not found")
	ErrSalesOrderAlreadyExists      = errors.New("sales order with this code already exists")
	ErrInvalidOrderStatusTransition = errors.New("invalid order status transition")
	ErrOrderProductNotFound         = errors.New("product not found in order")
	ErrInvalidOrderStatus           = errors.New("cannot modify order in current status")
	ErrQuotationNotFound            = errors.New("sales quotation not found")
	ErrQuotationNotApproved         = errors.New("quotation must be approved before converting to order")
	ErrInsufficientStock            = errors.New("insufficient stock available")
	ErrUnauthorizedAccess           = errors.New("unauthorized access to sales order")
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
	db                *gorm.DB
	orderRepo         salesRepos.SalesOrderRepository
	deliveryOrderRepo salesRepos.DeliveryOrderRepository
	quotationRepo     salesQuotationRepos.SalesQuotationRepository
	productRepo       productRepos.ProductRepository
	inventoryUC       inventoryUsecase.InventoryUsecase
	employeeRepo      organizationRepos.EmployeeRepository
}

// NewSalesOrderUsecase creates a new SalesOrderUsecase
func NewSalesOrderUsecase(
	db *gorm.DB,
	orderRepo salesRepos.SalesOrderRepository,
	deliveryOrderRepo salesRepos.DeliveryOrderRepository,
	quotationRepo salesQuotationRepos.SalesQuotationRepository,
	productRepo productRepos.ProductRepository,
	inventoryUC inventoryUsecase.InventoryUsecase,
	employeeRepo organizationRepos.EmployeeRepository,
) SalesOrderUsecase {
	return &salesOrderUsecase{
		db:                db,
		orderRepo:         orderRepo,
		deliveryOrderRepo: deliveryOrderRepo,
		quotationRepo:     quotationRepo,
		productRepo:       productRepo,
		inventoryUC:       inventoryUC,
		employeeRepo:      employeeRepo,
	}
}

func (u *salesOrderUsecase) List(ctx context.Context, req *dto.ListSalesOrdersRequest) ([]dto.SalesOrderResponse, *utils.PaginationResult, error) {
	// Scope filtering is now handled at the repository level via ApplyScopeFilter.
	// The ScopeMiddleware + RequirePermission middleware inject scope context values
	// that the repository reads to apply OWN/DIVISION/AREA/ALL filtering.

	orders, total, err := u.orderRepo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.SalesOrderResponse, len(orders))
	for i := range orders {
		// For approved orders, fetch pending delivery quantities
		var pendingQtyMap map[string]float64
		if orders[i].Status == models.SalesOrderStatusApproved {
			pendingQtyMap, _ = u.deliveryOrderRepo.GetPendingDeliveryQtyBySalesOrder(ctx, orders[i].ID)
		}
		responses[i] = mapper.ToSalesOrderResponse(&orders[i], pendingQtyMap)
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
	order, err := u.orderRepo.FindByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrSalesOrderNotFound
		}
		return nil, nil, err
	}

	// Access Control
	if err := u.checkAccess(ctx, order); err != nil {
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
		responses[i] = mapper.ToSalesOrderItemResponse(&items[i], 0)
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

	// Scope-based access control: consistent with List filtering
	if !security.CheckRecordScopeAccess(u.db, ctx, &models.SalesOrder{}, id, security.SalesScopeQueryOptions()) {
		return nil, ErrSalesOrderNotFound
	}

	// Fetch pending delivery quantities for this order
	pendingQtyMap, _ := u.deliveryOrderRepo.GetPendingDeliveryQtyBySalesOrder(ctx, order.ID)

	response := mapper.ToSalesOrderResponse(order, pendingQtyMap)
	return &response, nil
}

func (u *salesOrderUsecase) Create(ctx context.Context, req *dto.CreateSalesOrderRequest, createdBy *string) (*dto.SalesOrderResponse, error) {
	// Validate products exist and get default prices
	productMap := make(map[string]*productModels.Product)
	for i, item := range req.Items {
		product, err := u.productRepo.FindByID(ctx, item.ProductID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, ErrOrderProductNotFound
			}
			return nil, err
		}

		// Use product selling price if price not provided
		if item.Price == 0 {
			req.Items[i].Price = product.SellingPrice
		}

		productMap[item.ProductID] = product
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

	// Populate snapshot fields
	for i := range order.Items {
		if p, ok := productMap[order.Items[i].ProductID]; ok {
			order.Items[i].ProductCode = p.Code
			order.Items[i].ProductName = p.Name
		}
	}

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

	response := mapper.ToSalesOrderResponse(created, nil)
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
	if err := u.checkAccess(ctx, order); err != nil {
		return nil, err
	}

	// Check if order can be modified
	if order.Status != models.SalesOrderStatusDraft {
		return nil, ErrInvalidOrderStatus
	}

	// Validate products if items are being updated
	productMap := make(map[string]*productModels.Product)
	if len(req.Items) > 0 {
		for i, item := range req.Items {
			product, err := u.productRepo.FindByID(ctx, item.ProductID)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return nil, ErrOrderProductNotFound
				}
				return nil, err
			}

			// Use product selling price if price not provided
			if item.Price == 0 {
				req.Items[i].Price = product.SellingPrice
			}

			productMap[item.ProductID] = product
		}
	}

	// Update model
	if err := mapper.UpdateSalesOrderModel(order, req); err != nil {
		return nil, err
	}

	// Recalculate totals
	u.calculateTotals(order)

	// Populate snapshot fields if items updated
	if len(req.Items) > 0 {
		for i := range order.Items {
			if p, ok := productMap[order.Items[i].ProductID]; ok {
				order.Items[i].ProductCode = p.Code
				order.Items[i].ProductName = p.Name
			}
		}
	}

	// Update order
	if err := u.orderRepo.Update(ctx, order); err != nil {
		return nil, err
	}

	// Fetch updated order with relations
	updated, err := u.orderRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToSalesOrderResponse(updated, nil)
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

	// Check if order can be modified
	if err := u.checkAccess(ctx, order); err != nil {
		return err
	}

	// Only allow deletion of draft orders
	if order.Status != models.SalesOrderStatusDraft {
		return ErrInvalidOrderStatus
	}

	// Release stock if reserved
	if order.ReservedStock {
		// Release stock in inventory
		for _, item := range order.Items {
			if err := u.inventoryUC.ReleaseStock(ctx, item.ProductID, item.Quantity); err != nil {
				return err
			}
		}

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

	// Check if order can be modified
	if err := u.checkAccess(ctx, order); err != nil {
		return nil, err
	}

	newStatus := models.SalesOrderStatus(req.Status)

	// Validate status transition
	if !u.isValidStatusTransition(order.Status, newStatus) {
		return nil, ErrInvalidOrderStatusTransition
	}

	// Handle stock reservation on approval (wrapped in transaction for atomicity)
	if newStatus == models.SalesOrderStatusApproved && !order.ReservedStock {
		err := u.db.Transaction(func(tx *gorm.DB) error {
			txCtx := database.WithTx(ctx, tx)

			// Reserve stock at product level for each item
			for _, item := range order.Items {
				if err := u.inventoryUC.ReserveStock(txCtx, item.ProductID, item.Quantity); err != nil {
					return err
				}
			}

			// Mark as reserved in SO
			if err := u.orderRepo.ReserveStock(txCtx, id); err != nil {
				return err
			}

			return nil
		})
		if err != nil {
			return nil, err
		}
	}

	// Handle stock release on cancellation (wrapped in transaction for atomicity)
	if newStatus == models.SalesOrderStatusCancelled && order.ReservedStock {
		err := u.db.Transaction(func(tx *gorm.DB) error {
			txCtx := database.WithTx(ctx, tx)

			// Release stock at product level for each item
			for _, item := range order.Items {
				if err := u.inventoryUC.ReleaseStock(txCtx, item.ProductID, item.Quantity); err != nil {
					return err
				}
			}

			// Mark as released in SO
			if err := u.orderRepo.ReleaseStock(txCtx, id); err != nil {
				return err
			}

			return nil
		})
		if err != nil {
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

	response := mapper.ToSalesOrderResponse(updated, nil)
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

	// Convert quotation to order (pass customer info — use request fields with quotation fallback)
	customerName := req.CustomerName
	if customerName == "" {
		customerName = quotation.CustomerName
	}
	customerContact := req.CustomerContact
	if customerContact == "" {
		customerContact = quotation.CustomerContact
	}
	customerPhone := req.CustomerPhone
	if customerPhone == "" {
		customerPhone = quotation.CustomerPhone
	}
	customerEmail := req.CustomerEmail
	if customerEmail == "" {
		customerEmail = quotation.CustomerEmail
	}
	order, err := mapper.ConvertQuotationToOrderModel(quotation, req.DeliveryAreaID, customerName, customerContact, customerPhone, customerEmail, req.Notes, code, createdBy)
	if err != nil {
		return nil, err
	}

	// Create order
	if err := u.orderRepo.Create(ctx, order); err != nil {
		return nil, err
	}

	// Update quotation status to converted
	if err := u.quotationRepo.UpdateStatus(ctx, quotation.ID, models.SalesQuotationStatusConverted, createdBy, nil); err != nil {
		log.Printf("Warning: failed to update quotation %s status to converted: %v", quotation.ID, err)
	}

	// Fetch created order with relations
	created, err := u.orderRepo.FindByID(ctx, order.ID)
	if err != nil {
		return nil, err
	}

	response := mapper.ToSalesOrderResponse(created, nil)
	return &response, nil
}

// checkAccess verifies if the current user has access to the order
func (u *salesOrderUsecase) checkAccess(ctx context.Context, order *models.SalesOrder) error {
	userRole, _ := ctx.Value("user_role").(string)
	userID, _ := ctx.Value("user_id").(string)

	// Admin and Manager bypass checks
	if userRole == "admin" || userRole == "manager" {
		return nil
	}

	// If no user context, assume internal call or unsecured?
	if userID == "" {
		// Secure by default: if we don't know who you are, you can't touch it.
		// Unless it's a system process (which might not have user_id but should be handled via different context or role)
		return ErrSalesOrderNotFound
	}

	// Check if user is the creator
	if order.CreatedBy != nil && *order.CreatedBy == userID {
		return nil
	}

	// Check if user is the assigned Sales Rep
	// Optimization: Avoid DB call if SalesRepID matches directly
	if order.SalesRepID != nil {
		// First check if the user IS the sales rep directly (if user ID matches employee ID logic, but usually they are different)
		// We need to fetch employee record for the user to compare with SalesRepID
		employee, err := u.employeeRepo.FindByUserID(ctx, userID)
		if err != nil {
			// If user is not an employee, they probably shouldn't see orders
			return ErrSalesOrderNotFound
		}

		if *order.SalesRepID == employee.ID {
			return nil
		}
	}

	return ErrSalesOrderNotFound // Access Denied (Obfuscated)
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
			models.SalesOrderStatusSubmitted,
			models.SalesOrderStatusCancelled,
		},
		models.SalesOrderStatusSubmitted: {
			models.SalesOrderStatusApproved,
			models.SalesOrderStatusRejected,
		},
		models.SalesOrderStatusApproved: {
			models.SalesOrderStatusClosed,
			models.SalesOrderStatusCancelled,
		},
		models.SalesOrderStatusClosed: {
			// Cannot transition from closed
		},
		models.SalesOrderStatusRejected: {
			models.SalesOrderStatusDraft,
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
