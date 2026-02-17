package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"errors"
	"math"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
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
	ErrGoodsReceiptNotFound = errors.New("goods receipt not found")
	ErrGoodsReceiptConflict = errors.New("goods receipt conflict")
)

type GoodsReceiptUsecase interface {
	List(ctx context.Context, params repositories.GoodsReceiptListParams) ([]*dto.GoodsReceiptListResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.GoodsReceiptDetailResponse, error)
	Create(ctx context.Context, req *dto.CreateGoodsReceiptRequest) (*dto.GoodsReceiptDetailResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateGoodsReceiptRequest) (*dto.GoodsReceiptDetailResponse, error)
	Delete(ctx context.Context, id string) error
	Confirm(ctx context.Context, id string) (*dto.GoodsReceiptDetailResponse, error)
	AddData(ctx context.Context) (*dto.GoodsReceiptAddResponse, error)
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.GoodsReceiptAuditTrailEntry, int64, error)
}

type goodsReceiptUsecase struct {
	db           *gorm.DB
	repo         repositories.GoodsReceiptRepository
	poRepo       repositories.PurchaseOrderRepository
	mapper       *mapper.GoodsReceiptMapper
	auditService audit.AuditService
}

func NewGoodsReceiptUsecase(db *gorm.DB, repo repositories.GoodsReceiptRepository, poRepo repositories.PurchaseOrderRepository, auditService audit.AuditService) GoodsReceiptUsecase {
	return &goodsReceiptUsecase{
		db:           db,
		repo:         repo,
		poRepo:       poRepo,
		mapper:       mapper.NewGoodsReceiptMapper(),
		auditService: auditService,
	}
}

func (uc *goodsReceiptUsecase) List(ctx context.Context, params repositories.GoodsReceiptListParams) ([]*dto.GoodsReceiptListResponse, int64, error) {
	items, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return uc.mapper.ToListResponseList(items), total, nil
}

func (uc *goodsReceiptUsecase) GetByID(ctx context.Context, id string) (*dto.GoodsReceiptDetailResponse, error) {
	gr, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrGoodsReceiptNotFound
		}
		return nil, err
	}
	return uc.mapper.ToDetailResponse(gr), nil
}

func (uc *goodsReceiptUsecase) Create(ctx context.Context, req *dto.CreateGoodsReceiptRequest) (*dto.GoodsReceiptDetailResponse, error) {
	if req == nil {
		return nil, errors.New("request is nil")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	if uc.db == nil {
		return nil, errors.New("db is nil")
	}

	var createdID string
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Lock by purchase order ID to prevent concurrent draft creation.
		lockKey := "goods_receipt_create:" + strings.TrimSpace(req.PurchaseOrderID)
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtext(?))", lockKey).Error; err != nil {
			return err
		}

		var po models.PurchaseOrder
		if err := tx.
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Items").
			First(&po, "id = ?", req.PurchaseOrderID).Error; err != nil {
			return err
		}
		if po.Status != models.PurchaseOrderStatusApproved {
			return ErrInvalidStatus
		}

		supplierID := ""
		if po.SupplierID != nil {
			supplierID = strings.TrimSpace(*po.SupplierID)
		}
		if supplierID == "" {
			return errors.New("purchase order supplier is empty")
		}

		var draftCount int64
		if err := tx.Model(&models.GoodsReceipt{}).
			Where("purchase_order_id = ?", po.ID).
			Where("status = ?", models.GoodsReceiptStatusDraft).
			Count(&draftCount).Error; err != nil {
			return err
		}
		if draftCount > 0 {
			return ErrGoodsReceiptConflict
		}

		code, err := getNextGoodsReceiptCodeLocked(ctx, tx, "GR")
		if err != nil {
			return err
		}

		gr := &models.GoodsReceipt{
			Code:            code,
			PurchaseOrderID: po.ID,
			SupplierID:      supplierID,
			ReceiptDate:     nil,
			Notes:           req.Notes,
			Status:          models.GoodsReceiptStatusDraft,
			CreatedBy:       actorID,
			Items:           make([]models.GoodsReceiptItem, 0, len(req.Items)),
		}

		poItemByID := make(map[string]*models.PurchaseOrderItem, len(po.Items))
		for i := range po.Items {
			poIt := &po.Items[i]
			poItemByID[poIt.ID] = poIt
		}

		for _, it := range req.Items {
			poItemID := strings.TrimSpace(it.PurchaseOrderItemID)
			if poItemID == "" {
				return ErrGoodsReceiptConflict
			}
			poIt := poItemByID[poItemID]
			if poIt == nil {
				return ErrGoodsReceiptConflict
			}
			if strings.TrimSpace(it.ProductID) == "" || strings.TrimSpace(it.ProductID) != strings.TrimSpace(poIt.ProductID) {
				return ErrGoodsReceiptConflict
			}

			qty := math.Max(0, it.QuantityReceived)
			gr.Items = append(gr.Items, models.GoodsReceiptItem{
				PurchaseOrderItemID: poItemID,
				ProductID:           it.ProductID,
				QuantityReceived:    qty,
				Notes:               it.Notes,
			})
		}

		if err := snapshotGoodsReceipt(ctx, tx, gr, nil); err != nil {
			return err
		}

		if err := tx.Omit("Items").Create(gr).Error; err != nil {
			return err
		}
		if len(gr.Items) > 0 {
			for i := range gr.Items {
				gr.Items[i].GoodsReceiptID = gr.ID
				gr.Items[i].QuantityReceived = math.Max(0, gr.Items[i].QuantityReceived)
			}
			if err := tx.Create(&gr.Items).Error; err != nil {
				return err
			}
		}

		createdID = gr.ID
		return nil
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPurchaseOrderNotFound
		}
		return nil, err
	}

	created, err := uc.repo.GetByID(ctx, createdID)
	if err != nil {
		return nil, err
	}

	uc.auditService.Log(ctx, "goods_receipt.create", created.ID, map[string]interface{}{
		"after": grAuditSnapshot(created),
	})

	return uc.mapper.ToDetailResponse(created), nil
}

