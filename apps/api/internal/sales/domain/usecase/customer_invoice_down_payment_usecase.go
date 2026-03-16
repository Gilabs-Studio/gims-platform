package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	finDto "github.com/gilabs/gims/api/internal/finance/domain/dto"
	finUsecase "github.com/gilabs/gims/api/internal/finance/domain/usecase"
	"github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrCustomerInvoiceConflict = errors.New("customer invoice status conflict")
	ErrCustomerInvoiceInvalid  = errors.New("invalid operation for customer invoice")
	ErrInvalidStatus           = errors.New("invalid status")
)

type CustomerInvoiceDownPaymentUsecase interface {
	AddData(ctx context.Context) (*dto.CustomerInvoiceDownPaymentAddResponse, error)
	List(ctx context.Context, params *dto.ListCustomerInvoicesRequest) ([]*dto.CustomerInvoiceDownPaymentListResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.CustomerInvoiceDownPaymentDetailResponse, error)
	Create(ctx context.Context, req *dto.CreateCustomerInvoiceDownPaymentRequest) (*dto.CustomerInvoiceDownPaymentDetailResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateCustomerInvoiceDownPaymentRequest) (*dto.CustomerInvoiceDownPaymentDetailResponse, error)
	Delete(ctx context.Context, id string) error
	Pending(ctx context.Context, id string) (*dto.CustomerInvoiceDownPaymentDetailResponse, error)
	Approve(ctx context.Context, id string) (*dto.CustomerInvoiceDownPaymentDetailResponse, error)
	// Note: Submit/Reject/Cancel not exposed for down payment flow
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.CustomerInvoiceAuditTrailEntry, int64, error)
}

type customerInvoiceDownPaymentUsecase struct {
	db           *gorm.DB
	repo         repositories.CustomerInvoiceRepository
	soRepo       repositories.SalesOrderRepository
	auditService audit.AuditService
	journalUC    finUsecase.JournalEntryUsecase
	coaUC        finUsecase.ChartOfAccountUsecase
}

func NewCustomerInvoiceDownPaymentUsecase(db *gorm.DB, repo repositories.CustomerInvoiceRepository, soRepo repositories.SalesOrderRepository, auditService audit.AuditService, journalUC finUsecase.JournalEntryUsecase, coaUC finUsecase.ChartOfAccountUsecase) CustomerInvoiceDownPaymentUsecase {
	return &customerInvoiceDownPaymentUsecase{db: db, repo: repo, soRepo: soRepo, auditService: auditService, journalUC: journalUC, coaUC: coaUC}
}

func (uc *customerInvoiceDownPaymentUsecase) AddData(ctx context.Context) (*dto.CustomerInvoiceDownPaymentAddResponse, error) {
	req := &dto.ListSalesOrdersRequest{Status: string(models.SalesOrderStatusApproved), SortBy: "created_at", SortDir: "desc", PerPage: 100}
	sos, _, err := uc.soRepo.List(ctx, req)
	if err != nil {
		return nil, err
	}
	soRes := make([]dto.CustomerInvoiceAddSalesOrder, 0, len(sos))
	for _, so := range sos {
		items := make([]dto.CustomerInvoiceAddSalesOrderItem, 0, len(so.Items))
		for _, it := range so.Items {
			var prod *dto.CustomerInvoiceAddProductMini
			if it.Product != nil {
				img := ""
				if it.Product.ImageURL != nil {
					img = *it.Product.ImageURL
				}
				prod = &dto.CustomerInvoiceAddProductMini{ID: it.Product.ID, Name: it.Product.Name, Code: it.Product.Code, ImageURL: img}
			}
			items = append(items, dto.CustomerInvoiceAddSalesOrderItem{ID: it.ID, Product: prod, Quantity: it.Quantity, Price: it.Price, Subtotal: it.Subtotal})
		}
		var cust *dto.CustomerInvoiceAddCustomerMini
		if so.Customer != nil {
			cust = &dto.CustomerInvoiceAddCustomerMini{ID: so.Customer.ID, Name: so.Customer.Name}
		}
		soRes = append(soRes, dto.CustomerInvoiceAddSalesOrder{ID: so.ID, Customer: cust, Code: so.Code, OrderDate: so.OrderDate, Status: string(so.Status), TotalAmount: so.TotalAmount, Items: items})
	}
	return &dto.CustomerInvoiceDownPaymentAddResponse{SalesOrders: soRes}, nil
}

