package usecase

import (
	"context"
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
	supplierModels "github.com/gilabs/gims/api/internal/supplier/data/models"
	"gorm.io/gorm"
)

var (
	ErrPurchaseRequisitionNotFound = errors.New("purchase requisition not found")
	ErrInvalidStatus               = errors.New("invalid purchase requisition status")
	ErrNotImplemented              = errors.New("not implemented")
)

type PurchaseRequisitionUsecase interface {
	List(ctx context.Context, params repositories.PurchaseRequisitionListParams) ([]*dto.PurchaseRequisitionListResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.PurchaseRequisitionDetailResponse, error)
	Create(ctx context.Context, req *dto.CreatePurchaseRequisitionRequest) (*dto.PurchaseRequisitionDetailResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdatePurchaseRequisitionRequest) (*dto.PurchaseRequisitionDetailResponse, error)
	Delete(ctx context.Context, id string) error
	AddData(ctx context.Context) (*dto.PurchaseRequisitionAddResponse, error)
	Submit(ctx context.Context, id string) (*dto.PurchaseRequisitionDetailResponse, error)
	Approve(ctx context.Context, id string) (*dto.PurchaseRequisitionDetailResponse, error)
	Reject(ctx context.Context, id string) (*dto.PurchaseRequisitionDetailResponse, error)
	Convert(ctx context.Context, id string) error
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.PurchaseRequisitionAuditTrailEntry, int64, error)
}

type purchaseRequisitionUsecase struct {
	db           *gorm.DB
	repo         repositories.PurchaseRequisitionRepository
	mapper       *mapper.PurchaseRequisitionMapper
	auditService audit.AuditService
}

func NewPurchaseRequisitionUsecase(db *gorm.DB, repo repositories.PurchaseRequisitionRepository, auditService audit.AuditService) PurchaseRequisitionUsecase {
	return &purchaseRequisitionUsecase{
		db:           db,
		repo:         repo,
		mapper:       mapper.NewPurchaseRequisitionMapper(),
		auditService: auditService,
	}
}

func (uc *purchaseRequisitionUsecase) List(ctx context.Context, params repositories.PurchaseRequisitionListParams) ([]*dto.PurchaseRequisitionListResponse, int64, error) {
	items, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return uc.mapper.ToListResponseList(items), total, nil
}

func (uc *purchaseRequisitionUsecase) GetByID(ctx context.Context, id string) (*dto.PurchaseRequisitionDetailResponse, error) {
	pr, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPurchaseRequisitionNotFound
		}
		return nil, err
	}
	return uc.mapper.ToDetailResponse(pr), nil
}

func (uc *purchaseRequisitionUsecase) Create(ctx context.Context, req *dto.CreatePurchaseRequisitionRequest) (*dto.PurchaseRequisitionDetailResponse, error) {
	if req == nil {
		return nil, errors.New("request is nil")
	}

	pr := &models.PurchaseRequisition{
		// Code is generated atomically in repository.Create
		Code:           "",
		SupplierID:     req.SupplierID,
		PaymentTermsID: req.PaymentTermsID,
		BusinessUnitID: req.BusinessUnitID,
		EmployeeID:     req.EmployeeID,
		RequestDate:    req.RequestDate,
		Address:        req.Address,
		Notes:          req.Notes,
		Status:         models.PurchaseRequisitionStatusDraft,
		TaxRate:        clamp(req.TaxRate, 0, 100),
		DeliveryCost:   math.Max(0, req.DeliveryCost),
		OtherCost:      math.Max(0, req.OtherCost),
		Items:          make([]models.PurchaseRequisitionItem, 0, len(req.Items)),
	}

	for _, it := range req.Items {
		discount := clamp(it.Discount, 0, 100)
		subtotal := calcItemSubtotal(it.Quantity, it.PurchasePrice, discount)
		pr.Items = append(pr.Items, models.PurchaseRequisitionItem{
			ProductID:     it.ProductID,
			Quantity:      it.Quantity,
			PurchasePrice: it.PurchasePrice,
			Discount:      discount,
			Subtotal:      subtotal,
			Notes:         it.Notes,
		})
	}

	subtotal, taxAmount, total := calcTotals(pr.Items, pr.TaxRate, pr.DeliveryCost, pr.OtherCost)
	pr.Subtotal = subtotal
	pr.TaxAmount = taxAmount
	pr.TotalAmount = total

	if err := snapshotPurchaseRequisitionHeader(ctx, uc.db, pr, nil); err != nil {
		return nil, err
	}
	if err := snapshotPurchaseRequisitionItems(ctx, uc.db, pr, nil); err != nil {
		return nil, err
	}

	created, err := uc.repo.Create(ctx, pr)
	if err != nil {
		return nil, err
	}

	full, err := uc.repo.GetByID(ctx, created.ID)
	if err != nil {
		return nil, err
	}

	uc.auditService.Log(ctx, "purchase_requisition.create", created.ID, map[string]interface{}{
		"after": prAuditSnapshot(full),
	})
	return uc.mapper.ToDetailResponse(full), nil
}

