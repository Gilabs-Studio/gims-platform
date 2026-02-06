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
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	"github.com/gilabs/gims/api/internal/purchase/data/models"
	"github.com/gilabs/gims/api/internal/purchase/data/repositories"
	"github.com/gilabs/gims/api/internal/purchase/domain/dto"
	"github.com/gilabs/gims/api/internal/purchase/domain/mapper"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	supplierModels "github.com/gilabs/gims/api/internal/supplier/data/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrPurchaseOrderNotFound = errors.New("purchase order not found")
	ErrPurchaseOrderConflict = errors.New("purchase order conflict")
	ErrSalesOrderNotFound    = errors.New("sales order not found")
)

type PurchaseOrderUsecase interface {
	List(ctx context.Context, params repositories.PurchaseOrderListParams) ([]*dto.PurchaseOrderListResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.PurchaseOrderDetailResponse, error)
	Create(ctx context.Context, req *dto.CreatePurchaseOrderRequest) (*dto.PurchaseOrderDetailResponse, error)
	CreateFromPurchaseRequisition(ctx context.Context, purchaseRequisitionID string) (*dto.PurchaseOrderDetailResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdatePurchaseOrderRequest) (*dto.PurchaseOrderDetailResponse, error)
	Delete(ctx context.Context, id string) error
	Confirm(ctx context.Context, id string) (*dto.PurchaseOrderDetailResponse, error)
	Revise(ctx context.Context, id string, comment string) (*dto.PurchaseOrderDetailResponse, error)
	AddData(ctx context.Context) (*dto.PurchaseOrderAddResponse, error)
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.PurchaseOrderAuditTrailEntry, int64, error)
}

type purchaseOrderUsecase struct {
	db           *gorm.DB
	repo         repositories.PurchaseOrderRepository
	prRepo       repositories.PurchaseRequisitionRepository
	mapper       *mapper.PurchaseOrderMapper
	auditService audit.AuditService
}

func NewPurchaseOrderUsecase(db *gorm.DB, repo repositories.PurchaseOrderRepository, prRepo repositories.PurchaseRequisitionRepository, auditService audit.AuditService) PurchaseOrderUsecase {
	return &purchaseOrderUsecase{
		db:           db,
		repo:         repo,
		prRepo:       prRepo,
		mapper:       mapper.NewPurchaseOrderMapper(),
		auditService: auditService,
	}
}

func (uc *purchaseOrderUsecase) List(ctx context.Context, params repositories.PurchaseOrderListParams) ([]*dto.PurchaseOrderListResponse, int64, error) {
	items, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return uc.mapper.ToListResponseList(items), total, nil
}

func (uc *purchaseOrderUsecase) GetByID(ctx context.Context, id string) (*dto.PurchaseOrderDetailResponse, error) {
	po, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPurchaseOrderNotFound
		}
		return nil, err
	}
	return uc.mapper.ToDetailResponse(po), nil
}

