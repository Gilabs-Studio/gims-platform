package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"strings"
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/purchase/data/models"
	"github.com/gilabs/gims/api/internal/purchase/data/repositories"
	"github.com/gilabs/gims/api/internal/purchase/domain/dto"
	"github.com/gilabs/gims/api/internal/purchase/domain/mapper"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrSupplierInvoiceNotFound    = errors.New("supplier invoice not found")
	ErrSupplierInvoiceConflict    = errors.New("supplier invoice conflict")
	ErrSupplierInvoiceInvalid     = errors.New("invalid supplier invoice")
	ErrPaymentTermsNotFound       = errors.New("payment terms not found")
)

type SupplierInvoiceUsecase interface {
	AddData(ctx context.Context) (*dto.SupplierInvoiceAddResponse, error)
	List(ctx context.Context, params repositories.SupplierInvoiceListParams) ([]*dto.SupplierInvoiceListResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.SupplierInvoiceDetailResponse, error)
	Create(ctx context.Context, req *dto.CreateSupplierInvoiceRequest) (*dto.SupplierInvoiceDetailResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateSupplierInvoiceRequest) (*dto.SupplierInvoiceDetailResponse, error)
	Delete(ctx context.Context, id string) error
	Pending(ctx context.Context, id string) (*dto.SupplierInvoiceDetailResponse, error)
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.SupplierInvoiceAuditTrailEntry, int64, error)
}

type supplierInvoiceUsecase struct {
	db           *gorm.DB
	repo         repositories.SupplierInvoiceRepository
	poRepo       repositories.PurchaseOrderRepository
	auditService audit.AuditService
	mapper       *mapper.SupplierInvoiceMapper
}

func NewSupplierInvoiceUsecase(db *gorm.DB, repo repositories.SupplierInvoiceRepository, poRepo repositories.PurchaseOrderRepository, auditService audit.AuditService) SupplierInvoiceUsecase {
	return &supplierInvoiceUsecase{db: db, repo: repo, poRepo: poRepo, auditService: auditService, mapper: mapper.NewSupplierInvoiceMapper()}
}

func (uc *supplierInvoiceUsecase) List(ctx context.Context, params repositories.SupplierInvoiceListParams) ([]*dto.SupplierInvoiceListResponse, int64, error) {
	params.Type = string(models.SupplierInvoiceTypeNormal)
	items, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return uc.mapper.ToListResponseList(items), total, nil
}

func (uc *supplierInvoiceUsecase) GetByID(ctx context.Context, id string) (*dto.SupplierInvoiceDetailResponse, error) {
	si, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSupplierInvoiceNotFound
		}
		return nil, err
	}
	if si.Type != models.SupplierInvoiceTypeNormal {
		return nil, ErrSupplierInvoiceNotFound
	}
	return uc.mapper.ToDetailResponse(si), nil
}

func (uc *supplierInvoiceUsecase) AddData(ctx context.Context) (*dto.SupplierInvoiceAddResponse, error) {
	// Payment terms
	var paymentTerms []coreModels.PaymentTerms
	if err := uc.db.WithContext(ctx).
		Model(&coreModels.PaymentTerms{}).
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&paymentTerms).Error; err != nil {
		return nil, err
	}

	ptRes := make([]dto.SupplierInvoiceAddPaymentTerms, 0, len(paymentTerms))
	for _, pt := range paymentTerms {
		ptRes = append(ptRes, dto.SupplierInvoiceAddPaymentTerms{ID: pt.ID, Name: pt.Name})
	}

	pos, _, err := uc.poRepo.List(ctx, repositories.PurchaseOrderListParams{Status: string(models.PurchaseOrderStatusApproved), SortBy: "created_at", SortDir: "desc", Limit: 100, Offset: 0, WithItems: true})
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

		addPO := dto.SupplierInvoiceAddPurchaseOrder{ID: po.ID, Supplier: sup, Code: po.Code, OrderDate: po.OrderDate, Status: string(po.Status), TotalAmount: po.TotalAmount, Items: items}

		// Attach latest DP invoice if exists
		if dp, err := uc.repo.GetLatestDownPaymentByPO(ctx, po.ID); err == nil && dp != nil {
			addPO.InvoiceDP = &dto.SupplierInvoiceAddDownPaymentMini{
				ID: dp.ID,
				PurchaseOrder: &dto.SupplierInvoicePurchaseOrderMini{ID: po.ID, Code: po.Code},
				Code: dp.Code,
				InvoiceNumber: dp.InvoiceNumber,
				InvoiceDate: dp.InvoiceDate,
				DueDate: dp.DueDate,
				Amount: dp.Amount,
				Status: string(dp.Status),
				Notes: dp.Notes,
				CreatedAt: dp.CreatedAt,
				UpdatedAt: dp.UpdatedAt,
			}
		}

		poRes = append(poRes, addPO)
	}

	return &dto.SupplierInvoiceAddResponse{PaymentTerms: ptRes, PurchaseOrders: poRes}, nil
}