func (uc *customerInvoiceDownPaymentUsecase) mapToDetail(ctx context.Context, ci *models.CustomerInvoice) *dto.CustomerInvoiceDownPaymentDetailResponse {
	n := ""
	if ci.Notes != "" {
		n = ci.Notes
	}
	var soDto *dto.CustomerInvoiceDownPaymentSalesOrder
	var custID string
	if ci.SalesOrder != nil {
		soDto = &dto.CustomerInvoiceDownPaymentSalesOrder{ID: ci.SalesOrder.ID, Code: ci.SalesOrder.Code}
		if ci.SalesOrder.CustomerID != nil {
			soDto.CustomerID = ci.SalesOrder.CustomerID
			custID = *ci.SalesOrder.CustomerID
		}
		if ci.SalesOrder.CustomerName != "" {
			name := ci.SalesOrder.CustomerName
			soDto.CustomerName = &name
		}
	}
	var dueDate *string
	if ci.DueDate != nil {
		d := ci.DueDate.Format("2006-01-02")
		dueDate = &d
	}
	salesOrderID := ""
	if ci.SalesOrderID != nil {
		salesOrderID = *ci.SalesOrderID
	}
	var relatedCode *string
	var regularInvoice models.CustomerInvoice
	if err := uc.db.WithContext(ctx).Where("down_payment_invoice_id = ?", ci.ID).Select("code").First(&regularInvoice).Error; err == nil {
		relatedCode = &regularInvoice.Code
	}

	return &dto.CustomerInvoiceDownPaymentDetailResponse{
		ID:                 ci.ID,
		SalesOrderID:       salesOrderID,
		SalesOrder:         soDto,
		CustomerID:         custID,
		Code:               ci.Code,
		RelatedInvoiceCode: relatedCode,
		InvoiceNumber:      ci.InvoiceNumber,
		InvoiceDate:        ci.InvoiceDate.Format("2006-01-02"),
		DueDate:            dueDate,
		Amount:             ci.Amount,
		RemainingAmount:    ci.RemainingAmount,
		Status:             string(ci.Status),
		Notes:              &n,
		CreatedBy:          ci.CreatedBy,
		CreatedAt:          ci.CreatedAt,
		UpdatedAt:          ci.UpdatedAt,
	}
}

func (uc *customerInvoiceDownPaymentUsecase) mapToList(ctx context.Context, ci *models.CustomerInvoice) *dto.CustomerInvoiceDownPaymentListResponse {
	var soDto *dto.CustomerInvoiceDownPaymentSalesOrder
	if ci.SalesOrder != nil {
		soDto = &dto.CustomerInvoiceDownPaymentSalesOrder{ID: ci.SalesOrder.ID, Code: ci.SalesOrder.Code}
		if ci.SalesOrder.CustomerID != nil {
			soDto.CustomerID = ci.SalesOrder.CustomerID
		}
		if ci.SalesOrder.CustomerName != "" {
			name := ci.SalesOrder.CustomerName
			soDto.CustomerName = &name
		}
	}
	var dueDate *string
	if ci.DueDate != nil {
		d := ci.DueDate.Format("2006-01-02")
		dueDate = &d
	}
	salesOrderID := ""
	if ci.SalesOrderID != nil {
		salesOrderID = *ci.SalesOrderID
	}
	var relatedCode *string
	var regularInvoice models.CustomerInvoice
	if err := uc.db.WithContext(ctx).Where("down_payment_invoice_id = ?", ci.ID).Select("code").First(&regularInvoice).Error; err == nil {
		relatedCode = &regularInvoice.Code
	}

	return &dto.CustomerInvoiceDownPaymentListResponse{
		ID:                 ci.ID,
		SalesOrderID:       salesOrderID,
		SalesOrder:         soDto,
		Code:               ci.Code,
		RelatedInvoiceCode: relatedCode,
		InvoiceNumber:      ci.InvoiceNumber,
		InvoiceDate:        ci.InvoiceDate.Format("2006-01-02"),
		DueDate:            dueDate,
		Amount:             ci.Amount,
		RemainingAmount:    ci.RemainingAmount,
		Status:             string(ci.Status),
		CreatedAt:          ci.CreatedAt,
	}
}

func (uc *customerInvoiceDownPaymentUsecase) List(ctx context.Context, params *dto.ListCustomerInvoicesRequest) ([]*dto.CustomerInvoiceDownPaymentListResponse, int64, error) {
	params.Type = string(models.CustomerInvoiceTypeDownPayment)
	items, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	res := make([]*dto.CustomerInvoiceDownPaymentListResponse, 0, len(items))
	for _, it := range items {
		i := it
		res = append(res, uc.mapToList(ctx, &i))
	}
	return res, total, nil
}

