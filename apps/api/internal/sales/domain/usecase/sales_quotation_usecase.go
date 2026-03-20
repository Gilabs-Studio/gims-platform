package usecase

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/utils"
	productRepos "github.com/gilabs/gims/api/internal/product/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/data/models"
	salesRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"github.com/gilabs/gims/api/internal/sales/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrSalesQuotationNotFound      = errors.New("sales quotation not found")
	ErrSalesQuotationAlreadyExists = errors.New("sales quotation with this code already exists")
	ErrInvalidStatusTransition     = errors.New("invalid status transition")
	ErrQuotationAlreadyConverted   = errors.New("quotation already converted to sales order")
	ErrProductNotFound             = errors.New("product not found")
	ErrInvalidQuotationStatus      = errors.New("cannot modify quotation in current status")
)

// SalesQuotationUsecase defines the interface for sales quotation business logic
type SalesQuotationUsecase interface {
	List(ctx context.Context, req *dto.ListSalesQuotationsRequest) ([]dto.SalesQuotationResponse, *utils.PaginationResult, error)
	GetByID(ctx context.Context, id string) (*dto.SalesQuotationResponse, error)
	ListItems(ctx context.Context, quotationID string, req *dto.ListSalesQuotationItemsRequest) ([]dto.SalesQuotationItemResponse, *utils.PaginationResult, error)
	Create(ctx context.Context, req *dto.CreateSalesQuotationRequest, createdBy *string) (*dto.SalesQuotationResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateSalesQuotationRequest) (*dto.SalesQuotationResponse, error)
	Delete(ctx context.Context, id string) error
	UpdateStatus(ctx context.Context, id string, req *dto.UpdateSalesQuotationStatusRequest, userID *string) (*dto.SalesQuotationResponse, error)
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.CustomerInvoiceAuditTrailEntry, int64, error)
}

type salesQuotationUsecase struct {
	db            *gorm.DB
	quotationRepo salesRepos.SalesQuotationRepository
	productRepo   productRepos.ProductRepository
	auditService  audit.AuditService
}

// NewSalesQuotationUsecase creates a new SalesQuotationUsecase
func NewSalesQuotationUsecase(
	db *gorm.DB,
	quotationRepo salesRepos.SalesQuotationRepository,
	productRepo productRepos.ProductRepository,
	auditService audit.AuditService,
) SalesQuotationUsecase {
	return &salesQuotationUsecase{
		db:            db,
		quotationRepo: quotationRepo,
		productRepo:   productRepo,
		auditService:  auditService,
	}
}

func (u *salesQuotationUsecase) List(ctx context.Context, req *dto.ListSalesQuotationsRequest) ([]dto.SalesQuotationResponse, *utils.PaginationResult, error) {
	quotations, total, err := u.quotationRepo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.SalesQuotationResponse, len(quotations))
	for i := range quotations {
		responses[i] = mapper.ToSalesQuotationResponse(&quotations[i])
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

func (u *salesQuotationUsecase) ListItems(ctx context.Context, quotationID string, req *dto.ListSalesQuotationItemsRequest) ([]dto.SalesQuotationItemResponse, *utils.PaginationResult, error) {
	// Verify quotation exists
	_, err := u.quotationRepo.FindByID(ctx, quotationID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrSalesQuotationNotFound
		}
		return nil, nil, err
	}

	// Fetch paginated items
	items, total, err := u.quotationRepo.ListItems(ctx, quotationID, req)
	if err != nil {
		return nil, nil, err
	}

	// Map to response DTOs
	responses := make([]dto.SalesQuotationItemResponse, len(items))
	for i := range items {
		responses[i] = mapper.ToSalesQuotationItemResponse(&items[i])
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

func (u *salesQuotationUsecase) GetByID(ctx context.Context, id string) (*dto.SalesQuotationResponse, error) {
	quotation, err := u.quotationRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSalesQuotationNotFound
		}
		return nil, err
	}

	response := mapper.ToSalesQuotationResponse(quotation)
	return &response, nil
}

func (u *salesQuotationUsecase) Create(ctx context.Context, req *dto.CreateSalesQuotationRequest, createdBy *string) (*dto.SalesQuotationResponse, error) {
	// Validate products exist and get default prices
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
	}

	// Generate quotation number
	code, err := u.quotationRepo.GetNextQuotationNumber(ctx, "SQ")
	if err != nil {
		return nil, err
	}

	// Convert request to model
	quotation, err := mapper.ToSalesQuotationModel(req, code, createdBy)
	if err != nil {
		return nil, err
	}

	// Calculate totals
	u.calculateTotals(quotation)

	// Set valid until based on payment terms if not provided
	if quotation.ValidUntil == nil && quotation.PaymentTermsID != nil {
		// This would require fetching payment terms, for now we'll set a default
		// In a real implementation, you'd fetch payment terms and add days
		validUntil := quotation.QuotationDate.AddDate(0, 0, 30) // Default 30 days
		quotation.ValidUntil = &validUntil
	}

	// Create quotation
	if err := u.quotationRepo.Create(ctx, quotation); err != nil {
		return nil, err
	}

	// Fetch created quotation with relations
	created, err := u.quotationRepo.FindByID(ctx, quotation.ID)
	if err != nil {
		return nil, err
	}

	response := mapper.ToSalesQuotationResponse(created)
	logSalesAudit(u.auditService, ctx, "sales_quotation.create", created.ID, map[string]interface{}{
		"after": map[string]interface{}{
			"code":           created.Code,
			"status":         created.Status,
			"quotation_date": created.QuotationDate,
			"total_amount":   created.TotalAmount,
		},
	})
	return &response, nil
}

