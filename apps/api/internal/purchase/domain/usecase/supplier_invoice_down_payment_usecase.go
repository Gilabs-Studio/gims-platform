package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	finDto "github.com/gilabs/gims/api/internal/finance/domain/dto"
	finUsecase "github.com/gilabs/gims/api/internal/finance/domain/usecase"
	"github.com/gilabs/gims/api/internal/purchase/data/models"
	"github.com/gilabs/gims/api/internal/purchase/data/repositories"
	"github.com/gilabs/gims/api/internal/purchase/domain/dto"
	"github.com/gilabs/gims/api/internal/purchase/domain/mapper"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SupplierInvoiceDownPaymentUsecase interface {
	AddData(ctx context.Context) (*dto.SupplierInvoiceDownPaymentAddResponse, error)
	List(ctx context.Context, params repositories.SupplierInvoiceListParams) ([]*dto.SupplierInvoiceDownPaymentListResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.SupplierInvoiceDownPaymentDetailResponse, error)
	Create(ctx context.Context, req *dto.CreateSupplierInvoiceDownPaymentRequest) (*dto.SupplierInvoiceDownPaymentDetailResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateSupplierInvoiceDownPaymentRequest) (*dto.SupplierInvoiceDownPaymentDetailResponse, error)
	Delete(ctx context.Context, id string) error
	Pending(ctx context.Context, id string) (*dto.SupplierInvoiceDownPaymentDetailResponse, error)
	Submit(ctx context.Context, id string) (*dto.SupplierInvoiceDownPaymentDetailResponse, error)
	Approve(ctx context.Context, id string) (*dto.SupplierInvoiceDownPaymentDetailResponse, error)
	Reject(ctx context.Context, id string) (*dto.SupplierInvoiceDownPaymentDetailResponse, error)
	Cancel(ctx context.Context, id string) (*dto.SupplierInvoiceDownPaymentDetailResponse, error)
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.SupplierInvoiceAuditTrailEntry, int64, error)
}

type supplierInvoiceDownPaymentUsecase struct {
	db           *gorm.DB
	repo         repositories.SupplierInvoiceRepository
	poRepo       repositories.PurchaseOrderRepository
	auditService audit.AuditService
	mapper       *mapper.SupplierInvoiceMapper
	journalUC    finUsecase.JournalEntryUsecase
	coaUC        finUsecase.ChartOfAccountUsecase
}

func NewSupplierInvoiceDownPaymentUsecase(db *gorm.DB, repo repositories.SupplierInvoiceRepository, poRepo repositories.PurchaseOrderRepository, auditService audit.AuditService, journalUC finUsecase.JournalEntryUsecase, coaUC finUsecase.ChartOfAccountUsecase) SupplierInvoiceDownPaymentUsecase {
	return &supplierInvoiceDownPaymentUsecase{db: db, repo: repo, poRepo: poRepo, auditService: auditService, mapper: mapper.NewSupplierInvoiceMapper(), journalUC: journalUC, coaUC: coaUC}
}

func (uc *supplierInvoiceDownPaymentUsecase) AddData(ctx context.Context) (*dto.SupplierInvoiceDownPaymentAddResponse, error) {
	// Fetch APPROVED POs for DP creation.
	// DP can be created before GR/regular supplier invoice exists.
	var pos []*models.PurchaseOrder
	err := uc.db.WithContext(ctx).
		Where("status = ?", models.PurchaseOrderStatusApproved).
		Preload("Items").
		Preload("Items.Product").
		Preload("Supplier").
		Order("created_at DESC").
		Limit(100).
		Find(&pos).Error
	if err != nil {
		return nil, err
	}
	poRes := make([]dto.SupplierInvoiceAddPurchaseOrder, 0, len(pos))
	for _, po := range pos {
		items := make([]dto.SupplierInvoiceAddPurchaseOrderItem, 0, len(po.Items))
		for _, it := range po.Items {
			var prod *dto.SupplierInvoiceAddProductMini
			if it.Product != nil {
				prod = &dto.SupplierInvoiceAddProductMini{ID: it.Product.ID, Name: it.Product.Name, Code: it.Product.Code, ImageURL: it.Product.ImageURL}
			}
			items = append(items, dto.SupplierInvoiceAddPurchaseOrderItem{ID: it.ID, Product: prod, Quantity: it.Quantity, Price: it.Price, Subtotal: it.Subtotal})
		}
		var sup *dto.SupplierInvoiceAddSupplierMini
		if po.Supplier != nil {
			sup = &dto.SupplierInvoiceAddSupplierMini{ID: po.Supplier.ID, Name: po.Supplier.Name}
		}
		poRes = append(poRes, dto.SupplierInvoiceAddPurchaseOrder{ID: po.ID, Supplier: sup, Code: po.Code, OrderDate: po.OrderDate, Status: string(po.Status), TotalAmount: po.TotalAmount, Items: items})
	}
	return &dto.SupplierInvoiceDownPaymentAddResponse{PurchaseOrders: poRes}, nil
}