func (uc *supplierInvoiceUsecase) Create(ctx context.Context, req *dto.CreateSupplierInvoiceRequest) (*dto.SupplierInvoiceDetailResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}

	var createdID string
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var po models.PurchaseOrder
		if err := tx.
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Items").
			Preload("Items.Product").
			First(&po, "id = ?", req.PurchaseOrderID).Error; err != nil {
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

		var pt coreModels.PaymentTerms
		if err := tx.First(&pt, "id = ?", req.PaymentTermsID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return ErrPaymentTermsNotFound
			}
			return err
		}

		code, err := getNextSupplierInvoiceCodeLocked(tx, "SI")
		if err != nil {
			return err
		}

		items := make([]models.SupplierInvoiceItem, 0, len(req.Items))
		subTotal := 0.0

		// Validate items against PO items (by product_id) and qty not exceeding ordered
		orderedQtyByProduct := make(map[string]float64)
		poItemIDByProduct := make(map[string]string)
		for _, it := range po.Items {
			orderedQtyByProduct[it.ProductID] += it.Quantity
			poItemIDByProduct[it.ProductID] = it.ID
		}

		reqQtyByProduct := make(map[string]float64)
		for _, it := range req.Items {
			reqQtyByProduct[it.ProductID] += it.Quantity
		}
		for pid, q := range reqQtyByProduct {
			ordered := orderedQtyByProduct[pid]
			if ordered <= 0 {
				return ErrSupplierInvoiceConflict
			}
			if q > ordered+0.0001 {
				return ErrSupplierInvoiceConflict
			}
		}

		for _, it := range req.Items {
			disc := math.Max(0, math.Min(100, it.Discount))
			line := it.Quantity * it.Price * (1 - disc/100)
			items = append(items, models.SupplierInvoiceItem{
				PurchaseOrderItemID: func() *string { id := poItemIDByProduct[it.ProductID]; if strings.TrimSpace(id)=="" { return nil }; return &id }(),
				ProductID:            it.ProductID,
				Quantity:             it.Quantity,
				Price:                it.Price,
				Discount:             disc,
				SubTotal:             line,
			})
			subTotal += line
		}

		tax := subTotal * req.TaxRate / 100
		amount := subTotal + tax + req.DeliveryCost + req.OtherCost

		creatorID, _ := ctx.Value("user_id").(string)
		si := models.SupplierInvoice{
			Type:           models.SupplierInvoiceTypeNormal,
			PurchaseOrderID: po.ID,
			SupplierID:     *po.SupplierID,
			PaymentTermsID: &pt.ID,
			Code:           code,
			InvoiceNumber:  req.InvoiceNumber,
			InvoiceDate:    req.InvoiceDate,
			DueDate:        req.DueDate,
			TaxRate:        req.TaxRate,
			TaxAmount:      tax,
			DeliveryCost:   req.DeliveryCost,
			OtherCost:      req.OtherCost,
			SubTotal:       subTotal,
			Amount:         amount,
			Status:         models.SupplierInvoiceStatusDraft,
			Notes:          req.Notes,
			CreatedBy:      creatorID,
			Items:          items,
		}

		if err := snapshotSupplierInvoice(ctx, tx, &si, nil); err != nil {
			return err
		}

		if err := tx.Create(&si).Error; err != nil {
			return err
		}
		createdID = si.ID
		return nil
	})
	if err != nil {
		return nil, err
	}

	out, err := uc.repo.GetByID(ctx, createdID)
	if err != nil {
		return nil, err
	}

	uc.auditService.Log(ctx, "supplier_invoice.create", out.ID, map[string]interface{}{"after": out})
	return uc.mapper.ToDetailResponse(out), nil
}

