package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/core/utils"
	productRepos "github.com/gilabs/gims/api/internal/product/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"github.com/gilabs/gims/api/internal/sales/domain/mapper"
	"gorm.io/gorm"
)

// Date format constant
const dateFormat = "2006-01-02"

// Errors
var (
	ErrCustomerInvoiceNotFound = errors.New("customer invoice not found")
	ErrInvalidInvoiceStatus    = errors.New("invalid invoice status for this operation")
	ErrInvoiceExceedsRemaining = errors.New("invoice quantity exceeds remaining invoiceable quantity")
	ErrInvoiceDOMismatch       = errors.New("delivery order does not belong to the same sales order")
)

// CustomerInvoiceUsecase defines the interface for customer invoice business logic
type CustomerInvoiceUsecase interface {
	List(ctx context.Context, req *dto.ListCustomerInvoicesRequest) ([]dto.CustomerInvoiceResponse, *utils.PaginationResult, error)
	GetByID(ctx context.Context, id string) (*dto.CustomerInvoiceResponse, error)
	ListItems(ctx context.Context, invoiceID string, req *dto.ListCustomerInvoiceItemsRequest) ([]dto.CustomerInvoiceItemResponse, *utils.PaginationResult, error)
	Create(ctx context.Context, req *dto.CreateCustomerInvoiceRequest, createdBy *string) (*dto.CustomerInvoiceResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateCustomerInvoiceRequest) (*dto.CustomerInvoiceResponse, error)
	Delete(ctx context.Context, id string) error
	UpdateStatus(ctx context.Context, id string, req *dto.UpdateCustomerInvoiceStatusRequest, userID *string) (*dto.CustomerInvoiceResponse, error)
}

type customerInvoiceUsecase struct {
	db             *gorm.DB
	invoiceRepo    repositories.CustomerInvoiceRepository
	productRepo    productRepos.ProductRepository
	salesOrderRepo repositories.SalesOrderRepository
}

// NewCustomerInvoiceUsecase creates a new CustomerInvoiceUsecase
func NewCustomerInvoiceUsecase(
	db *gorm.DB,
	invoiceRepo repositories.CustomerInvoiceRepository,
	productRepo productRepos.ProductRepository,
	salesOrderRepo repositories.SalesOrderRepository,
) CustomerInvoiceUsecase {
	return &customerInvoiceUsecase{
		db:             db,
		invoiceRepo:    invoiceRepo,
		productRepo:    productRepo,
		salesOrderRepo: salesOrderRepo,
	}
}

func (uc *customerInvoiceUsecase) List(ctx context.Context, req *dto.ListCustomerInvoicesRequest) ([]dto.CustomerInvoiceResponse, *utils.PaginationResult, error) {
	req.Status = normalizeCustomerInvoiceListStatus(req.Status)

	invoices, total, err := uc.invoiceRepo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

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

	return mapper.MapCustomerInvoicesToResponse(invoices), pagination, nil
}

func normalizeCustomerInvoiceListStatus(status string) string {
	normalized := strings.ToUpper(strings.TrimSpace(status))
	if normalized == "" {
		return ""
	}

	// Backward-compatible alias: older clients use "sent" for pending approval.
	if normalized == "SENT" {
		return "SUBMITTED"
	}

	if normalized == "CANCELED" {
		return "CANCELLED"
	}

	return normalized
}

func (uc *customerInvoiceUsecase) GetByID(ctx context.Context, id string) (*dto.CustomerInvoiceResponse, error) {
	invoice, err := uc.invoiceRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrCustomerInvoiceNotFound
	}

	// Scope-based access control: consistent with List filtering
	if !security.CheckRecordScopeAccess(uc.db, ctx, &models.CustomerInvoice{}, id, security.DefaultScopeQueryOptions()) {
		return nil, ErrCustomerInvoiceNotFound
	}

	return mapper.MapCustomerInvoiceToResponse(invoice), nil
}