func (uc *supplierInvoiceDownPaymentUsecase) List(ctx context.Context, params repositories.SupplierInvoiceListParams) ([]*dto.SupplierInvoiceDownPaymentListResponse, int64, error) {
	params.Type = string(models.SupplierInvoiceTypeDownPayment)
	items, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}

	// For each DP, if RegularInvoices is empty, try to find them by PO ID (fallback for older records or multiple DPs)
	for i := range items {
		if len(items[i].RegularInvoices) == 0 && items[i].PurchaseOrderID != "" {
			var regulars []models.SupplierInvoice
			if err := uc.db.WithContext(ctx).
				Where("purchase_order_id = ? AND type = ? AND deleted_at IS NULL", items[i].PurchaseOrderID, models.SupplierInvoiceTypeNormal).
				Find(&regulars).Error; err == nil {
				items[i].RegularInvoices = regulars
			}
		}
	}

	return uc.mapper.ToDownPaymentListResponseList(items), total, nil
}

func (uc *supplierInvoiceDownPaymentUsecase) GetByID(ctx context.Context, id string) (*dto.SupplierInvoiceDownPaymentDetailResponse, error) {
	si, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSupplierInvoiceNotFound
		}
		return nil, err
	}
	if si.Type != models.SupplierInvoiceTypeDownPayment {
		return nil, ErrSupplierInvoiceNotFound
	}

	// Fallback to PO-based lookup if slice is empty
	if len(si.RegularInvoices) == 0 && si.PurchaseOrderID != "" {
		var regulars []models.SupplierInvoice
		if err := uc.db.WithContext(ctx).
			Where("purchase_order_id = ? AND type = ? AND deleted_at IS NULL", si.PurchaseOrderID, models.SupplierInvoiceTypeNormal).
			Find(&regulars).Error; err == nil {
			si.RegularInvoices = regulars
		}
	}

	return uc.mapper.ToDownPaymentDetailResponse(si), nil
}

func (uc *supplierInvoiceDownPaymentUsecase) Create(ctx context.Context, req *dto.CreateSupplierInvoiceDownPaymentRequest) (*dto.SupplierInvoiceDownPaymentDetailResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}
	var out *models.SupplierInvoice
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var po models.PurchaseOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Items").First(&po, "id = ?", req.PurchaseOrderID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return ErrPurchaseOrderNotFound
			}
			return err
		}
		if po.Status != models.PurchaseOrderStatusApproved {
			return ErrInvalidStatus
		}
		if po.SupplierID == nil || strings.TrimSpace(*po.SupplierID) == "" {
			return ErrSupplierInvoiceInvalid
		}

		code, err := getNextSupplierInvoiceCodeLocked(tx, "SIDP")
		if err != nil {
			return err
		}
		invNo := fmt.Sprintf("SUP-DP-%s-%s", apptime.Now().Format("20060102"), strings.TrimPrefix(code, "SIDP-"))

		creatorID, _ := ctx.Value("user_id").(string)
		si := models.SupplierInvoice{
			Type:            models.SupplierInvoiceTypeDownPayment,
			PurchaseOrderID: po.ID,
			SupplierID:      *po.SupplierID,
			Code:            code,
			InvoiceNumber:   invNo,
			InvoiceDate:     req.InvoiceDate,
			DueDate:         req.DueDate,
			Amount:          req.Amount,
			Status:          models.SupplierInvoiceStatusDraft,
			Notes:           req.Notes,
			CreatedBy:       creatorID,
		}
		if err := tx.Create(&si).Error; err != nil {
			return err
		}

		// NOTE: Auto-create of regular SI has been removed.
		// Regular Supplier Invoices are now created from Goods Receipts, not from PO/DP.
		// The DP will be auto-applied when creating an SI from a GR that shares the same PO.

		// Fix reloading using the current transaction
		var s models.SupplierInvoice
		if err := tx.Preload("PurchaseOrder").
			Preload("PaymentTerms").
			Preload("DownPaymentInvoice").
			Preload("RegularInvoices").
			First(&s, "id = ?", si.ID).Error; err != nil {
			return err
		}
		out = &s
		return nil
	})
	if err != nil {
		return nil, err
	}
	uc.auditService.Log(ctx, "supplier_invoice_dp.create", out.ID, map[string]interface{}{"after": out})
	return uc.mapper.ToDownPaymentDetailResponse(out), nil
}