func (uc *supplierInvoiceUsecase) Update(ctx context.Context, id string, req *dto.UpdateSupplierInvoiceRequest) (*dto.SupplierInvoiceDetailResponse, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSupplierInvoiceNotFound
		}
		return nil, err
	}
	if existing.Type != models.SupplierInvoiceTypeNormal {
		return nil, ErrSupplierInvoiceNotFound
	}
	if existing.Status != models.SupplierInvoiceStatusDraft {
		return nil, ErrSupplierInvoiceConflict
	}

	// Reuse create computation/validation; keep PO locked for safety.
	createReq := dto.CreateSupplierInvoiceRequest{
		PurchaseOrderID: req.PurchaseOrderID,
		PaymentTermsID:  req.PaymentTermsID,
		InvoiceNumber:   req.InvoiceNumber,
		InvoiceDate:     req.InvoiceDate,
		DueDate:         req.DueDate,
		TaxRate:         req.TaxRate,
		DeliveryCost:    req.DeliveryCost,
		OtherCost:       req.OtherCost,
		Notes:           req.Notes,
		Items:           req.Items,
	}

	before := *existing
	res, err := uc.replaceDraft(ctx, id, &createReq)
	if err != nil {
		return nil, err
	}

	uc.auditService.Log(ctx, "supplier_invoice.update", id, map[string]interface{}{"before": before, "after": res})
	return res, nil
}

func (uc *supplierInvoiceUsecase) replaceDraft(ctx context.Context, id string, req *dto.CreateSupplierInvoiceRequest) (*dto.SupplierInvoiceDetailResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}
	var updatedID string
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var si models.SupplierInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Items").First(&si, "id = ?", id).Error; err != nil {
			return err
		}
		if si.Status != models.SupplierInvoiceStatusDraft || si.Type != models.SupplierInvoiceTypeNormal {
			return ErrSupplierInvoiceConflict
		}

		var po models.PurchaseOrder
		if err := tx.
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Items").
			First(&po, "id = ?", req.PurchaseOrderID).Error; err != nil {
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

		var pt coreModels.PaymentTerms
		if err := tx.First(&pt, "id = ?", req.PaymentTermsID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return ErrPaymentTermsNotFound
			}
			return err
		}

		orderedQtyByProduct := make(map[string]float64)
		poItemIDByProduct := make(map[string]string)
		for _, it := range po.Items {
			orderedQtyByProduct[it.ProductID] += it.Quantity
			poItemIDByProduct[it.ProductID] = it.ID
		}

		reqQtyByProduct := make(map[string]float64)
		for _, it := range req.Items {
			reqQtyByProduct[it.ProductID] += it.Quantity
		}
		for pid, q := range reqQtyByProduct {
			ordered := orderedQtyByProduct[pid]
			if ordered <= 0 || q > ordered+0.0001 {
				return ErrSupplierInvoiceConflict
			}
		}

		newItems := make([]models.SupplierInvoiceItem, 0, len(req.Items))
		subTotal := 0.0
		for _, it := range req.Items {
			disc := math.Max(0, math.Min(100, it.Discount))
			line := it.Quantity * it.Price * (1 - disc/100)
			poItemID := poItemIDByProduct[it.ProductID]
			var poItemPtr *string
			if strings.TrimSpace(poItemID) != "" {
				poItemPtr = &poItemID
			}

			newItems = append(newItems, models.SupplierInvoiceItem{PurchaseOrderItemID: poItemPtr, ProductID: it.ProductID, Quantity: it.Quantity, Price: it.Price, Discount: disc, SubTotal: line})
			subTotal += line
		}

		tax := subTotal * req.TaxRate / 100
		amount := subTotal + tax + req.DeliveryCost + req.OtherCost

		updatedDraft := &models.SupplierInvoice{
			ID:             si.ID,
			Type:           si.Type,
			PurchaseOrderID: po.ID,
			SupplierID:     *po.SupplierID,
			PaymentTermsID: &pt.ID,
			Code:           si.Code,
			InvoiceNumber:  req.InvoiceNumber,
			InvoiceDate:    req.InvoiceDate,
			DueDate:        req.DueDate,
			TaxRate:        req.TaxRate,
			TaxAmount:      tax,
			DeliveryCost:   req.DeliveryCost,
			OtherCost:      req.OtherCost,
			SubTotal:       subTotal,
			Amount:         amount,
			Status:         si.Status,
			Notes:          req.Notes,
			CreatedBy:      si.CreatedBy,
			Items:          newItems,
		}
		if err := snapshotSupplierInvoice(ctx, tx, updatedDraft, &si); err != nil {
			return err
		}

		updates := map[string]interface{}{
			"purchase_order_id":  po.ID,
			"supplier_id":       *po.SupplierID,
			"payment_terms_id":  pt.ID,
			"supplier_code_snapshot": updatedDraft.SupplierCodeSnapshot,
			"supplier_name_snapshot": updatedDraft.SupplierNameSnapshot,
			"payment_terms_name_snapshot": updatedDraft.PaymentTermsNameSnapshot,
			"invoice_number":    req.InvoiceNumber,
			"invoice_date":      req.InvoiceDate,
			"due_date":          req.DueDate,
			"tax_rate":          req.TaxRate,
			"tax_amount":        tax,
			"delivery_cost":     req.DeliveryCost,
			"other_cost":        req.OtherCost,
			"sub_total":         subTotal,
			"amount":            amount,
			"notes":             req.Notes,
			"updated_at":        time.Now(),
		}
		if err := tx.Model(&si).Updates(updates).Error; err != nil {
			return err
		}

		if err := tx.Where("supplier_invoice_id = ?", si.ID).Delete(&models.SupplierInvoiceItem{}).Error; err != nil {
			return err
		}
		for i := range newItems {
			newItems[i].SupplierInvoiceID = si.ID
			newItems[i].ProductCodeSnapshot = updatedDraft.Items[i].ProductCodeSnapshot
			newItems[i].ProductNameSnapshot = updatedDraft.Items[i].ProductNameSnapshot
		}
		if err := tx.Create(&newItems).Error; err != nil {
			return err
		}
		updatedID = si.ID
		return nil
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSupplierInvoiceNotFound
		}
		return nil, err
	}

	loaded, err := uc.repo.GetByID(ctx, updatedID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSupplierInvoiceNotFound
		}
		return nil, err
	}
	return uc.mapper.ToDetailResponse(loaded), nil
}