func (uc *goodsReceiptUsecase) Update(ctx context.Context, id string, req *dto.UpdateGoodsReceiptRequest) (*dto.GoodsReceiptDetailResponse, error) {
	if req == nil {
		return nil, errors.New("request is nil")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrGoodsReceiptNotFound
		}
		return nil, err
	}
	if existing.Status != models.GoodsReceiptStatusDraft {
		return nil, ErrGoodsReceiptConflict
	}
	before := grAuditSnapshot(existing)

	gr := &models.GoodsReceipt{
		ID:              existing.ID,
		Code:            existing.Code,
		PurchaseOrderID: existing.PurchaseOrderID,
		SupplierID:      existing.SupplierID,
		ReceiptDate:     existing.ReceiptDate,
		Notes:           req.Notes,
		Status:          existing.Status,
		CreatedBy:       existing.CreatedBy,
		Items:           make([]models.GoodsReceiptItem, 0, len(req.Items)),
	}
	for _, it := range req.Items {
		po := existing.PurchaseOrder
		if po == nil {
			return nil, ErrGoodsReceiptConflict
		}
		poItemByID := make(map[string]*models.PurchaseOrderItem, len(po.Items))
		for i := range po.Items {
			poIt := &po.Items[i]
			poItemByID[poIt.ID] = poIt
		}

		poItemID := strings.TrimSpace(it.PurchaseOrderItemID)
		if poItemID == "" {
			return nil, ErrGoodsReceiptConflict
		}
		poIt := poItemByID[poItemID]
		if poIt == nil {
			return nil, ErrGoodsReceiptConflict
		}
		if strings.TrimSpace(it.ProductID) == "" || strings.TrimSpace(it.ProductID) != strings.TrimSpace(poIt.ProductID) {
			return nil, ErrGoodsReceiptConflict
		}

		qty := math.Max(0, it.QuantityReceived)
		gr.Items = append(gr.Items, models.GoodsReceiptItem{
			PurchaseOrderItemID: poItemID,
			ProductID:           it.ProductID,
			QuantityReceived:    qty,
			Notes:               it.Notes,
		})
	}

	if err := snapshotGoodsReceipt(ctx, uc.db, gr, existing); err != nil {
		return nil, err
	}

	updated, err := uc.repo.Update(ctx, gr)
	if err != nil {
		return nil, err
	}
	uc.auditService.Log(ctx, "goods_receipt.update", updated.ID, map[string]interface{}{
		"before": before,
		"after":  grAuditSnapshot(updated),
	})

	return uc.mapper.ToDetailResponse(updated), nil
}