func (uc *purchaseOrderUsecase) Create(ctx context.Context, req *dto.CreatePurchaseOrderRequest) (*dto.PurchaseOrderDetailResponse, error) {
	if req == nil {
		return nil, errors.New("request is nil")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	if req.PurchaseRequisitionID != nil && strings.TrimSpace(*req.PurchaseRequisitionID) != "" && req.SalesOrderID != nil && strings.TrimSpace(*req.SalesOrderID) != "" {
		return nil, ErrPurchaseOrderConflict
	}

	po := &models.PurchaseOrder{
		Code:                 "",
		SupplierID:           req.SupplierID,
		PaymentTermsID:       req.PaymentTermsID,
		BusinessUnitID:       req.BusinessUnitID,
		CreatedBy:            actorID,
		PurchaseRequisitionID: req.PurchaseRequisitionID,
		SalesOrderID:         req.SalesOrderID,
		OrderDate:            req.OrderDate,
		DueDate:              req.DueDate,
		Notes:                req.Notes,
		Status:               models.PurchaseOrderStatusDraft,
		TaxRate:              clampPO(req.TaxRate, 0, 100),
		DeliveryCost:         math.Max(0, req.DeliveryCost),
		OtherCost:            math.Max(0, req.OtherCost),
		Items:                make([]models.PurchaseOrderItem, 0, len(req.Items)),
	}

	for _, it := range req.Items {
		discount := clampPO(it.Discount, 0, 100)
		qty := math.Max(0, it.Quantity)
		price := math.Max(0, it.Price)
		subtotal := calcPOItemSubtotal(qty, price, discount)
		po.Items = append(po.Items, models.PurchaseOrderItem{
			ProductID: it.ProductID,
			Quantity:  qty,
			Price:     price,
			Discount:  discount,
			Subtotal:  subtotal,
			Notes:     it.Notes,
		})
	}

	sub, tax, total := calcPOTotals(po.Items, po.TaxRate, po.DeliveryCost, po.OtherCost)
	po.SubTotal = sub
	po.TaxAmount = tax
	po.TotalAmount = total

	// If create from PR: validate PR approved and not already converted to PO
	if po.PurchaseRequisitionID != nil && strings.TrimSpace(*po.PurchaseRequisitionID) != "" {
		existingPR, err := uc.prRepo.GetByID(ctx, *po.PurchaseRequisitionID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, ErrPurchaseRequisitionNotFound
			}
			return nil, err
		}
		if existingPR.Status != models.PurchaseRequisitionStatusApproved {
			return nil, ErrInvalidStatus
		}
		exists, err := uc.repo.ExistsByPurchaseRequisitionID(ctx, existingPR.ID)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, ErrPurchaseOrderConflict
		}
	}

	// If create from Sales Order: validate SO exists and not already converted to PO
	if po.SalesOrderID != nil && strings.TrimSpace(*po.SalesOrderID) != "" {
		var soCount int64
		if err := uc.db.WithContext(ctx).
			Model(&salesModels.SalesOrder{}).
			Where("id = ?", *po.SalesOrderID).
			Count(&soCount).Error; err != nil {
			return nil, err
		}
		if soCount == 0 {
			return nil, ErrSalesOrderNotFound
		}
		exists, err := uc.repo.ExistsBySalesOrderID(ctx, *po.SalesOrderID)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, ErrPurchaseOrderConflict
		}
	}

	created, err := uc.repo.Create(ctx, po)
	if err != nil {
		return nil, err
	}

	full, err := uc.repo.GetByID(ctx, created.ID)
	if err != nil {
		return nil, err
	}

	uc.auditService.Log(ctx, "purchase_order.create", created.ID, map[string]interface{}{
		"after": poAuditSnapshot(full),
	})

	// Side-effect: when created from PR, set PR to CONVERTED
	if full.PurchaseRequisitionID != nil && strings.TrimSpace(*full.PurchaseRequisitionID) != "" {
		_, _ = uc.prRepo.UpdateStatus(ctx, *full.PurchaseRequisitionID, models.PurchaseRequisitionStatusConverted)
		uc.auditService.Log(ctx, "purchase_requisition.convert", *full.PurchaseRequisitionID, map[string]interface{}{
			"after": map[string]interface{}{
				"id":     *full.PurchaseRequisitionID,
				"status": models.PurchaseRequisitionStatusConverted,
			},
		})
	}

	return uc.mapper.ToDetailResponse(full), nil
}