func (uc *supplierInvoiceDownPaymentUsecase) Update(ctx context.Context, id string, req *dto.UpdateSupplierInvoiceDownPaymentRequest) (*dto.SupplierInvoiceDownPaymentDetailResponse, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSupplierInvoiceNotFound
		}
		return nil, err
	}
	if existing.Type != models.SupplierInvoiceTypeDownPayment {
		return nil, ErrSupplierInvoiceNotFound
	}
	if existing.Status != models.SupplierInvoiceStatusDraft {
		return nil, ErrSupplierInvoiceConflict
	}
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}

	var out *models.SupplierInvoice
	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var si models.SupplierInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&si, "id = ?", id).Error; err != nil {
			return err
		}
		if si.Status != models.SupplierInvoiceStatusDraft || si.Type != models.SupplierInvoiceTypeDownPayment {
			return ErrSupplierInvoiceConflict
		}

		var po models.PurchaseOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&po, "id = ?", req.PurchaseOrderID).Error; err != nil {
			return err
		}
		if po.Status != models.PurchaseOrderStatusApproved {
			return ErrInvalidStatus
		}
		if po.SupplierID == nil || strings.TrimSpace(*po.SupplierID) == "" {
			return ErrSupplierInvoiceInvalid
		}

		updates := map[string]interface{}{
			"purchase_order_id": po.ID,
			"supplier_id":       *po.SupplierID,
			"invoice_date":      req.InvoiceDate,
			"due_date":          req.DueDate,
			"amount":            req.Amount,
			"notes":             req.Notes,
			"updated_at":        apptime.Now(),
		}
		if err := tx.Model(&si).Updates(updates).Error; err != nil {
			return err
		}

		// Fix reloading using the current transaction
		var s models.SupplierInvoice
		if err := tx.Preload("PurchaseOrder").
			Preload("PaymentTerms").
			Preload("DownPaymentInvoice").
			Preload("RegularInvoices").
			First(&s, "id = ?", id).Error; err != nil {
			return err
		}
		out = &s
		return nil
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSupplierInvoiceNotFound
		}
		return nil, err
	}
	uc.auditService.Log(ctx, "supplier_invoice_dp.update", id, map[string]interface{}{"after": out})
	return uc.mapper.ToDownPaymentDetailResponse(out), nil
}

func (uc *supplierInvoiceDownPaymentUsecase) Delete(ctx context.Context, id string) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrSupplierInvoiceNotFound
		}
		return err
	}
	if existing.Type != models.SupplierInvoiceTypeDownPayment {
		return ErrSupplierInvoiceNotFound
	}
	// Allow deletion of draft or unpaid invoices (aligned with Customer Invoice DP pattern)
	if existing.Status != models.SupplierInvoiceStatusDraft && existing.Status != models.SupplierInvoiceStatusUnpaid {
		return ErrSupplierInvoiceConflict
	}
	if err := uc.repo.Delete(ctx, id); err != nil {
		return err
	}
	uc.auditService.Log(ctx, "supplier_invoice_dp.delete", id, map[string]interface{}{"before": existing})
	return nil
}