func (uc *customerInvoiceUsecase) ListItems(ctx context.Context, invoiceID string, req *dto.ListCustomerInvoiceItemsRequest) ([]dto.CustomerInvoiceItemResponse, *utils.PaginationResult, error) {
	// Verify invoice exists
	_, err := uc.invoiceRepo.FindByID(ctx, invoiceID)
	if err != nil {
		return nil, nil, ErrCustomerInvoiceNotFound
	}

	items, total, err := uc.invoiceRepo.ListItems(ctx, invoiceID, req)
	if err != nil {
		return nil, nil, err
	}

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

	return mapper.MapCustomerInvoiceItemsToResponse(items), pagination, nil
}

func (uc *customerInvoiceUsecase) Create(ctx context.Context, req *dto.CreateCustomerInvoiceRequest, createdBy *string) (*dto.CustomerInvoiceResponse, error) {
	// Parse invoice date
	invoiceDate, err := time.Parse(dateFormat, req.InvoiceDate)
	if err != nil {
		return nil, err
	}

	// Generate invoice code
	code, err := uc.invoiceRepo.GetNextInvoiceNumber(ctx, "INV")
	if err != nil {
		return nil, err
	}

	// Parse type with default
	invoiceType := models.CustomerInvoiceTypeRegular
	if req.Type != "" {
		invoiceType = models.CustomerInvoiceType(req.Type)
	}

	// Fetch sales order for partial invoicing validation
	var salesOrder *models.SalesOrder
	if req.SalesOrderID != nil {
		salesOrder, err = uc.salesOrderRepo.FindByID(ctx, *req.SalesOrderID)
		if err != nil {
			return nil, fmt.Errorf("sales order not found: %w", err)
		}
	}

	// Validate delivery order belongs to the same sales order (if provided)
	if req.DeliveryOrderID != nil && salesOrder != nil {
		doFound := false
		for _, do := range salesOrder.DeliveryOrders {
			if do.ID == *req.DeliveryOrderID {
				doFound = true
				break
			}
		}
		if !doFound {
			return nil, ErrInvoiceDOMismatch
		}
	}

	invoice := &models.CustomerInvoice{
		Code:                 code,
		Type:                 invoiceType,
		InvoiceDate:          invoiceDate,
		SalesOrderID:         req.SalesOrderID,
		DeliveryOrderID:      req.DeliveryOrderID,
		PaymentTermsID:       req.PaymentTermsID,
		DownPaymentInvoiceID: req.DownPaymentInvoiceID,
		TaxRate:              req.TaxRate,
		DeliveryCost:         req.DeliveryCost,
		OtherCost:            req.OtherCost,
		Notes:                req.Notes,
		Status:               models.CustomerInvoiceStatusDraft,
		CreatedBy:            createdBy,
	}

	// Parse due date
	if req.DueDate != nil && *req.DueDate != "" {
		dueDate, err := time.Parse(dateFormat, *req.DueDate)
		if err == nil {
			invoice.DueDate = &dueDate
		}
	}

	// Build SO item lookup for partial invoicing validation
	soItemMap := make(map[string]*models.SalesOrderItem)
	if salesOrder != nil {
		for i := range salesOrder.Items {
			soItemMap[salesOrder.Items[i].ID] = &salesOrder.Items[i]
		}
	}

	// Build items with partial invoicing validation
	var subtotal float64
	items := make([]models.CustomerInvoiceItem, len(req.Items))
	for i, itemReq := range req.Items {
		// Verify product exists
		product, err := uc.productRepo.FindByID(ctx, itemReq.ProductID)
		if err != nil {
			return nil, ErrProductNotFound
		}

		// Validate invoiceable quantity against SO item (partial invoicing guard)
		if itemReq.SalesOrderItemID != nil {
			soItem, ok := soItemMap[*itemReq.SalesOrderItemID]
			if !ok {
				return nil, fmt.Errorf("sales order item %s not found", *itemReq.SalesOrderItemID)
			}
			remainingQty := soItem.Quantity - soItem.InvoicedQuantity
			if itemReq.Quantity > remainingQty {
				return nil, fmt.Errorf("%w: product %s has %.3f remaining, requested %.3f",
					ErrInvoiceExceedsRemaining, product.Name, remainingQty, itemReq.Quantity)
			}
		}

		itemSubtotal := (itemReq.Price * itemReq.Quantity) - itemReq.Discount
		subtotal += itemSubtotal

		items[i] = models.CustomerInvoiceItem{
			ProductID:           itemReq.ProductID,
			SalesOrderItemID:    itemReq.SalesOrderItemID,
			DeliveryOrderItemID: itemReq.DeliveryOrderItemID,
			Quantity:            itemReq.Quantity,
			Price:               itemReq.Price,
			Discount:            itemReq.Discount,
			Subtotal:            itemSubtotal,
			HPPAmount:           itemReq.HPPAmount,
		}

		// Use product's current HPP if not provided
		if items[i].HPPAmount == 0 && product.CurrentHpp > 0 {
			items[i].HPPAmount = product.CurrentHpp
		}
	}

	invoice.Items = items
	invoice.Subtotal = subtotal
	invoice.TaxAmount = subtotal * (invoice.TaxRate / 100)

	// Default calculation without DP
	invoice.Amount = subtotal + invoice.TaxAmount + invoice.DeliveryCost + invoice.OtherCost

	// Deduct paid Down Payments if this is a regular invoice with a sales order
	if req.SalesOrderID != nil && invoiceType == models.CustomerInvoiceTypeRegular {
		dpReq := &dto.ListCustomerInvoicesRequest{
			SalesOrderID: *req.SalesOrderID,
			Type:         string(models.CustomerInvoiceTypeDownPayment),
			Status:       string(models.CustomerInvoiceStatusPaid),
			PerPage:      100,
		}
		if dps, _, err := uc.invoiceRepo.List(ctx, dpReq); err == nil {
			var totalDP float64
			for _, dp := range dps {
				totalDP += dp.PaidAmount
				// Link the first paid DP as the reference
				if invoice.DownPaymentInvoiceID == nil {
					dpIDStr := dp.ID
					invoice.DownPaymentInvoiceID = &dpIDStr
				}
			}
			invoice.DownPaymentAmount = totalDP
			invoice.Amount = invoice.Amount - totalDP
			if invoice.Amount < 0 {
				invoice.Amount = 0
			}
		}
	}

	invoice.RemainingAmount = invoice.Amount

	// Create invoice and update SO item invoiced quantities in a transaction
	err = uc.db.Transaction(func(tx *gorm.DB) error {
		txCtx := database.WithTx(ctx, tx)

		if err := uc.invoiceRepo.Create(txCtx, invoice); err != nil {
			return err
		}

		// Update InvoicedQuantity on each linked SO item
		for _, item := range invoice.Items {
			if item.SalesOrderItemID != nil {
				if err := uc.salesOrderRepo.UpdateItemInvoicedQty(txCtx, *item.SalesOrderItemID, item.Quantity); err != nil {
					return fmt.Errorf("failed to update invoiced qty for SO item %s: %w", *item.SalesOrderItemID, err)
				}
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	// Fetch the created invoice with relations
	createdInvoice, err := uc.invoiceRepo.FindByID(ctx, invoice.ID)
	if err != nil {
		return nil, err
	}

	return mapper.MapCustomerInvoiceToResponse(createdInvoice), nil
}

func (uc *customerInvoiceUsecase) Update(ctx context.Context, id string, req *dto.UpdateCustomerInvoiceRequest) (*dto.CustomerInvoiceResponse, error) {
	invoice, err := uc.invoiceRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrCustomerInvoiceNotFound
	}

	// Only allow updates on draft invoices
	if invoice.Status != models.CustomerInvoiceStatusDraft {
		return nil, ErrInvalidInvoiceStatus
	}

	// Update fields
	if req.InvoiceDate != nil {
		invoiceDate, err := time.Parse(dateFormat, *req.InvoiceDate)
		if err == nil {
			invoice.InvoiceDate = invoiceDate
		}
	}

	if req.DueDate != nil {
		if *req.DueDate != "" {
			dueDate, err := time.Parse(dateFormat, *req.DueDate)
			if err == nil {
				invoice.DueDate = &dueDate
			}
		} else {
			invoice.DueDate = nil
		}
	}

	if req.Type != nil {
		invoice.Type = models.CustomerInvoiceType(*req.Type)
	}

	if req.PaymentTermsID != nil {
		invoice.PaymentTermsID = req.PaymentTermsID
	}

	if req.TaxRate != nil {
		invoice.TaxRate = *req.TaxRate
	}

	if req.DeliveryCost != nil {
		invoice.DeliveryCost = *req.DeliveryCost
	}

	if req.OtherCost != nil {
		invoice.OtherCost = *req.OtherCost
	}

	if req.Notes != nil {
		invoice.Notes = *req.Notes
	}

	// Update items if provided
	if req.Items != nil {
		var subtotal float64
		items := make([]models.CustomerInvoiceItem, len(*req.Items))
		for i, itemReq := range *req.Items {
			// Verify product exists
			product, err := uc.productRepo.FindByID(ctx, itemReq.ProductID)
			if err != nil {
				return nil, ErrProductNotFound
			}

			itemSubtotal := (itemReq.Price * itemReq.Quantity) - itemReq.Discount
			subtotal += itemSubtotal

			items[i] = models.CustomerInvoiceItem{
				ProductID: itemReq.ProductID,
				Quantity:  itemReq.Quantity,
				Price:     itemReq.Price,
				Discount:  itemReq.Discount,
				Subtotal:  itemSubtotal,
				HPPAmount: itemReq.HPPAmount,
			}

			if items[i].HPPAmount == 0 && product.CurrentHpp > 0 {
				items[i].HPPAmount = product.CurrentHpp
			}
		}

		invoice.Items = items
		invoice.Subtotal = subtotal
	}

	// Recalculate totals
	invoice.TaxAmount = invoice.Subtotal * (invoice.TaxRate / 100)
	invoice.Amount = invoice.Subtotal + invoice.TaxAmount + invoice.DeliveryCost + invoice.OtherCost

	// Deduct paid Down Payments if this is a regular invoice with a sales order
	if invoice.SalesOrderID != nil && invoice.Type == models.CustomerInvoiceTypeRegular {
		dpReq := &dto.ListCustomerInvoicesRequest{
			SalesOrderID: *invoice.SalesOrderID,
			Type:         string(models.CustomerInvoiceTypeDownPayment),
			Status:       string(models.CustomerInvoiceStatusPaid),
			PerPage:      100,
		}
		if dps, _, err := uc.invoiceRepo.List(ctx, dpReq); err == nil {
			var totalDP float64
			for _, dp := range dps {
				totalDP += dp.PaidAmount
				// Link the first paid DP as the reference
				if invoice.DownPaymentInvoiceID == nil {
					dpIDStr := dp.ID
					invoice.DownPaymentInvoiceID = &dpIDStr
				}
			}
			invoice.DownPaymentAmount = totalDP
			invoice.Amount = invoice.Amount - totalDP
			if invoice.Amount < 0 {
				invoice.Amount = 0
			}
		}
	}

	invoice.RemainingAmount = invoice.Amount - invoice.PaidAmount

	if err := uc.invoiceRepo.Update(ctx, invoice); err != nil {
		return nil, err
	}

	updatedInvoice, err := uc.invoiceRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.MapCustomerInvoiceToResponse(updatedInvoice), nil
}

func (uc *customerInvoiceUsecase) Delete(ctx context.Context, id string) error {
	invoice, err := uc.invoiceRepo.FindByID(ctx, id)
	if err != nil {
		return ErrCustomerInvoiceNotFound
	}

	// Allow deletion of draft or unpaid invoices only
	if invoice.Status != models.CustomerInvoiceStatusDraft && invoice.Status != models.CustomerInvoiceStatusUnpaid {
		return ErrInvalidInvoiceStatus
	}

	// Rollback InvoicedQuantity on SO items and delete in a transaction
	return uc.db.Transaction(func(tx *gorm.DB) error {
		txCtx := database.WithTx(ctx, tx)

		for _, item := range invoice.Items {
			if item.SalesOrderItemID != nil {
				// Negative qty to decrement InvoicedQuantity
				if err := uc.salesOrderRepo.UpdateItemInvoicedQty(txCtx, *item.SalesOrderItemID, -item.Quantity); err != nil {
					return fmt.Errorf("failed to rollback invoiced qty for SO item %s: %w", *item.SalesOrderItemID, err)
				}
			}
		}

		return uc.invoiceRepo.Delete(txCtx, id)
	})
}

func (uc *customerInvoiceUsecase) UpdateStatus(ctx context.Context, id string, req *dto.UpdateCustomerInvoiceStatusRequest, userID *string) (*dto.CustomerInvoiceResponse, error) {
	invoice, err := uc.invoiceRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrCustomerInvoiceNotFound
	}

	newStatus := models.CustomerInvoiceStatus(req.Status)

	// Validate status transition
	if !isValidStatusTransition(invoice.Status, newStatus) {
		return nil, ErrInvalidStatusTransition
	}

	var paymentAt *time.Time
	if req.PaymentAt != nil && *req.PaymentAt != "" {
		t, err := time.Parse(time.RFC3339, *req.PaymentAt)
		if err == nil {
			paymentAt = &t
		}
	}

	if err := uc.invoiceRepo.UpdateStatus(ctx, id, newStatus, req.PaidAmount, paymentAt, userID); err != nil {
		return nil, err
	}

	updatedInvoice, err := uc.invoiceRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.MapCustomerInvoiceToResponse(updatedInvoice), nil
}

// isValidStatusTransition checks if the status transition is valid
func isValidStatusTransition(from, to models.CustomerInvoiceStatus) bool {
	validTransitions := map[models.CustomerInvoiceStatus][]models.CustomerInvoiceStatus{
		models.CustomerInvoiceStatusDraft:          {models.CustomerInvoiceStatusSubmitted, models.CustomerInvoiceStatusCancelled},
		models.CustomerInvoiceStatusSubmitted:      {models.CustomerInvoiceStatusApproved, models.CustomerInvoiceStatusRejected},
		models.CustomerInvoiceStatusApproved:       {models.CustomerInvoiceStatusUnpaid, models.CustomerInvoiceStatusCancelled},
		models.CustomerInvoiceStatusRejected:       {models.CustomerInvoiceStatusDraft},
		models.CustomerInvoiceStatusUnpaid:         {models.CustomerInvoiceStatusWaitingPayment, models.CustomerInvoiceStatusPartial, models.CustomerInvoiceStatusPaid, models.CustomerInvoiceStatusCancelled},
		models.CustomerInvoiceStatusWaitingPayment: {models.CustomerInvoiceStatusUnpaid, models.CustomerInvoiceStatusPartial, models.CustomerInvoiceStatusPaid, models.CustomerInvoiceStatusCancelled},
		models.CustomerInvoiceStatusPartial:        {models.CustomerInvoiceStatusWaitingPayment, models.CustomerInvoiceStatusPaid, models.CustomerInvoiceStatusCancelled},
	}

	allowed, ok := validTransitions[from]
	if !ok {
		return false
	}

	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}