func (uc *purchaseRequisitionUsecase) Update(ctx context.Context, id string, req *dto.UpdatePurchaseRequisitionRequest) (*dto.PurchaseRequisitionDetailResponse, error) {
	if req == nil {
		return nil, errors.New("request is nil")
	}

	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPurchaseRequisitionNotFound
		}
		return nil, err
	}
	if existing.Status != models.PurchaseRequisitionStatusDraft {
		return nil, ErrInvalidStatus
	}
	before := prAuditSnapshot(existing)

	pr := &models.PurchaseRequisition{
		ID:             existing.ID,
		Code:           existing.Code,
		SupplierID:     req.SupplierID,
		PaymentTermsID: req.PaymentTermsID,
		BusinessUnitID: req.BusinessUnitID,
		EmployeeID:     req.EmployeeID,
		RequestDate:    req.RequestDate,
		Address:        req.Address,
		Notes:          req.Notes,
		Status:         existing.Status,
		TaxRate:        clamp(req.TaxRate, 0, 100),
		DeliveryCost:   math.Max(0, req.DeliveryCost),
		OtherCost:      math.Max(0, req.OtherCost),
		Items:          make([]models.PurchaseRequisitionItem, 0, len(req.Items)),
	}

	for _, it := range req.Items {
		discount := clamp(it.Discount, 0, 100)
		subtotal := calcItemSubtotal(it.Quantity, it.PurchasePrice, discount)
		pr.Items = append(pr.Items, models.PurchaseRequisitionItem{
			ProductID:     it.ProductID,
			Quantity:      it.Quantity,
			PurchasePrice: it.PurchasePrice,
			Discount:      discount,
			Subtotal:      subtotal,
			Notes:         it.Notes,
		})
	}

	subtotal, taxAmount, total := calcTotals(pr.Items, pr.TaxRate, pr.DeliveryCost, pr.OtherCost)
	pr.Subtotal = subtotal
	pr.TaxAmount = taxAmount
	pr.TotalAmount = total

	if err := snapshotPurchaseRequisitionHeader(ctx, uc.db, pr, existing); err != nil {
		return nil, err
	}
	if err := snapshotPurchaseRequisitionItems(ctx, uc.db, pr, existing); err != nil {
		return nil, err
	}

	updated, err := uc.repo.Update(ctx, pr)
	if err != nil {
		return nil, err
	}

	uc.auditService.Log(ctx, "purchase_requisition.update", id, map[string]interface{}{
		"before": before,
		"after":  prAuditSnapshot(updated),
	})
	return uc.mapper.ToDetailResponse(updated), nil
}

func (uc *purchaseRequisitionUsecase) Delete(ctx context.Context, id string) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrPurchaseRequisitionNotFound
		}
		return err
	}
	if existing.Status != models.PurchaseRequisitionStatusDraft {
		return ErrInvalidStatus
	}
	before := prAuditSnapshot(existing)
	if err := uc.repo.Delete(ctx, id); err != nil {
		return err
	}
	uc.auditService.Log(ctx, "purchase_requisition.delete", id, map[string]interface{}{
		"before": before,
	})
	return nil
}