func (uc *customerInvoiceDownPaymentUsecase) GetByID(ctx context.Context, id string) (*dto.CustomerInvoiceDownPaymentDetailResponse, error) {
	ci, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrCustomerInvoiceNotFound
		}
		return nil, err
	}
	if ci.Type != models.CustomerInvoiceTypeDownPayment {
		return nil, ErrCustomerInvoiceNotFound
	}
	return uc.mapToDetail(ctx, ci), nil
}

func (uc *customerInvoiceDownPaymentUsecase) Create(ctx context.Context, req *dto.CreateCustomerInvoiceDownPaymentRequest) (*dto.CustomerInvoiceDownPaymentDetailResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}
	invDate, err := time.Parse("2006-01-02", req.InvoiceDate)
	if err != nil {
		return nil, errors.New("invalid invoice date")
	}
	dueDate, err := time.Parse("2006-01-02", req.DueDate)
	if err != nil {
		return nil, errors.New("invalid due date")
	}

	var out *models.CustomerInvoice
	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var so models.SalesOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&so, "id = ?", req.SalesOrderID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return ErrSalesOrderNotFound
			}
			return err
		}
		if so.Status != models.SalesOrderStatusApproved {
			return ErrCustomerInvoiceInvalid
		}

		code, err := uc.repo.GetNextInvoiceNumber(ctx, "CIDP")
		if err != nil {
			return err
		}
		invNo := fmt.Sprintf("CUS-DP-%s-%s", apptime.Now().Format("20060102"), strings.TrimPrefix(code, "CIDP-"))

		creatorID, _ := ctx.Value("user_id").(string)

		var notes string
		if req.Notes != nil {
			notes = *req.Notes
		}

		ci := models.CustomerInvoice{
			Type:          models.CustomerInvoiceTypeDownPayment,
			SalesOrderID:  &so.ID,
			Code:          code,
			InvoiceNumber: &invNo,
			InvoiceDate:   invDate,
			DueDate:       &dueDate,
			Amount:        req.Amount,
			Subtotal:      req.Amount,
			Status:        models.CustomerInvoiceStatusDraft,
			Notes:         notes,
			CreatedBy:     &creatorID,
		}
		if err := tx.Create(&ci).Error; err != nil {
			return err
		}
		out = &ci
		return nil
	})
	if err != nil {
		return nil, err
	}
	// Reload after commit so relations (SalesOrder, Customer) are visible on the main connection.
	loaded, err := uc.repo.FindByID(ctx, out.ID)
	if err != nil {
		return nil, err
	}
	uc.auditService.Log(ctx, "customer_invoice_dp.create", loaded.ID, map[string]interface{}{"after": loaded})
	return uc.mapToDetail(ctx, loaded), nil
}

func (uc *customerInvoiceDownPaymentUsecase) Update(ctx context.Context, id string, req *dto.UpdateCustomerInvoiceDownPaymentRequest) (*dto.CustomerInvoiceDownPaymentDetailResponse, error) {
	existing, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrCustomerInvoiceNotFound
		}
		return nil, err
	}
	if existing.Type != models.CustomerInvoiceTypeDownPayment {
		return nil, ErrCustomerInvoiceNotFound
	}
	if existing.Status != models.CustomerInvoiceStatusDraft {
		return nil, ErrCustomerInvoiceConflict
	}

	invDate, err := time.Parse("2006-01-02", req.InvoiceDate)
	if err != nil {
		return nil, errors.New("invalid invoice date")
	}
	dueDate, err := time.Parse("2006-01-02", req.DueDate)
	if err != nil {
		return nil, errors.New("invalid due date")
	}

	var out *models.CustomerInvoice
	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var ci models.CustomerInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&ci, "id = ?", id).Error; err != nil {
			return err
		}
		if ci.Status != models.CustomerInvoiceStatusDraft || ci.Type != models.CustomerInvoiceTypeDownPayment {
			return ErrCustomerInvoiceConflict
		}

		var so models.SalesOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&so, "id = ?", req.SalesOrderID).Error; err != nil {
			return err
		}
		if so.Status != models.SalesOrderStatusApproved {
			return ErrCustomerInvoiceInvalid
		}

		var notes string
		if req.Notes != nil {
			notes = *req.Notes
		}

		updates := map[string]interface{}{
			"sales_order_id": so.ID,
			"invoice_date":   invDate,
			"due_date":       dueDate,
			"amount":         req.Amount,
			"subtotal":       req.Amount,
			"notes":          notes,
			"updated_at":     apptime.Now(),
		}
		if err := tx.Model(&ci).Updates(updates).Error; err != nil {
			return err
		}

		loaded, err := uc.repo.FindByID(ctx, id)
		if err != nil {
			return err
		}
		out = loaded
		return nil
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrCustomerInvoiceNotFound
		}
		return nil, err
	}
	uc.auditService.Log(ctx, "customer_invoice_dp.update", id, map[string]interface{}{"after": out})
	return uc.mapToDetail(ctx, out), nil
}

