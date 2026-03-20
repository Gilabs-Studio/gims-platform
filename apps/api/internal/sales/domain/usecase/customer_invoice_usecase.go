package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/core/utils"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	finDto "github.com/gilabs/gims/api/internal/finance/domain/dto"
	finUsecase "github.com/gilabs/gims/api/internal/finance/domain/usecase"
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
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.CustomerInvoiceAuditTrailEntry, int64, error)
}

type customerInvoiceUsecase struct {
	db             *gorm.DB
	invoiceRepo    repositories.CustomerInvoiceRepository
	productRepo    productRepos.ProductRepository
	salesOrderRepo repositories.SalesOrderRepository
	journalUC      finUsecase.JournalEntryUsecase
	coaUC          finUsecase.ChartOfAccountUsecase
	auditService   audit.AuditService
}

// NewCustomerInvoiceUsecase creates a new CustomerInvoiceUsecase
func NewCustomerInvoiceUsecase(
	db *gorm.DB,
	invoiceRepo repositories.CustomerInvoiceRepository,
	productRepo productRepos.ProductRepository,
	salesOrderRepo repositories.SalesOrderRepository,
	journalUC finUsecase.JournalEntryUsecase,
	coaUC finUsecase.ChartOfAccountUsecase,
	auditService audit.AuditService,
) CustomerInvoiceUsecase {
	return &customerInvoiceUsecase{
		db:             db,
		invoiceRepo:    invoiceRepo,
		productRepo:    productRepo,
		salesOrderRepo: salesOrderRepo,
		journalUC:      journalUC,
		coaUC:          coaUC,
		auditService:   auditService,
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
	invoiceDate, err := time.Parse(dateFormat, req.InvoiceDate)
	if err != nil {
		return nil, err
	}

	code, err := uc.invoiceRepo.GetNextInvoiceNumber(ctx, "INV")
	if err != nil {
		return nil, err
	}

	invoiceType := parseCustomerInvoiceType(req.Type)
	soItemMap, err := uc.buildSalesOrderItemMapForCreate(ctx, req)
	if err != nil {
		return nil, err
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
	applyInvoiceDueDate(invoice, req.DueDate)

	items, subtotal, err := uc.buildCreateInvoiceItems(ctx, req, soItemMap)
	if err != nil {
		return nil, err
	}

	invoice.Items = items
	invoice.Subtotal = subtotal
	invoice.TaxAmount = subtotal * (invoice.TaxRate / 100)
	invoice.Amount = subtotal + invoice.TaxAmount + invoice.DeliveryCost + invoice.OtherCost

	uc.applyPaidDownPaymentsOnCreate(ctx, invoice, req.SalesOrderID, invoiceType)
	invoice.RemainingAmount = invoice.Amount

	err = uc.createInvoiceWithSOItemUpdates(ctx, invoice)
	if err != nil {
		return nil, err
	}

	// Fetch the created invoice with relations
	createdInvoice, err := uc.invoiceRepo.FindByID(ctx, invoice.ID)
	if err != nil {
		return nil, err
	}

	logSalesAudit(uc.auditService, ctx, "customer_invoice.create", createdInvoice.ID, map[string]interface{}{
		"after": map[string]interface{}{
			"code":           createdInvoice.Code,
			"status":         createdInvoice.Status,
			"type":           createdInvoice.Type,
			"invoice_date":   createdInvoice.InvoiceDate,
			"amount":         createdInvoice.Amount,
			"remaining":      createdInvoice.RemainingAmount,
			"sales_order_id": createdInvoice.SalesOrderID,
		},
	})

	return mapper.MapCustomerInvoiceToResponse(createdInvoice), nil
}

func parseCustomerInvoiceType(raw string) models.CustomerInvoiceType {
	if strings.TrimSpace(raw) == "" {
		return models.CustomerInvoiceTypeRegular
	}

	return models.CustomerInvoiceType(raw)
}

func applyInvoiceDueDate(invoice *models.CustomerInvoice, dueDateRaw *string) {
	if invoice == nil || dueDateRaw == nil || strings.TrimSpace(*dueDateRaw) == "" {
		return
	}

	dueDate, err := time.Parse(dateFormat, *dueDateRaw)
	if err == nil {
		invoice.DueDate = &dueDate
	}
}

func (uc *customerInvoiceUsecase) buildSalesOrderItemMapForCreate(
	ctx context.Context,
	req *dto.CreateCustomerInvoiceRequest,
) (map[string]*models.SalesOrderItem, error) {
	soItemMap := make(map[string]*models.SalesOrderItem)
	if req.SalesOrderID == nil {
		return soItemMap, nil
	}

	salesOrder, err := uc.salesOrderRepo.FindByID(ctx, *req.SalesOrderID)
	if err != nil {
		return nil, fmt.Errorf("sales order not found: %w", err)
	}

	if req.DeliveryOrderID != nil {
		deliveryOrderFound := false
		for _, do := range salesOrder.DeliveryOrders {
			if do.ID == *req.DeliveryOrderID {
				deliveryOrderFound = true
				break
			}
		}
		if !deliveryOrderFound {
			return nil, ErrInvoiceDOMismatch
		}
	}

	for i := range salesOrder.Items {
		soItemMap[salesOrder.Items[i].ID] = &salesOrder.Items[i]
	}

	return soItemMap, nil
}

func (uc *customerInvoiceUsecase) buildCreateInvoiceItems(
	ctx context.Context,
	req *dto.CreateCustomerInvoiceRequest,
	soItemMap map[string]*models.SalesOrderItem,
) ([]models.CustomerInvoiceItem, float64, error) {
	items := make([]models.CustomerInvoiceItem, len(req.Items))
	subtotal := 0.0

	for i, itemReq := range req.Items {
		product, err := uc.productRepo.FindByID(ctx, itemReq.ProductID)
		if err != nil {
			return nil, 0, ErrProductNotFound
		}

		if err := validateCreateInvoiceItemQuantity(itemReq.SalesOrderItemID, itemReq.Quantity, soItemMap, product.Name); err != nil {
			return nil, 0, err
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

		if items[i].HPPAmount == 0 && product.CurrentHpp > 0 {
			items[i].HPPAmount = product.CurrentHpp
		}
	}

	return items, subtotal, nil
}

func validateCreateInvoiceItemQuantity(
	salesOrderItemID *string,
	requestedQty float64,
	soItemMap map[string]*models.SalesOrderItem,
	productName string,
) error {
	if salesOrderItemID == nil {
		return nil
	}

	soItem, ok := soItemMap[*salesOrderItemID]
	if !ok {
		return fmt.Errorf("sales order item %s not found", *salesOrderItemID)
	}

	remainingQty := soItem.Quantity - soItem.InvoicedQuantity
	if requestedQty <= remainingQty {
		return nil
	}

	return fmt.Errorf("%w: product %s has %.3f remaining, requested %.3f",
		ErrInvoiceExceedsRemaining, productName, remainingQty, requestedQty)
}

func (uc *customerInvoiceUsecase) applyPaidDownPaymentsOnCreate(
	ctx context.Context,
	invoice *models.CustomerInvoice,
	salesOrderID *string,
	invoiceType models.CustomerInvoiceType,
) {
	if salesOrderID == nil || invoiceType != models.CustomerInvoiceTypeRegular {
		return
	}

	dpReq := &dto.ListCustomerInvoicesRequest{
		SalesOrderID: *salesOrderID,
		Type:         string(models.CustomerInvoiceTypeDownPayment),
		Status:       string(models.CustomerInvoiceStatusPaid),
		PerPage:      100,
	}

	dps, _, err := uc.invoiceRepo.List(ctx, dpReq)
	if err != nil {
		return
	}

	totalDP := 0.0
	for _, dp := range dps {
		totalDP += dp.PaidAmount
		if invoice.DownPaymentInvoiceID == nil {
			dpIDStr := dp.ID
			invoice.DownPaymentInvoiceID = &dpIDStr
		}
	}

	invoice.DownPaymentAmount = totalDP
	invoice.Amount -= totalDP
	if invoice.Amount < 0 {
		invoice.Amount = 0
	}
}

func (uc *customerInvoiceUsecase) createInvoiceWithSOItemUpdates(ctx context.Context, invoice *models.CustomerInvoice) error {
	return uc.db.Transaction(func(tx *gorm.DB) error {
		txCtx := database.WithTx(ctx, tx)

		if err := uc.invoiceRepo.Create(txCtx, invoice); err != nil {
			return err
		}

		for _, item := range invoice.Items {
			if item.SalesOrderItemID == nil {
				continue
			}

			if err := uc.salesOrderRepo.UpdateItemInvoicedQty(txCtx, *item.SalesOrderItemID, item.Quantity); err != nil {
				return fmt.Errorf("failed to update invoiced qty for SO item %s: %w", *item.SalesOrderItemID, err)
			}
		}

		return nil
	})
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

	beforeSnapshot := map[string]interface{}{
		"status":       invoice.Status,
		"invoice_date": invoice.InvoiceDate,
		"due_date":     invoice.DueDate,
		"subtotal":     invoice.Subtotal,
		"tax_amount":   invoice.TaxAmount,
		"amount":       invoice.Amount,
		"remaining":    invoice.RemainingAmount,
		"notes":        invoice.Notes,
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

	logSalesAudit(uc.auditService, ctx, "customer_invoice.update", id, map[string]interface{}{
		"before": beforeSnapshot,
		"after": map[string]interface{}{
			"status":       updatedInvoice.Status,
			"invoice_date": updatedInvoice.InvoiceDate,
			"due_date":     updatedInvoice.DueDate,
			"subtotal":     updatedInvoice.Subtotal,
			"tax_amount":   updatedInvoice.TaxAmount,
			"amount":       updatedInvoice.Amount,
			"remaining":    updatedInvoice.RemainingAmount,
			"notes":        updatedInvoice.Notes,
		},
	})

	return mapper.MapCustomerInvoiceToResponse(updatedInvoice), nil
}

func (uc *customerInvoiceUsecase) Delete(ctx context.Context, id string) error {
	invoice, err := uc.invoiceRepo.FindByID(ctx, id)
	if err != nil {
		return ErrCustomerInvoiceNotFound
	}

	beforeSnapshot := map[string]interface{}{
		"code":           invoice.Code,
		"status":         invoice.Status,
		"type":           invoice.Type,
		"amount":         invoice.Amount,
		"remaining":      invoice.RemainingAmount,
		"sales_order_id": invoice.SalesOrderID,
	}

	// Allow deletion of draft or unpaid invoices only
	if invoice.Status != models.CustomerInvoiceStatusDraft && invoice.Status != models.CustomerInvoiceStatusUnpaid {
		return ErrInvalidInvoiceStatus
	}

	// Rollback InvoicedQuantity on SO items and delete in a transaction
	err = uc.db.Transaction(func(tx *gorm.DB) error {
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
	if err != nil {
		return err
	}

	logSalesAudit(uc.auditService, ctx, "customer_invoice.delete", id, map[string]interface{}{
		"before": beforeSnapshot,
	})

	return nil
}

func (uc *customerInvoiceUsecase) UpdateStatus(ctx context.Context, id string, req *dto.UpdateCustomerInvoiceStatusRequest, userID *string) (*dto.CustomerInvoiceResponse, error) {
	invoice, err := uc.invoiceRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrCustomerInvoiceNotFound
	}

	newStatus := models.CustomerInvoiceStatus(req.Status)
	previousStatus := invoice.Status

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

	if shouldTriggerSalesInvoiceJournal(invoice.Status, newStatus, updatedInvoice.Type) {
		triggerCtx := withActorContext(ctx, userID, updatedInvoice.CreatedBy)
		if err := uc.triggerSalesInvoiceJournal(triggerCtx, updatedInvoice); err != nil {
			return nil, fmt.Errorf("failed to trigger sales invoice journal: %w", err)
		}
	}

	if shouldTriggerSalesInvoiceReversal(invoice.Status, newStatus, updatedInvoice.Type) {
		triggerCtx := withActorContext(ctx, userID, updatedInvoice.CreatedBy)
		if err := uc.triggerSalesInvoiceJournalReversal(triggerCtx, updatedInvoice); err != nil {
			return nil, fmt.Errorf("failed to reverse sales invoice journal: %w", err)
		}
	}

	logSalesAudit(uc.auditService, ctx, "customer_invoice.status_change", id, map[string]interface{}{
		"before_status": previousStatus,
		"after_status":  updatedInvoice.Status,
		"paid_amount":   req.PaidAmount,
		"payment_at":    req.PaymentAt,
	})

	return mapper.MapCustomerInvoiceToResponse(updatedInvoice), nil
}

func (uc *customerInvoiceUsecase) ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.CustomerInvoiceAuditTrailEntry, int64, error) {
	if uc.db == nil {
		return nil, 0, errors.New("db is nil")
	}

	return listAuditTrailEntries(ctx, uc.db, id, "customer_invoice.", page, perPage)
}

func shouldTriggerSalesInvoiceJournal(previousStatus, currentStatus models.CustomerInvoiceStatus, invoiceType models.CustomerInvoiceType) bool {
	if invoiceType != models.CustomerInvoiceTypeRegular {
		return false
	}

	if currentStatus != models.CustomerInvoiceStatusUnpaid {
		return false
	}

	return previousStatus != models.CustomerInvoiceStatusUnpaid
}

func shouldTriggerSalesInvoiceReversal(previousStatus, currentStatus models.CustomerInvoiceStatus, invoiceType models.CustomerInvoiceType) bool {
	if invoiceType != models.CustomerInvoiceTypeRegular {
		return false
	}

	if currentStatus != models.CustomerInvoiceStatusCancelled {
		return false
	}

	return previousStatus == models.CustomerInvoiceStatusUnpaid ||
		previousStatus == models.CustomerInvoiceStatusWaitingPayment ||
		previousStatus == models.CustomerInvoiceStatusPartial ||
		previousStatus == models.CustomerInvoiceStatusPaid
}

func withActorContext(ctx context.Context, preferredUserID, fallbackUserID *string) context.Context {
	if actor, _ := ctx.Value("user_id").(string); strings.TrimSpace(actor) != "" {
		return ctx
	}

	if preferredUserID != nil && strings.TrimSpace(*preferredUserID) != "" {
		return context.WithValue(ctx, "user_id", strings.TrimSpace(*preferredUserID))
	}

	if fallbackUserID != nil && strings.TrimSpace(*fallbackUserID) != "" {
		return context.WithValue(ctx, "user_id", strings.TrimSpace(*fallbackUserID))
	}

	return ctx
}

func (uc *customerInvoiceUsecase) triggerSalesInvoiceJournal(ctx context.Context, invoice *models.CustomerInvoice) error {
	if invoice == nil || uc.journalUC == nil || uc.coaUC == nil {
		return nil
	}

	accountIDs, err := uc.resolveSalesInvoiceJournalAccountIDs(ctx)
	if err != nil {
		return err
	}

	lines := buildSalesInvoiceJournalLines(invoice, accountIDs)

	debitTotal := 0.0
	creditTotal := 0.0
	for _, line := range lines {
		debitTotal += line.Debit
		creditTotal += line.Credit
	}
	if math.Abs(debitTotal-creditTotal) > 0.0001 {
		return fmt.Errorf("generated journal is not balanced: debit %.2f credit %.2f", debitTotal, creditTotal)
	}

	refType := "SALES_INVOICE"
	refID := invoice.ID
	traceKey := refType + ":" + refID
	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	req := &finDto.CreateJournalEntryRequest{
		EntryDate:         invoice.InvoiceDate.Format(dateFormat),
		Description:       fmt.Sprintf("Sales Invoice %s", invoice.Code),
		ReferenceType:     &refType,
		ReferenceID:       &refID,
		Lines:             lines,
		IsSystemGenerated: true,
	}

	log.Printf("journal_observability event=trigger.start fields=%+v", map[string]interface{}{
		"trace_key":      traceKey,
		"module":         "sales_customer_invoice",
		"reference_type": refType,
		"reference_id":   refID,
		"line_count":     len(lines),
		"actor_id":       actorID,
	})

	_, err = uc.journalUC.PostOrUpdateJournal(ctx, req)
	if err != nil {
		log.Printf("journal_observability event=trigger.failed fields=%+v", map[string]interface{}{
			"trace_key": traceKey,
			"module":    "sales_customer_invoice",
			"error":     err.Error(),
		})
		return err
	}

	log.Printf("journal_observability event=trigger.success fields=%+v", map[string]interface{}{
		"trace_key": traceKey,
		"module":    "sales_customer_invoice",
	})

	return nil
}

type salesInvoiceJournalAccountIDs struct {
	receivableID   string
	revenueID      string
	taxOutputID    string
	salesAdvanceID string
	cogsID         string
	inventoryID    string
}

func (uc *customerInvoiceUsecase) resolveSalesInvoiceJournalAccountIDs(ctx context.Context) (salesInvoiceJournalAccountIDs, error) {
	receivable, err := uc.coaUC.GetByCode(ctx, "11300")
	if err != nil {
		return salesInvoiceJournalAccountIDs{}, fmt.Errorf("trade receivables account lookup failed: %w", err)
	}

	revenue, err := uc.coaUC.GetByCode(ctx, "4100")
	if err != nil {
		return salesInvoiceJournalAccountIDs{}, fmt.Errorf("sales revenue account lookup failed: %w", err)
	}

	taxOutput, err := uc.coaUC.GetByCode(ctx, "21500")
	if err != nil {
		return salesInvoiceJournalAccountIDs{}, fmt.Errorf("vat output account lookup failed: %w", err)
	}

	salesAdvance, err := uc.coaUC.GetByCode(ctx, "21200")
	if err != nil {
		return salesInvoiceJournalAccountIDs{}, fmt.Errorf("sales advance account lookup failed: %w", err)
	}

	cogs, err := uc.coaUC.GetByCode(ctx, "5100")
	if err != nil {
		return salesInvoiceJournalAccountIDs{}, fmt.Errorf("cogs account lookup failed: %w", err)
	}

	inventory, err := uc.coaUC.GetByCode(ctx, "11400")
	if err != nil {
		return salesInvoiceJournalAccountIDs{}, fmt.Errorf("inventory account lookup failed: %w", err)
	}

	return salesInvoiceJournalAccountIDs{
		receivableID:   receivable.ID,
		revenueID:      revenue.ID,
		taxOutputID:    taxOutput.ID,
		salesAdvanceID: salesAdvance.ID,
		cogsID:         cogs.ID,
		inventoryID:    inventory.ID,
	}, nil
}

func buildSalesInvoiceJournalLines(invoice *models.CustomerInvoice, accountIDs salesInvoiceJournalAccountIDs) []finDto.JournalLineRequest {
	revenueBase := invoice.Subtotal + invoice.DeliveryCost + invoice.OtherCost
	cogsTotal := calculateInvoiceCOGSTotal(invoice.Items)

	lines := make([]finDto.JournalLineRequest, 0, 6)
	lines = append(lines, finDto.JournalLineRequest{
		ChartOfAccountID: accountIDs.receivableID,
		Debit:            invoice.Amount,
		Credit:           0,
		Memo:             fmt.Sprintf("Trade receivable %s", invoice.Code),
	})

	if invoice.DownPaymentAmount > 0 {
		lines = append(lines, finDto.JournalLineRequest{
			ChartOfAccountID: accountIDs.salesAdvanceID,
			Debit:            invoice.DownPaymentAmount,
			Credit:           0,
			Memo:             fmt.Sprintf("Apply down payment %s", invoice.Code),
		})
	}

	lines = append(lines, finDto.JournalLineRequest{
		ChartOfAccountID: accountIDs.revenueID,
		Debit:            0,
		Credit:           revenueBase,
		Memo:             fmt.Sprintf("Revenue recognition %s", invoice.Code),
	})

	if invoice.TaxAmount > 0 {
		lines = append(lines, finDto.JournalLineRequest{
			ChartOfAccountID: accountIDs.taxOutputID,
			Debit:            0,
			Credit:           invoice.TaxAmount,
			Memo:             fmt.Sprintf("VAT Output %s", invoice.Code),
		})
	}

	if cogsTotal > 0 {
		lines = append(lines,
			finDto.JournalLineRequest{
				ChartOfAccountID: accountIDs.cogsID,
				Debit:            cogsTotal,
				Credit:           0,
				Memo:             fmt.Sprintf("COGS recognition %s", invoice.Code),
			},
			finDto.JournalLineRequest{
				ChartOfAccountID: accountIDs.inventoryID,
				Debit:            0,
				Credit:           cogsTotal,
				Memo:             fmt.Sprintf("Inventory release %s", invoice.Code),
			},
		)
	}

	return lines
}

func calculateInvoiceCOGSTotal(items []models.CustomerInvoiceItem) float64 {
	total := 0.0
	for _, item := range items {
		if item.HPPAmount <= 0 || item.Quantity <= 0 {
			continue
		}
		total += item.HPPAmount * item.Quantity
	}

	return total
}

func (uc *customerInvoiceUsecase) triggerSalesInvoiceJournalReversal(ctx context.Context, invoice *models.CustomerInvoice) error {
	if invoice == nil || uc.journalUC == nil {
		return nil
	}

	refType := "SALES_INVOICE"
	var existing financeModels.JournalEntry
	err := uc.db.WithContext(ctx).
		Where("reference_type = ? AND reference_id = ?", refType, invoice.ID).
		Where("status = ?", financeModels.JournalStatusPosted).
		First(&existing).Error
	if err == gorm.ErrRecordNotFound {
		return nil
	}
	if err != nil {
		return err
	}

	_, err = uc.journalUC.Reverse(ctx, existing.ID)
	return err
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