func (uc *purchaseRequisitionUsecase) AddData(ctx context.Context) (*dto.PurchaseRequisitionAddResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}

	// Suppliers
	var suppliers []supplierModels.Supplier
	if err := uc.db.WithContext(ctx).
		Model(&supplierModels.Supplier{}).
		Preload("Contacts").
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&suppliers).Error; err != nil {
		return nil, err
	}

	supplierIDs := make([]string, 0, len(suppliers))
	for _, s := range suppliers {
		supplierIDs = append(supplierIDs, s.ID)
	}

	// Products grouped by supplier
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

	productsBySupplier := make(map[string][]dto.PurchaseRequisitionAddProduct)
	for _, p := range products {
		if p.SupplierID == nil || strings.TrimSpace(*p.SupplierID) == "" {
			continue
		}
		productsBySupplier[*p.SupplierID] = append(productsBySupplier[*p.SupplierID], dto.PurchaseRequisitionAddProduct{
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

	addSuppliers := make([]dto.PurchaseRequisitionAddSupplier, 0, len(suppliers))
	for _, s := range suppliers {
		addPhones := make([]dto.PurchaseRequisitionAddSupplierContact, 0, len(s.Contacts))
		for _, ph := range s.Contacts {
			addPhones = append(addPhones, dto.PurchaseRequisitionAddSupplierContact{
				ID:          ph.ID,
				PhoneNumber: ph.Phone,
				Label:       ph.Position,
				IsPrimary:   ph.IsPrimary,
			})
		}
		addSuppliers = append(addSuppliers, dto.PurchaseRequisitionAddSupplier{
			ID:             s.ID,
			Code:           s.Code,
			Name:           s.Name,
			PaymentTermsID: s.PaymentTermsID,
			BusinessUnitID: s.BusinessUnitID,
			Contacts: addPhones,
			Products:       productsBySupplier[s.ID],
		})
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
	addPaymentTerms := make([]dto.PurchaseRequisitionAddPaymentTerms, 0, len(paymentTerms))
	for _, pt := range paymentTerms {
		addPaymentTerms = append(addPaymentTerms, dto.PurchaseRequisitionAddPaymentTerms{
			ID:   pt.ID,
			Code: pt.Code,
			Name: pt.Name,
			Days: pt.Days,
		})
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
	addBusinessUnits := make([]dto.PurchaseRequisitionAddBusinessUnit, 0, len(businessUnits))
	for _, bu := range businessUnits {
		addBusinessUnits = append(addBusinessUnits, dto.PurchaseRequisitionAddBusinessUnit{
			ID:   bu.ID,
			Name: bu.Name,
		})
	}

	// Employees (with user)
	var employees []orgModels.Employee
	if err := uc.db.WithContext(ctx).
		Model(&orgModels.Employee{}).
		Preload("User").
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&employees).Error; err != nil {
		return nil, err
	}
	addEmployees := make([]dto.PurchaseRequisitionAddEmployee, 0, len(employees))
	for _, e := range employees {
		email := ""
		if e.User != nil {
			email = e.User.Email
		}
		addEmployees = append(addEmployees, dto.PurchaseRequisitionAddEmployee{
			ID:       e.ID,
			UserID:   e.UserID,
			Name:     e.Name,
			Email:    email,
			IsActive: e.IsActive,
		})
	}

	return &dto.PurchaseRequisitionAddResponse{
		Suppliers:     addSuppliers,
		PaymentTerms:  addPaymentTerms,
		BusinessUnits: addBusinessUnits,
		Employees:     addEmployees,
	}, nil
}

func (uc *purchaseRequisitionUsecase) Submit(ctx context.Context, id string) (*dto.PurchaseRequisitionDetailResponse, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPurchaseRequisitionNotFound
		}
		return nil, err
	}
	if existing.Status != models.PurchaseRequisitionStatusDraft {
		return nil, ErrInvalidStatus
	}
	before := prAuditSnapshot(existing)

	updated, err := uc.repo.UpdateStatus(ctx, id, models.PurchaseRequisitionStatusSubmitted)
	if err != nil {
		return nil, err
	}
	uc.auditService.Log(ctx, "purchase_requisition.submit", id, map[string]interface{}{
		"before": before,
		"after":  prAuditSnapshot(updated),
	})
	return uc.mapper.ToDetailResponse(updated), nil
}

func (uc *purchaseRequisitionUsecase) Approve(ctx context.Context, id string) (*dto.PurchaseRequisitionDetailResponse, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPurchaseRequisitionNotFound
		}
		return nil, err
	}
	// Only SUBMITTED PRs can be approved (mirrors quotation "sent" -> "approved").
	if existing.Status != models.PurchaseRequisitionStatusSubmitted {
		return nil, ErrInvalidStatus
	}
	before := prAuditSnapshot(existing)

	updated, err := uc.repo.UpdateStatus(ctx, id, models.PurchaseRequisitionStatusApproved)
	if err != nil {
		return nil, err
	}
	uc.auditService.Log(ctx, "purchase_requisition.approve", id, map[string]interface{}{
		"before": before,
		"after":  prAuditSnapshot(updated),
	})
	return uc.mapper.ToDetailResponse(updated), nil
}