func (uc *customerInvoiceDownPaymentUsecase) Delete(ctx context.Context, id string) error {
	existing, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrCustomerInvoiceNotFound
		}
		return err
	}
	if existing.Type != models.CustomerInvoiceTypeDownPayment {
		return ErrCustomerInvoiceNotFound
	}
	if existing.Status != models.CustomerInvoiceStatusDraft {
		return ErrCustomerInvoiceConflict
	}
	if err := uc.repo.Delete(ctx, id); err != nil {
		return err
	}
	uc.auditService.Log(ctx, "customer_invoice_dp.delete", id, map[string]interface{}{"before": existing})
	return nil
}

func (uc *customerInvoiceDownPaymentUsecase) Pending(ctx context.Context, id string) (*dto.CustomerInvoiceDownPaymentDetailResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}
	var out *models.CustomerInvoice
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var ci models.CustomerInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&ci, "id = ?", id).Error; err != nil {
			return err
		}
		if ci.Type != models.CustomerInvoiceTypeDownPayment {
			return ErrCustomerInvoiceNotFound
		}
		if ci.Status != models.CustomerInvoiceStatusDraft {
			return ErrCustomerInvoiceConflict
		}
		if err := tx.Model(&ci).Update("status", models.CustomerInvoiceStatusSubmitted).Error; err != nil {
			return err
		}

		loaded, err := uc.repo.FindByID(ctx, id)
		if err != nil {
			return err
		}
		out = loaded
		return nil
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrCustomerInvoiceNotFound
		}
		return nil, err
	}
	uc.auditService.Log(ctx, "customer_invoice_dp.pending", id, map[string]interface{}{"after": out})
	return uc.mapToDetail(ctx, out), nil
}

func (uc *customerInvoiceDownPaymentUsecase) Approve(ctx context.Context, id string) (*dto.CustomerInvoiceDownPaymentDetailResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var ci models.CustomerInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&ci, "id = ?", id).Error; err != nil {
			return err
		}
		if ci.Type != models.CustomerInvoiceTypeDownPayment {
			return ErrCustomerInvoiceNotFound
		}
		if ci.Status != models.CustomerInvoiceStatusSubmitted {
			return ErrCustomerInvoiceConflict
		}
		previousStatus := ci.Status
		now := apptime.Now()
		// Approve and transition to UNPAID so it appears in the payment form
		if err := tx.Model(&ci).Updates(map[string]interface{}{
			"status":           models.CustomerInvoiceStatusUnpaid,
			"approved_at":      &now,
			"remaining_amount": ci.Amount,
		}).Error; err != nil {
			return err
		}

		if shouldTriggerSalesInvoiceDPJournal(previousStatus, models.CustomerInvoiceStatusUnpaid, ci.Type) {
			txCtx := database.WithTx(ctx, tx)
			triggerCtx := withActorContext(txCtx, nil, ci.CreatedBy)
			if err := uc.triggerSalesInvoiceDPJournal(triggerCtx, &ci); err != nil {
				return fmt.Errorf("failed to trigger customer invoice DP journal: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrCustomerInvoiceNotFound
		}
		return nil, err
	}
	out, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	uc.auditService.Log(ctx, "customer_invoice_dp.approve", id, nil)
	return uc.mapToDetail(ctx, out), nil
}

func shouldTriggerSalesInvoiceDPJournal(previousStatus, currentStatus models.CustomerInvoiceStatus, invoiceType models.CustomerInvoiceType) bool {
	if invoiceType != models.CustomerInvoiceTypeDownPayment {
		return false
	}

	if currentStatus != models.CustomerInvoiceStatusUnpaid {
		return false
	}

	return previousStatus != models.CustomerInvoiceStatusUnpaid
}