func (uc *supplierInvoiceDownPaymentUsecase) Pending(ctx context.Context, id string) (*dto.SupplierInvoiceDownPaymentDetailResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}
	var out *models.SupplierInvoice
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var si models.SupplierInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&si, "id = ?", id).Error; err != nil {
			return err
		}
		if si.Type != models.SupplierInvoiceTypeDownPayment {
			return ErrSupplierInvoiceNotFound
		}
		if si.Status != models.SupplierInvoiceStatusDraft {
			return ErrSupplierInvoiceConflict
		}
		if err := tx.Model(&si).Update("status", models.SupplierInvoiceStatusUnpaid).Error; err != nil {
			return err
		}

		// Fix reloading using the current transaction
		var s models.SupplierInvoice
		if err := tx.Preload("PurchaseOrder").
			Preload("PaymentTerms").
			Preload("DownPaymentInvoice").
			Preload("RegularInvoices").
			First(&s, "id = ?", id).Error; err != nil {
			return err
		}
		out = &s

		// Trigger Journal Entry for DP recognition (inside transaction)
		// Debit: Purchase Advances (11900) / Credit: AP (21000)
		txCtx := database.WithTx(ctx, tx)
		if err := uc.triggerDPJournalEntry(txCtx, &si); err != nil {
			fmt.Printf("⚠️ Failed to create journal entry for supplier invoice DP %s: %v\n", id, err)
			// Don't fail the pending operation if journal fails
		}

		return nil
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSupplierInvoiceNotFound
		}
		return nil, err
	}
	uc.auditService.Log(ctx, "supplier_invoice_dp.pending", id, map[string]interface{}{"after": out})
	return uc.mapper.ToDownPaymentDetailResponse(out), nil
}

func (uc *supplierInvoiceDownPaymentUsecase) Submit(ctx context.Context, id string) (*dto.SupplierInvoiceDownPaymentDetailResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var si models.SupplierInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&si, "id = ?", id).Error; err != nil {
			return err
		}
		if si.Type != models.SupplierInvoiceTypeDownPayment {
			return ErrSupplierInvoiceNotFound
		}
		if si.Status != models.SupplierInvoiceStatusDraft {
			return ErrSupplierInvoiceConflict
		}
		now := apptime.Now()
		return tx.Model(&si).Updates(map[string]interface{}{
			"status":       models.SupplierInvoiceStatusSubmitted,
			"submitted_at": &now,
		}).Error
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSupplierInvoiceNotFound
		}
		return nil, err
	}
	out, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	uc.auditService.Log(ctx, "supplier_invoice_dp.submit", id, nil)
	return uc.mapper.ToDownPaymentDetailResponse(out), nil
}

func (uc *supplierInvoiceDownPaymentUsecase) Approve(ctx context.Context, id string) (*dto.SupplierInvoiceDownPaymentDetailResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var si models.SupplierInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&si, "id = ?", id).Error; err != nil {
			return err
		}
		if si.Type != models.SupplierInvoiceTypeDownPayment {
			return ErrSupplierInvoiceNotFound
		}
		if si.Status != models.SupplierInvoiceStatusSubmitted {
			return ErrSupplierInvoiceConflict
		}
		now := apptime.Now()
		// Approve and immediately transition to UNPAID so it appears in the payment form
		if err := tx.Model(&si).Updates(map[string]interface{}{
			"status":           models.SupplierInvoiceStatusUnpaid,
			"approved_at":      &now,
			"remaining_amount": si.Amount,
		}).Error; err != nil {
			return err
		}

		// Trigger Journal Entry for DP recognition (Debit: Purchase Advances, Credit: AP)
		txCtx := database.WithTx(ctx, tx)
		if err := uc.triggerDPJournalEntry(txCtx, &si); err != nil {
			fmt.Printf("⚠️ Failed to create journal entry for supplier invoice DP %s: %v\n", id, err)
		}

		return nil
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSupplierInvoiceNotFound
		}
		return nil, err
	}
	out, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	uc.auditService.Log(ctx, "supplier_invoice_dp.approve", id, nil)
	return uc.mapper.ToDownPaymentDetailResponse(out), nil
}