func (uc *purchaseOrderUsecase) CreateFromPurchaseRequisition(ctx context.Context, purchaseRequisitionID string) (*dto.PurchaseOrderDetailResponse, error) {
	purchaseRequisitionID = strings.TrimSpace(purchaseRequisitionID)
	if purchaseRequisitionID == "" {
		return nil, errors.New("purchase requisition id is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	var createdID string

	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var pr models.PurchaseRequisition
		if err := tx.
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Items").
			First(&pr, "id = ?", purchaseRequisitionID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return ErrPurchaseRequisitionNotFound
			}
			return err
		}

		if pr.Status != models.PurchaseRequisitionStatusApproved {
			return ErrInvalidStatus
		}

		var count int64
		if err := tx.Model(&models.PurchaseOrder{}).
			Where("purchase_requisition_id = ?", pr.ID).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return ErrPurchaseOrderConflict
		}

		po := &models.PurchaseOrder{
			Code:                  "",
			SupplierID:            pr.SupplierID,
			PaymentTermsID:        pr.PaymentTermsID,
			BusinessUnitID:        pr.BusinessUnitID,
			CreatedBy:             actorID,
			PurchaseRequisitionID: &pr.ID,
			SalesOrderID:          nil,
			OrderDate:             time.Now().Format("2006-01-02"),
			DueDate:               nil,
			Notes:                 pr.Notes,
			Status:                models.PurchaseOrderStatusDraft,
			TaxRate:               clampPO(pr.TaxRate, 0, 100),
			DeliveryCost:          math.Max(0, pr.DeliveryCost),
			OtherCost:             math.Max(0, pr.OtherCost),
			Items:                 make([]models.PurchaseOrderItem, 0, len(pr.Items)),
		}

		for _, it := range pr.Items {
			discount := clampPO(it.Discount, 0, 100)
			qty := math.Max(0, it.Quantity)
			price := math.Max(0, it.PurchasePrice)
			subtotal := calcPOItemSubtotal(qty, price, discount)
			po.Items = append(po.Items, models.PurchaseOrderItem{
				ProductID: it.ProductID,
				Quantity:  qty,
				Price:     price,
				Discount:  discount,
				Subtotal:  subtotal,
				Notes:     it.Notes,
			})
		}

		sub, tax, total := calcPOTotals(po.Items, po.TaxRate, po.DeliveryCost, po.OtherCost)
		po.SubTotal = sub
		po.TaxAmount = tax
		po.TotalAmount = total

		poRepoTx := repositories.NewPurchaseOrderRepository(tx)
		created, err := poRepoTx.Create(ctx, po)
		if err != nil {
			return err
		}
		createdID = created.ID

		prRepoTx := repositories.NewPurchaseRequisitionRepository(tx)
		if _, err := prRepoTx.UpdateStatus(ctx, pr.ID, models.PurchaseRequisitionStatusConverted); err != nil {
			return err
		}

		full, err := poRepoTx.GetByID(ctx, createdID)
		if err == nil {
			uc.auditService.Log(ctx, "purchase_order.create", createdID, map[string]interface{}{
				"after": poAuditSnapshot(full),
			})
		}
		uc.auditService.Log(ctx, "purchase_requisition.convert", pr.ID, map[string]interface{}{
			"after": map[string]interface{}{
				"id":     pr.ID,
				"status": models.PurchaseRequisitionStatusConverted,
				"purchase_order_id": createdID,
			},
		})

		return nil
	})
	if err != nil {
		return nil, err
	}

	full, err := uc.repo.GetByID(ctx, createdID)
	if err != nil {
		return nil, err
	}
	return uc.mapper.ToDetailResponse(full), nil
}

func (uc *purchaseOrderUsecase) Update(ctx context.Context, id string, req *dto.UpdatePurchaseOrderRequest) (*dto.PurchaseOrderDetailResponse, error) {
	if req == nil {
		return nil, errors.New("request is nil")
	}

	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPurchaseOrderNotFound
		}
		return nil, err
	}
	if existing.Status != models.PurchaseOrderStatusDraft && existing.Status != models.PurchaseOrderStatusRevised {
		return nil, ErrPurchaseOrderConflict
	}
	before := poAuditSnapshot(existing)

	po := &models.PurchaseOrder{
		ID:                   existing.ID,
		Code:                 existing.Code,
		SupplierID:           req.SupplierID,
		PaymentTermsID:       req.PaymentTermsID,
		BusinessUnitID:       req.BusinessUnitID,
		CreatedBy:            existing.CreatedBy,
		PurchaseRequisitionID: existing.PurchaseRequisitionID,
		SalesOrderID:         existing.SalesOrderID,
		OrderDate:            req.OrderDate,
		DueDate:              req.DueDate,
		RevisionComment:      existing.RevisionComment,
		Notes:                req.Notes,
		Status:               existing.Status,
		TaxRate:              clampPO(req.TaxRate, 0, 100),
		DeliveryCost:         math.Max(0, req.DeliveryCost),
		OtherCost:            math.Max(0, req.OtherCost),
		Items:                make([]models.PurchaseOrderItem, 0, len(req.Items)),
	}

	for _, it := range req.Items {
		discount := clampPO(it.Discount, 0, 100)
		qty := math.Max(0, it.Quantity)
		price := math.Max(0, it.Price)
		subtotal := calcPOItemSubtotal(qty, price, discount)
		po.Items = append(po.Items, models.PurchaseOrderItem{
			ProductID: it.ProductID,
			Quantity:  qty,
			Price:     price,
			Discount:  discount,
			Subtotal:  subtotal,
			Notes:     it.Notes,
		})
	}

	sub, tax, total := calcPOTotals(po.Items, po.TaxRate, po.DeliveryCost, po.OtherCost)
	po.SubTotal = sub
	po.TaxAmount = tax
	po.TotalAmount = total

	updated, err := uc.repo.Update(ctx, po)
	if err != nil {
		return nil, err
	}

	uc.auditService.Log(ctx, "purchase_order.update", id, map[string]interface{}{
		"before": before,
		"after":  poAuditSnapshot(updated),
	})

	return uc.mapper.ToDetailResponse(updated), nil
}