func (uc *goodsReceiptUsecase) Delete(ctx context.Context, id string) error {
	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return errors.New("user not authenticated")
	}

	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrGoodsReceiptNotFound
		}
		return err
	}
	if existing.Status != models.GoodsReceiptStatusDraft {
		return ErrGoodsReceiptConflict
	}
	if err := uc.repo.Delete(ctx, id); err != nil {
		return err
	}
	uc.auditService.Log(ctx, "goods_receipt.delete", id, map[string]interface{}{
		"before": grAuditSnapshot(existing),
	})
	return nil
}

func (uc *goodsReceiptUsecase) Confirm(ctx context.Context, id string) (*dto.GoodsReceiptDetailResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	// Use a transaction to prevent over-receiving on concurrent confirms.
	var out *models.GoodsReceipt
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var gr models.GoodsReceipt
		if err := tx.
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Items").
			First(&gr, "id = ?", id).Error; err != nil {
			return err
		}
		if gr.Status != models.GoodsReceiptStatusDraft {
			return ErrGoodsReceiptConflict
		}

		// Lock purchase order as well.
		var po models.PurchaseOrder
		if err := tx.
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Items").
			First(&po, "id = ?", gr.PurchaseOrderID).Error; err != nil {
			return err
		}
		if po.Status != models.PurchaseOrderStatusApproved {
			return ErrInvalidStatus
		}

		// Validate quantities do not exceed ordered qty (sum of confirmed GRs + this GR).
		for _, it := range gr.Items {
			ordered := 0.0
			for _, poIt := range po.Items {
				if poIt.ID == it.PurchaseOrderItemID {
					ordered = poIt.Quantity
					break
				}
			}

			var alreadyReceived float64
			if err := tx.
				Table("goods_receipt_items").
				Select("COALESCE(SUM(goods_receipt_items.quantity_received),0)").
				Joins("JOIN goods_receipts ON goods_receipts.id = goods_receipt_items.goods_receipt_id").
				Where("goods_receipts.purchase_order_id = ?", po.ID).
				Where("goods_receipts.status = ?", models.GoodsReceiptStatusConfirmed).
				Where("goods_receipt_items.purchase_order_item_id = ?", it.PurchaseOrderItemID).
				Scan(&alreadyReceived).Error; err != nil {
				return err
			}

			receiving := math.Max(0, it.QuantityReceived)
			if alreadyReceived+receiving > ordered+0.0001 {
				return ErrGoodsReceiptConflict
			}
		}

		now := time.Now()
		if err := tx.Model(&gr).Updates(map[string]interface{}{
			"status":       models.GoodsReceiptStatusConfirmed,
			"receipt_date": now,
		}).Error; err != nil {
			return err
		}

		// Close PO if fully received.
		fullyReceived := true
		for _, poIt := range po.Items {
			var totalReceived float64
			if err := tx.
				Table("goods_receipt_items").
				Select("COALESCE(SUM(goods_receipt_items.quantity_received),0)").
				Joins("JOIN goods_receipts ON goods_receipts.id = goods_receipt_items.goods_receipt_id").
				Where("goods_receipts.purchase_order_id = ?", po.ID).
				Where("goods_receipts.status = ?", models.GoodsReceiptStatusConfirmed).
				Where("goods_receipt_items.purchase_order_item_id = ?", poIt.ID).
				Scan(&totalReceived).Error; err != nil {
				return err
			}
			if totalReceived+0.0001 < poIt.Quantity {
				fullyReceived = false
				break
			}
		}
		if fullyReceived {
			_ = tx.Model(&po).Update("status", models.PurchaseOrderStatusClosed).Error
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
			return nil, ErrGoodsReceiptNotFound
		}
		return nil, err
	}

	uc.auditService.Log(ctx, "goods_receipt.confirm", id, map[string]interface{}{
		"after": grAuditSnapshot(out),
	})

	return uc.mapper.ToDetailResponse(out), nil
}

