package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
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

type SupplierInvoiceDownPaymentUsecase interface {
	AddData(ctx context.Context) (*dto.SupplierInvoiceDownPaymentAddResponse, error)
	List(ctx context.Context, params repositories.SupplierInvoiceListParams) ([]*dto.SupplierInvoiceDownPaymentListResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.SupplierInvoiceDownPaymentDetailResponse, error)
	Create(ctx context.Context, req *dto.CreateSupplierInvoiceDownPaymentRequest) (*dto.SupplierInvoiceDownPaymentDetailResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateSupplierInvoiceDownPaymentRequest) (*dto.SupplierInvoiceDownPaymentDetailResponse, error)
	Delete(ctx context.Context, id string) error
	Pending(ctx context.Context, id string) (*dto.SupplierInvoiceDownPaymentDetailResponse, error)
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.SupplierInvoiceAuditTrailEntry, int64, error)
}

type supplierInvoiceDownPaymentUsecase struct {
	db           *gorm.DB
	repo         repositories.SupplierInvoiceRepository
	poRepo       repositories.PurchaseOrderRepository
	auditService audit.AuditService
	mapper       *mapper.SupplierInvoiceMapper
}

func NewSupplierInvoiceDownPaymentUsecase(db *gorm.DB, repo repositories.SupplierInvoiceRepository, poRepo repositories.PurchaseOrderRepository, auditService audit.AuditService) SupplierInvoiceDownPaymentUsecase {
	return &supplierInvoiceDownPaymentUsecase{db: db, repo: repo, poRepo: poRepo, auditService: auditService, mapper: mapper.NewSupplierInvoiceMapper()}
}

func (uc *supplierInvoiceDownPaymentUsecase) AddData(ctx context.Context) (*dto.SupplierInvoiceDownPaymentAddResponse, error) {
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
	return uc.mapper.ToDownPaymentDetailResponse(si), nil
}

func (uc *supplierInvoiceDownPaymentUsecase) Create(ctx context.Context, req *dto.CreateSupplierInvoiceDownPaymentRequest) (*dto.SupplierInvoiceDownPaymentDetailResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}
	var out *models.SupplierInvoice
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var po models.PurchaseOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&po, "id = ?", req.PurchaseOrderID).Error; err != nil {
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
		invNo := fmt.Sprintf("SUP-DP-%s-%s", time.Now().Format("20060102"), strings.TrimPrefix(code, "SIDP-"))

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
		loaded, err := uc.repo.GetByID(ctx, si.ID)
		if err != nil {
			return err
		}
		out = loaded
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
			"updated_at":        time.Now(),
		}
		if err := tx.Model(&si).Updates(updates).Error; err != nil {
			return err
		}

		loaded, err := uc.repo.GetByID(ctx, id)
		if err != nil {
			return err
		}
		out = loaded
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
	if existing.Status != models.SupplierInvoiceStatusDraft {
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

		loaded, err := uc.repo.GetByID(ctx, id)
		if err != nil {
			return err
		}
		out = loaded
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