func (uc *purchaseOrderUsecase) Delete(ctx context.Context, id string) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrPurchaseOrderNotFound
		}
		return err
	}
	if existing.Status != models.PurchaseOrderStatusDraft {
		return ErrPurchaseOrderConflict
	}
	before := poAuditSnapshot(existing)
	if err := uc.repo.Delete(ctx, id); err != nil {
		return err
	}
	uc.auditService.Log(ctx, "purchase_order.delete", id, map[string]interface{}{
		"before": before,
	})
	return nil
}

func (uc *purchaseOrderUsecase) Confirm(ctx context.Context, id string) (*dto.PurchaseOrderDetailResponse, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPurchaseOrderNotFound
		}
		return nil, err
	}
	if existing.Status != models.PurchaseOrderStatusDraft && existing.Status != models.PurchaseOrderStatusRevised {
		return nil, ErrPurchaseOrderConflict
	}
	before := poAuditSnapshot(existing)

	updated, err := uc.repo.UpdateStatus(ctx, id, models.PurchaseOrderStatusApproved)
	if err != nil {
		return nil, err
	}
	uc.auditService.Log(ctx, "purchase_order.confirm", id, map[string]interface{}{
		"before": before,
		"after":  poAuditSnapshot(updated),
	})
	return uc.mapper.ToDetailResponse(updated), nil
}

func (uc *purchaseOrderUsecase) Revise(ctx context.Context, id string, comment string) (*dto.PurchaseOrderDetailResponse, error) {
	comment = strings.TrimSpace(comment)
	if comment == "" {
		return nil, errors.New("revision_comment is required")
	}

	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPurchaseOrderNotFound
		}
		return nil, err
	}
	if existing.Status != models.PurchaseOrderStatusDraft && existing.Status != models.PurchaseOrderStatusApproved {
		return nil, ErrPurchaseOrderConflict
	}
	before := poAuditSnapshot(existing)

	updated, err := uc.repo.Revise(ctx, id, comment)
	if err != nil {
		return nil, err
	}

	uc.auditService.Log(ctx, "purchase_order.revise", id, map[string]interface{}{
		"before": before,
		"after":  poAuditSnapshot(updated),
	})
	return uc.mapper.ToDetailResponse(updated), nil
}

