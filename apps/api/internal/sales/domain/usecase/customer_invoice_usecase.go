package usecase

import (
	"context"
	"errors"
	"time"

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
	ErrCustomerInvoiceNotFound    = errors.New("customer invoice not found")
	ErrInvalidInvoiceStatus       = errors.New("invalid invoice status for this operation")
	ErrInvalidPaymentAmount       = errors.New("payment amount exceeds remaining balance")
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
	RecordPayment(ctx context.Context, id string, req *dto.RecordPaymentRequest) (*dto.CustomerInvoiceResponse, error)
}

type customerInvoiceUsecase struct {
	db          *gorm.DB
	invoiceRepo repositories.CustomerInvoiceRepository
	productRepo productRepos.ProductRepository
}

// NewCustomerInvoiceUsecase creates a new CustomerInvoiceUsecase
func NewCustomerInvoiceUsecase(
	db *gorm.DB,
	invoiceRepo repositories.CustomerInvoiceRepository,
	productRepo productRepos.ProductRepository,
) CustomerInvoiceUsecase {
	return &customerInvoiceUsecase{
		db:          db,
		invoiceRepo: invoiceRepo,
		productRepo: productRepo,
	}
}

func (uc *customerInvoiceUsecase) List(ctx context.Context, req *dto.ListCustomerInvoicesRequest) ([]dto.CustomerInvoiceResponse, *utils.PaginationResult, error) {
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

	invoice := &models.CustomerInvoice{
		Code:           code,
		Type:           invoiceType,
		InvoiceDate:    invoiceDate,
		SalesOrderID:   req.SalesOrderID,
		PaymentTermsID: req.PaymentTermsID,
		TaxRate:        req.TaxRate,
		DeliveryCost:   req.DeliveryCost,
		OtherCost:      req.OtherCost,
		Notes:          req.Notes,
		Status:         models.CustomerInvoiceStatusUnpaid,
		CreatedBy:      createdBy,
	}

	// Parse due date
	if req.DueDate != nil && *req.DueDate != "" {
		dueDate, err := time.Parse(dateFormat, *req.DueDate)
		if err == nil {
			invoice.DueDate = &dueDate
		}
	}

	// Build items
	var subtotal float64
	items := make([]models.CustomerInvoiceItem, len(req.Items))
	for i, itemReq := range req.Items {
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

		// Use product's current HPP if not provided
		if items[i].HPPAmount == 0 && product.CurrentHpp > 0 {
			items[i].HPPAmount = product.CurrentHpp
		}
	}

	invoice.Items = items
	invoice.Subtotal = subtotal
	invoice.TaxAmount = subtotal * (invoice.TaxRate / 100)
	invoice.Amount = subtotal + invoice.TaxAmount + invoice.DeliveryCost + invoice.OtherCost
	invoice.RemainingAmount = invoice.Amount

	if err := uc.invoiceRepo.Create(ctx, invoice); err != nil {
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

	// Only allow updates on unpaid invoices
	if invoice.Status != models.CustomerInvoiceStatusUnpaid {
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

	// Only allow deletion of unpaid invoices
	if invoice.Status != models.CustomerInvoiceStatusUnpaid {
		return ErrInvalidInvoiceStatus
	}

	return uc.invoiceRepo.Delete(ctx, id)
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

func (uc *customerInvoiceUsecase) RecordPayment(ctx context.Context, id string, req *dto.RecordPaymentRequest) (*dto.CustomerInvoiceResponse, error) {
	invoice, err := uc.invoiceRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrCustomerInvoiceNotFound
	}

	// Validate status
	if invoice.Status != models.CustomerInvoiceStatusUnpaid && invoice.Status != models.CustomerInvoiceStatusPartial {
		return nil, ErrInvalidInvoiceStatus
	}

	// Validate payment amount
	if req.PaidAmount > invoice.RemainingAmount {
		return nil, ErrInvalidPaymentAmount
	}

	var paymentAt *time.Time
	if req.PaymentAt != nil && *req.PaymentAt != "" {
		t, err := time.Parse(time.RFC3339, *req.PaymentAt)
		if err == nil {
			paymentAt = &t
		}
	}

	if err := uc.invoiceRepo.RecordPayment(ctx, id, req.PaidAmount, paymentAt); err != nil {
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
		models.CustomerInvoiceStatusUnpaid:  {models.CustomerInvoiceStatusPartial, models.CustomerInvoiceStatusPaid, models.CustomerInvoiceStatusCancelled},
		models.CustomerInvoiceStatusPartial: {models.CustomerInvoiceStatusPaid, models.CustomerInvoiceStatusCancelled},
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