func (uc *supplierInvoiceUsecase) Delete(ctx context.Context, id string) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrSupplierInvoiceNotFound
		}
		return err
	}
	if existing.Type != models.SupplierInvoiceTypeNormal {
		return ErrSupplierInvoiceNotFound
	}
	if existing.Status != models.SupplierInvoiceStatusDraft {
		return ErrSupplierInvoiceConflict
	}
	if err := uc.repo.Delete(ctx, id); err != nil {
		return err
	}
	uc.auditService.Log(ctx, "supplier_invoice.delete", id, map[string]interface{}{"before": existing})
	return nil
}

func (uc *supplierInvoiceUsecase) Pending(ctx context.Context, id string) (*dto.SupplierInvoiceDetailResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}
	var pendingID string
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var si models.SupplierInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&si, "id = ?", id).Error; err != nil {
			return err
		}
		if si.Type != models.SupplierInvoiceTypeNormal {
			return ErrSupplierInvoiceNotFound
		}
		if si.Status != models.SupplierInvoiceStatusDraft {
			return ErrSupplierInvoiceConflict
		}
		if err := tx.Model(&si).Update("status", models.SupplierInvoiceStatusUnpaid).Error; err != nil {
			return err
		}
		pendingID = si.ID
		return nil
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSupplierInvoiceNotFound
		}
		return nil, err
	}

	out, err := uc.repo.GetByID(ctx, pendingID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSupplierInvoiceNotFound
		}
		return nil, err
	}
	uc.auditService.Log(ctx, "supplier_invoice.pending", id, map[string]interface{}{"after": out})
	return uc.mapper.ToDetailResponse(out), nil
}

func (uc *supplierInvoiceUsecase) ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.SupplierInvoiceAuditTrailEntry, int64, error) {
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
		Where("audit_logs.permission_code LIKE ?", "supplier_invoice.%")

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