func (u *salesQuotationUsecase) Update(ctx context.Context, id string, req *dto.UpdateSalesQuotationRequest) (*dto.SalesQuotationResponse, error) {
	quotation, err := u.quotationRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSalesQuotationNotFound
		}
		return nil, err
	}

	// Check if quotation can be modified
	if quotation.Status != models.SalesQuotationStatusDraft {
		return nil, ErrInvalidQuotationStatus
	}

	beforeSnapshot := map[string]interface{}{
		"status":         quotation.Status,
		"quotation_date": quotation.QuotationDate,
		"valid_until":    quotation.ValidUntil,
		"subtotal":       quotation.Subtotal,
		"total_amount":   quotation.TotalAmount,
		"notes":          quotation.Notes,
	}

	// Validate products if items are being updated
	if req.Items != nil && len(*req.Items) > 0 {
		for i := range *req.Items {
			item := &(*req.Items)[i]
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
		}
	}

	// Update model
	if err := mapper.UpdateSalesQuotationModel(quotation, req); err != nil {
		return nil, err
	}

	// Recalculate totals
	u.calculateTotals(quotation)

	// Update quotation
	if err := u.quotationRepo.Update(ctx, quotation); err != nil {
		return nil, err
	}

	// Fetch updated quotation with relations
	updated, err := u.quotationRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToSalesQuotationResponse(updated)
	logSalesAudit(u.auditService, ctx, "sales_quotation.update", id, map[string]interface{}{
		"before": beforeSnapshot,
		"after": map[string]interface{}{
			"status":         updated.Status,
			"quotation_date": updated.QuotationDate,
			"valid_until":    updated.ValidUntil,
			"subtotal":       updated.Subtotal,
			"total_amount":   updated.TotalAmount,
			"notes":          updated.Notes,
		},
	})
	return &response, nil
}

func (u *salesQuotationUsecase) Delete(ctx context.Context, id string) error {
	quotation, err := u.quotationRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrSalesQuotationNotFound
		}
		return err
	}

	// Only allow deletion of draft quotations
	if quotation.Status != models.SalesQuotationStatusDraft {
		return ErrInvalidQuotationStatus
	}

	return u.quotationRepo.Delete(ctx, id)
}

func (u *salesQuotationUsecase) UpdateStatus(ctx context.Context, id string, req *dto.UpdateSalesQuotationStatusRequest, userID *string) (*dto.SalesQuotationResponse, error) {
	quotation, err := u.quotationRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSalesQuotationNotFound
		}
		return nil, err
	}

	newStatus := models.SalesQuotationStatus(req.Status)
	previousStatus := quotation.Status

	// Validate status transition
	if !u.isValidStatusTransition(quotation.Status, newStatus) {
		return nil, ErrInvalidStatusTransition
	}

	// Update status
	var reason *string
	if req.RejectionReason != nil {
		reason = req.RejectionReason
	}

	if err := u.quotationRepo.UpdateStatus(ctx, id, newStatus, userID, reason); err != nil {
		return nil, err
	}

	// Fetch updated quotation
	updated, err := u.quotationRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToSalesQuotationResponse(updated)
	logSalesAudit(u.auditService, ctx, "sales_quotation.status_change", id, map[string]interface{}{
		"before_status": previousStatus,
		"after_status":  updated.Status,
		"reason":        req.RejectionReason,
	})
	return &response, nil
}

func (u *salesQuotationUsecase) ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.CustomerInvoiceAuditTrailEntry, int64, error) {
	if u.db == nil {
		return nil, 0, errors.New("db is nil")
	}

	return listAuditTrailEntries(ctx, u.db, id, "sales_quotation.", page, perPage)
}

// calculateTotals calculates all financial totals for the quotation
func (u *salesQuotationUsecase) calculateTotals(quotation *models.SalesQuotation) {
	// Calculate subtotal from items
	subtotal := 0.0
	for i := range quotation.Items {
		quotation.Items[i].CalculateSubtotal()
		subtotal += quotation.Items[i].Subtotal
	}

	quotation.Subtotal = subtotal

	// Apply discount
	subtotalAfterDiscount := quotation.Subtotal - quotation.DiscountAmount
	if subtotalAfterDiscount < 0 {
		subtotalAfterDiscount = 0
	}

	// Calculate tax (on subtotal after discount)
	if quotation.TaxRate == 0 {
		quotation.TaxRate = 11.00 // Default 11% PPN
	}
	quotation.TaxAmount = subtotalAfterDiscount * (quotation.TaxRate / 100.0)

	// Calculate total: Subtotal - Discount + Tax + Delivery + Other
	quotation.TotalAmount = subtotalAfterDiscount + quotation.TaxAmount + quotation.DeliveryCost + quotation.OtherCost
}

// isValidStatusTransition validates if status transition is allowed
func (u *salesQuotationUsecase) isValidStatusTransition(current, new models.SalesQuotationStatus) bool {
	validTransitions := map[models.SalesQuotationStatus][]models.SalesQuotationStatus{
		models.SalesQuotationStatusDraft: {
			models.SalesQuotationStatusSent,
			models.SalesQuotationStatusApproved,
			models.SalesQuotationStatusRejected,
		},
		models.SalesQuotationStatusSent: {
			models.SalesQuotationStatusApproved,
			models.SalesQuotationStatusRejected,
		},
		models.SalesQuotationStatusApproved: {
			models.SalesQuotationStatusConverted,
		},
		models.SalesQuotationStatusRejected: {
			models.SalesQuotationStatusDraft, // Can be revised
		},
		models.SalesQuotationStatusConverted: {
			// Cannot transition from converted
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