func (uc *goodsReceiptUsecase) AddData(ctx context.Context) (*dto.GoodsReceiptAddResponse, error) {
	// Eligible: purchase orders in APPROVED status
	items, _, err := uc.poRepo.List(ctx, repositories.PurchaseOrderListParams{
		Status:  string(models.PurchaseOrderStatusApproved),
		SortBy:  "created_at",
		SortDir: "desc",
		Limit:   100,
		Offset:  0,
	})
	if err != nil {
		return nil, err
	}

	// Exclude POs that already have a DRAFT goods receipt.
	poIDs := make([]string, 0, len(items))
	for _, po := range items {
		poIDs = append(poIDs, po.ID)
	}
	draftByPO := map[string]bool{}
	if uc.db != nil && len(poIDs) > 0 {
		type row struct {
			PurchaseOrderID string `gorm:"column:purchase_order_id"`
		}
		rows := make([]row, 0)
		if err := uc.db.WithContext(ctx).
			Model(&models.GoodsReceipt{}).
			Select("purchase_order_id").
			Where("purchase_order_id IN ?", poIDs).
			Where("status = ?", models.GoodsReceiptStatusDraft).
			Group("purchase_order_id").
			Scan(&rows).Error; err != nil {
			return nil, err
		}
		for _, r := range rows {
			draftByPO[r.PurchaseOrderID] = true
		}
	}

	res := make([]dto.GoodsReceiptPurchaseOrderOption, 0, len(items))
	for _, po := range items {
		if draftByPO[po.ID] {
			continue
		}
		opt := dto.GoodsReceiptPurchaseOrderOption{ID: po.ID, Code: po.Code, Status: string(po.Status)}
		if po.Supplier != nil {
			opt.Supplier = &dto.GoodsReceiptSupplierMini{ID: po.Supplier.ID, Name: po.Supplier.Name}
		}
		res = append(res, opt)
	}

	return &dto.GoodsReceiptAddResponse{EligiblePurchaseOrders: res}, nil
}

func (uc *goodsReceiptUsecase) ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.GoodsReceiptAuditTrailEntry, int64, error) {
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
		Where("audit_logs.permission_code LIKE ?", "goods_receipt.%")

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

	entries := make([]dto.GoodsReceiptAuditTrailEntry, 0, len(rows))
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
		entries = append(entries, dto.GoodsReceiptAuditTrailEntry{
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

func grAuditSnapshot(gr *models.GoodsReceipt) map[string]interface{} {
	if gr == nil {
		return nil
	}
	items := make([]map[string]interface{}, 0, len(gr.Items))
	for _, it := range gr.Items {
		items = append(items, map[string]interface{}{
			"id":                   it.ID,
			"purchase_order_item_id": it.PurchaseOrderItemID,
			"product_id":           it.ProductID,
			"quantity_received":    it.QuantityReceived,
		})
	}
	return map[string]interface{}{
		"id":                gr.ID,
		"code":              gr.Code,
		"purchase_order_id":  gr.PurchaseOrderID,
		"supplier_id":        gr.SupplierID,
		"receipt_date":       gr.ReceiptDate,
		"notes":              gr.Notes,
		"status":             gr.Status,
		"created_by":         gr.CreatedBy,
		"items":              items,
	}
}

func getNextGoodsReceiptCodeLocked(ctx context.Context, tx *gorm.DB, prefix string) (string, error) {
	now := database.GetDB(ctx, tx).NowFunc()
	dateStr := now.Format("20060102")
	codePrefix := prefix + "-" + dateStr + "-"

	lockKey := "goods_receipt_code:" + dateStr
	if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtext(?))", lockKey).Error; err != nil {
		return "", err
	}

	var last models.GoodsReceipt
	err := tx.WithContext(ctx).
		Unscoped().
		Model(&models.GoodsReceipt{}).
		Select("code").
		Where("code LIKE ?", codePrefix+"%").
		Order("code DESC").
		First(&last).Error

	seq := 1
	if err != nil {
		if err != gorm.ErrRecordNotFound {
			return "", err
		}
	} else if len(last.Code) >= len(codePrefix)+4 {
		lastSeqStr := last.Code[len(last.Code)-4:]
		var n int
		if _, convErr := fmt.Sscanf(strings.TrimSpace(lastSeqStr), "%d", &n); convErr == nil && n > 0 {
			seq = n + 1
		}
	}

	return fmt.Sprintf("%s%04d", codePrefix, seq), nil
}