func (uc *customerInvoiceDownPaymentUsecase) triggerSalesInvoiceDPJournal(ctx context.Context, invoice *models.CustomerInvoice) error {
	if invoice == nil || uc.journalUC == nil || uc.coaUC == nil {
		return nil
	}

	if invoice.Amount <= 0 {
		return nil
	}

	receivableAccount, err := uc.coaUC.GetByCode(ctx, "11300")
	if err != nil {
		return fmt.Errorf("trade receivables account lookup failed: %w", err)
	}
	salesAdvanceAccount, err := uc.coaUC.GetByCode(ctx, "21200")
	if err != nil {
		return fmt.Errorf("sales advance account lookup failed: %w", err)
	}

	lines := []finDto.JournalLineRequest{
		{
			ChartOfAccountID: receivableAccount.ID,
			Debit:            invoice.Amount,
			Credit:           0,
			Memo:             fmt.Sprintf("Trade receivable DP %s", invoice.Code),
		},
		{
			ChartOfAccountID: salesAdvanceAccount.ID,
			Debit:            0,
			Credit:           invoice.Amount,
			Memo:             fmt.Sprintf("Sales advance DP %s", invoice.Code),
		},
	}

	refType := "SALES_INVOICE_DP"
	refID := invoice.ID
	traceKey := refType + ":" + refID
	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)

	req := &finDto.CreateJournalEntryRequest{
		EntryDate:         invoice.InvoiceDate.Format("2006-01-02"),
		Description:       fmt.Sprintf("Customer Down Payment Invoice %s (%s)", invoice.InvoiceNumber, invoice.Code),
		ReferenceType:     &refType,
		ReferenceID:       &refID,
		Lines:             lines,
		IsSystemGenerated: true,
	}

	log.Printf("journal_observability event=trigger.start fields=%+v", map[string]interface{}{
		"trace_key":      traceKey,
		"module":         "sales_customer_invoice_dp",
		"reference_type": refType,
		"reference_id":   refID,
		"line_count":     len(lines),
		"actor_id":       actorID,
	})

	_, err = uc.journalUC.PostOrUpdateJournal(ctx, req)
	if err != nil {
		log.Printf("journal_observability event=trigger.failed fields=%+v", map[string]interface{}{
			"trace_key": traceKey,
			"module":    "sales_customer_invoice_dp",
			"error":     err.Error(),
		})
		return err
	}

	log.Printf("journal_observability event=trigger.success fields=%+v", map[string]interface{}{
		"trace_key": traceKey,
		"module":    "sales_customer_invoice_dp",
	})

	return nil
}

func (uc *customerInvoiceDownPaymentUsecase) ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.CustomerInvoiceAuditTrailEntry, int64, error) {
	if uc.db == nil {
		return nil, 0, errors.New("db is nil")
	}
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	tx := uc.db.WithContext(ctx).Model(&coreModels.AuditLog{}).
		Where("audit_logs.target_id = ?", id).
		Where("audit_logs.permission_code LIKE ?", "customer_invoice_dp.%")

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	type auditRow struct {
		ID             string    `gorm:"column:id"`
		ActorID        string    `gorm:"column:actor_id"`
		PermissionCode string    `gorm:"column:permission_code"`
		TargetID       string    `gorm:"column:target_id"`
		Action         string    `gorm:"column:action"`
		Metadata       string    `gorm:"column:metadata"`
		CreatedAt      time.Time `gorm:"column:created_at"`
		ActorEmail     *string   `gorm:"column:actor_email"`
		ActorName      *string   `gorm:"column:actor_name"`
	}

	rows := make([]auditRow, 0)
	if err := tx.
		Select("audit_logs.id, audit_logs.actor_id, audit_logs.permission_code, audit_logs.target_id, audit_logs.action, audit_logs.metadata, audit_logs.created_at, users.email as actor_email, users.name as actor_name").
		Joins("LEFT JOIN users ON users.id = audit_logs.actor_id").
		Order("audit_logs.created_at DESC").
		Limit(perPage).
		Offset((page - 1) * perPage).
		Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	entries := make([]dto.CustomerInvoiceAuditTrailEntry, 0, len(rows))
	for _, r := range rows {
		meta := map[string]interface{}{}
		if strings.TrimSpace(r.Metadata) != "" {
			_ = json.Unmarshal([]byte(r.Metadata), &meta)
		}

		var usr *dto.AuditTrailUser
		if r.ActorID != "" {
			email := ""
			name := ""
			if r.ActorEmail != nil {
				email = *r.ActorEmail
			}
			if r.ActorName != nil {
				name = *r.ActorName
			}
			usr = &dto.AuditTrailUser{ID: r.ActorID, Email: email, Name: name}
		}

		entries = append(entries, dto.CustomerInvoiceAuditTrailEntry{
			ID:             r.ID,
			Action:         r.Action,
			PermissionCode: r.PermissionCode,
			TargetID:       r.TargetID,
			Metadata:       meta,
			User:           usr,
			CreatedAt:      r.CreatedAt,
		})
	}

	return entries, total, nil
}