func (uc *purchaseOrderUsecase) AddData(ctx context.Context) (*dto.PurchaseOrderAddResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}

	var suppliers []supplierModels.Supplier
	if err := uc.db.WithContext(ctx).
		Model(&supplierModels.Supplier{}).
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&suppliers).Error; err != nil {
		return nil, err
	}

	supplierIDs := make([]string, 0, len(suppliers))
	for _, s := range suppliers {
		supplierIDs = append(supplierIDs, s.ID)
	}

	var products []productModels.Product
	if len(supplierIDs) > 0 {
		if err := uc.db.WithContext(ctx).
			Model(&productModels.Product{}).
			Where("supplier_id IN ?", supplierIDs).
			Where("supplier_id IS NOT NULL").
			Where("is_active = ?", true).
			Where("is_approved = ?", true).
			Order("name ASC").
			Find(&products).Error; err != nil {
			return nil, err
		}
	}

	productsBySupplier := make(map[string][]productModels.Product)
	for _, p := range products {
		if p.SupplierID == nil || strings.TrimSpace(*p.SupplierID) == "" {
			continue
		}
		productsBySupplier[*p.SupplierID] = append(productsBySupplier[*p.SupplierID], p)
	}

	// Payment terms
	var paymentTerms []coreModels.PaymentTerms
	if err := uc.db.WithContext(ctx).
		Model(&coreModels.PaymentTerms{}).
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&paymentTerms).Error; err != nil {
		return nil, err
	}

	// Business units
	var businessUnits []orgModels.BusinessUnit
	if err := uc.db.WithContext(ctx).
		Model(&orgModels.BusinessUnit{}).
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&businessUnits).Error; err != nil {
		return nil, err
	}

	// Build response DTO (group products under suppliers for UI convenience)
	respSuppliers := make([]dto.PurchaseOrderAddSupplier, 0, len(suppliers))
	for _, s := range suppliers {
		prods := productsBySupplier[s.ID]
		respProducts := make([]dto.PurchaseOrderAddProduct, 0, len(prods))
		for _, p := range prods {
			respProducts = append(respProducts, dto.PurchaseOrderAddProduct{
				ID:         p.ID,
				Code:       p.Code,
				Name:       p.Name,
				Stock:      p.CurrentStock,
				CurrentHpp: p.CurrentHpp,
				SupplierID: p.SupplierID,
				IsActive:   p.IsActive,
				IsApproved: p.IsApproved,
			})
		}
		respSuppliers = append(respSuppliers, dto.PurchaseOrderAddSupplier{
			ID:       s.ID,
			Code:     s.Code,
			Name:     s.Name,
			Products: respProducts,
		})
	}

	respPaymentTerms := make([]dto.PurchaseOrderAddPaymentTerms, 0, len(paymentTerms))
	for _, pt := range paymentTerms {
		respPaymentTerms = append(respPaymentTerms, dto.PurchaseOrderAddPaymentTerms{
			ID:   pt.ID,
			Code: pt.Code,
			Name: pt.Name,
			Days: pt.Days,
		})
	}

	respBusinessUnits := make([]dto.PurchaseOrderAddBusinessUnit, 0, len(businessUnits))
	for _, bu := range businessUnits {
		respBusinessUnits = append(respBusinessUnits, dto.PurchaseOrderAddBusinessUnit{
			ID:   bu.ID,
			Name: bu.Name,
		})
	}

	return &dto.PurchaseOrderAddResponse{
		Suppliers:     respSuppliers,
		PaymentTerms:  respPaymentTerms,
		BusinessUnits: respBusinessUnits,
	}, nil
}


func (uc *purchaseOrderUsecase) ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.PurchaseOrderAuditTrailEntry, int64, error) {
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
		Where("audit_logs.permission_code LIKE ?", "purchase_order.%")

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

	entries := make([]dto.PurchaseOrderAuditTrailEntry, 0, len(rows))
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
		entries = append(entries, dto.PurchaseOrderAuditTrailEntry{
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

func poAuditSnapshot(po *models.PurchaseOrder) map[string]interface{} {
	if po == nil {
		return nil
	}
	return map[string]interface{}{
		"id":                    po.ID,
		"code":                  po.Code,
		"status":                po.Status,
		"supplier_id":           po.SupplierID,
		"payment_terms_id":      po.PaymentTermsID,
		"business_unit_id":      po.BusinessUnitID,
		"created_by":            po.CreatedBy,
		"purchase_requisitions_id": po.PurchaseRequisitionID,
		"sales_order_id":        po.SalesOrderID,
		"order_date":            po.OrderDate,
		"due_date":              po.DueDate,
		"tax_rate":              po.TaxRate,
		"tax_amount":            po.TaxAmount,
		"delivery_cost":         po.DeliveryCost,
		"other_cost":            po.OtherCost,
		"sub_total":             po.SubTotal,
		"total_amount":          po.TotalAmount,
		"revision_comment":      po.RevisionComment,
	}
}

func clampPO(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func calcPOItemSubtotal(qty, price, discount float64) float64 {
	raw := qty * price
	if discount <= 0 {
		return math.Round(raw)
	}
	return math.Round(raw - (raw * (discount / 100)))
}

func calcPOTotals(items []models.PurchaseOrderItem, taxRate, deliveryCost, otherCost float64) (subTotal, taxAmount, total float64) {
	subTotal = 0
	for _, it := range items {
		subTotal += it.Subtotal
	}
	subTotal = math.Round(subTotal)
	if taxRate > 0 {
		taxAmount = math.Round(subTotal * (taxRate / 100))
	}
	// delivery/other are assumed pre-clamped
	total = math.Round(subTotal + taxAmount + deliveryCost + otherCost)
	return
}