func (uc *purchaseRequisitionUsecase) Reject(ctx context.Context, id string) (*dto.PurchaseRequisitionDetailResponse, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPurchaseRequisitionNotFound
		}
		return nil, err
	}
	// Only SUBMITTED PRs can be rejected.
	if existing.Status != models.PurchaseRequisitionStatusSubmitted {
		return nil, ErrInvalidStatus
	}
	before := prAuditSnapshot(existing)

	updated, err := uc.repo.UpdateStatus(ctx, id, models.PurchaseRequisitionStatusRejected)
	if err != nil {
		return nil, err
	}
	uc.auditService.Log(ctx, "purchase_requisition.reject", id, map[string]interface{}{
		"before": before,
		"after":  prAuditSnapshot(updated),
	})
	return uc.mapper.ToDetailResponse(updated), nil
}

func (uc *purchaseRequisitionUsecase) Convert(ctx context.Context, id string) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrPurchaseRequisitionNotFound
		}
		return err
	}
	if existing.Status != models.PurchaseRequisitionStatusApproved {
		return ErrInvalidStatus
	}
	before := prAuditSnapshot(existing)

	updated, err := uc.repo.UpdateStatus(ctx, id, models.PurchaseRequisitionStatusConverted)
	if err != nil {
		return err
	}

	uc.auditService.Log(ctx, "purchase_requisition.convert", id, map[string]interface{}{
		"before": before,
		"after":  prAuditSnapshot(updated),
	})

	return nil
}

func (uc *purchaseRequisitionUsecase) ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.PurchaseRequisitionAuditTrailEntry, int64, error) {
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
		Where("audit_logs.permission_code LIKE ?", "purchase_requisition.%")

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

	entries := make([]dto.PurchaseRequisitionAuditTrailEntry, 0, len(rows))
	refCache := make(map[string]string)
	for _, r := range rows {
		meta := parsePurchaseAuditMetadata(ctx, uc.db, r.Metadata, refCache)
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
		entries = append(entries, dto.PurchaseRequisitionAuditTrailEntry{
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

func prAuditSnapshot(pr *models.PurchaseRequisition) map[string]interface{} {
	if pr == nil {
		return nil
	}
	return map[string]interface{}{
		"id":                 pr.ID,
		"code":               pr.Code,
		"status":             pr.Status,
		"supplier_id":        pr.SupplierID,
		"payment_terms_id":   pr.PaymentTermsID,
		"payment_terms_name": pr.PaymentTermsNameSnapshot,
		"business_unit_id":   pr.BusinessUnitID,
		"business_unit_name": pr.BusinessUnitNameSnapshot,
		"employee_id":        pr.EmployeeID,
		"request_date":       pr.RequestDate,
		"address":            pr.Address,
		"tax_rate":           pr.TaxRate,
		"tax_amount":         pr.TaxAmount,
		"delivery_cost":      pr.DeliveryCost,
		"other_cost":         pr.OtherCost,
		"subtotal":           pr.Subtotal,
		"notes":              pr.Notes,
		"total_amount":       pr.TotalAmount,
		"items":              prAuditItems(pr.Items),
	}
}

func prAuditItems(items []models.PurchaseRequisitionItem) []map[string]interface{} {
	if len(items) == 0 {
		return []map[string]interface{}{}
	}

	out := make([]map[string]interface{}, 0, len(items))
	for _, item := range items {
		out = append(out, map[string]interface{}{
			"id":             item.ID,
			"product_id":     item.ProductID,
			"product_code":   item.ProductCodeSnapshot,
			"product_name":   item.ProductNameSnapshot,
			"quantity":       item.Quantity,
			"purchase_price": item.PurchasePrice,
			"price":          item.PurchasePrice,
			"discount":       item.Discount,
			"subtotal":       item.Subtotal,
			"notes":          item.Notes,
		})
	}

	return out
}

func calcItemSubtotal(qty, price, discount float64) float64 {
	raw := qty * price
	if discount <= 0 {
		return raw
	}
	return raw - (raw * (discount / 100))
}

func calcTotals(items []models.PurchaseRequisitionItem, taxRate, deliveryCost, otherCost float64) (subtotal, taxAmount, total float64) {
	subtotal = 0
	for _, it := range items {
		subtotal += it.Subtotal
	}
	taxAmount = subtotal * (clamp(taxRate, 0, 100) / 100)
	total = subtotal + taxAmount + math.Max(0, deliveryCost) + math.Max(0, otherCost)
	return
}

func clamp(val, minVal, maxVal float64) float64 {
	if val < minVal {
		return minVal
	}
	if val > maxVal {
		return maxVal
	}
	return val
}