func (uc *supplierInvoiceDownPaymentUsecase) Reject(ctx context.Context, id string) (*dto.SupplierInvoiceDownPaymentDetailResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var si models.SupplierInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&si, "id = ?", id).Error; err != nil {
			return err
		}
		if si.Type != models.SupplierInvoiceTypeDownPayment {
			return ErrSupplierInvoiceNotFound
		}
		if si.Status != models.SupplierInvoiceStatusSubmitted {
			return ErrSupplierInvoiceConflict
		}
		now := apptime.Now()
		return tx.Model(&si).Updates(map[string]interface{}{
			"status":      models.SupplierInvoiceStatusRejected,
			"rejected_at": &now,
		}).Error
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSupplierInvoiceNotFound
		}
		return nil, err
	}
	out, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	uc.auditService.Log(ctx, "supplier_invoice_dp.reject", id, nil)
	return uc.mapper.ToDownPaymentDetailResponse(out), nil
}

func (uc *supplierInvoiceDownPaymentUsecase) Cancel(ctx context.Context, id string) (*dto.SupplierInvoiceDownPaymentDetailResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var si models.SupplierInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&si, "id = ?", id).Error; err != nil {
			return err
		}
		if si.Type != models.SupplierInvoiceTypeDownPayment {
			return ErrSupplierInvoiceNotFound
		}
		allowed := si.Status == models.SupplierInvoiceStatusDraft ||
			si.Status == models.SupplierInvoiceStatusSubmitted ||
			si.Status == models.SupplierInvoiceStatusApproved ||
			si.Status == models.SupplierInvoiceStatusUnpaid
		if !allowed {
			return ErrSupplierInvoiceConflict
		}
		now := apptime.Now()
		return tx.Model(&si).Updates(map[string]interface{}{
			"status":       models.SupplierInvoiceStatusCancelled,
			"cancelled_at": &now,
		}).Error
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSupplierInvoiceNotFound
		}
		return nil, err
	}
	out, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	uc.auditService.Log(ctx, "supplier_invoice_dp.cancel", id, nil)
	return uc.mapper.ToDownPaymentDetailResponse(out), nil
}

func (uc *supplierInvoiceDownPaymentUsecase) triggerDPJournalEntry(ctx context.Context, si *models.SupplierInvoice) error {
	// DP Invoice recognition:
	// Debit: Purchase Advances (11900) - asset representing advance paid to supplier
	// Credit: AP (21000) - liability to pay the supplier

	advAcct, err := uc.coaUC.GetByCode(ctx, "11900")
	if err != nil {
		return err
	}
	apAcct, err := uc.coaUC.GetByCode(ctx, "21000")
	if err != nil {
		return err
	}

	if si.Amount <= 0 {
		return nil
	}

	lines := []finDto.JournalLineRequest{
		{
			ChartOfAccountID: advAcct.ID,
			Debit:            si.Amount,
			Credit:           0,
			Memo:             fmt.Sprintf("Purchase Advance - %s", si.InvoiceNumber),
		},
		{
			ChartOfAccountID: apAcct.ID,
			Debit:            0,
			Credit:           si.Amount,
			Memo:             fmt.Sprintf("AP for DP Invoice %s", si.Code),
		},
	}

	refID := si.ID
	refType := "SUPPLIER_INVOICE_DP"

	req := &finDto.CreateJournalEntryRequest{
		EntryDate:     si.InvoiceDate,
		Description:   fmt.Sprintf("Purchase Down Payment %s (%s)", si.InvoiceNumber, si.Code),
		ReferenceID:   &refID,
		ReferenceType: &refType,
		Lines:         lines,
	}

	_, err = uc.journalUC.PostOrUpdateJournal(ctx, req)
	return err
}

func (uc *supplierInvoiceDownPaymentUsecase) ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.SupplierInvoiceAuditTrailEntry, int64, error) {
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
		Where("audit_logs.permission_code LIKE ?", "supplier_invoice_dp.%")

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

	entries := make([]dto.SupplierInvoiceAuditTrailEntry, 0, len(rows))
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

		entries = append(entries, dto.SupplierInvoiceAuditTrailEntry{
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
