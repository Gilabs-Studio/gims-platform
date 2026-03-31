package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	invDto "github.com/gilabs/gims/api/internal/inventory/domain/dto"
	invUsecase "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	"github.com/gilabs/gims/api/internal/purchase/data/models"
	"github.com/gilabs/gims/api/internal/purchase/data/repositories"
	"github.com/gilabs/gims/api/internal/purchase/domain/dto"
	warehouseModels "github.com/gilabs/gims/api/internal/warehouse/data/models"
	"gorm.io/gorm"
)

var (
	ErrPurchaseReturnNotFound = errors.New("purchase return not found")
	ErrPurchaseReturnInvalid  = errors.New("invalid purchase return request")
)

const errPurchaseReturnDBNil = "db is nil"

const purchaseReturnWarehouseOverridePermission = "purchase_return.warehouse_override"

type purchaseReturnCreateContext struct {
	GoodsReceiptID string
	WarehouseID    string
	SupplierID     string
	Action         models.PurchaseReturnAction
}

type PurchaseReturnUsecase interface {
	GetFormData(ctx context.Context) (*dto.PurchaseReturnFormDataResponse, error)
	List(ctx context.Context, params repositories.PurchaseReturnListParams) ([]*dto.PurchaseReturnResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.PurchaseReturnResponse, error)
	Create(ctx context.Context, req *dto.CreatePurchaseReturnRequest) (*dto.PurchaseReturnResponse, error)
	UpdateStatus(ctx context.Context, id string, status string) (*dto.PurchaseReturnResponse, error)
	Delete(ctx context.Context, id string) error
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.PurchaseReturnAuditTrailEntry, int64, error)
}

type purchaseReturnUsecase struct {
	db           *gorm.DB
	repo         repositories.PurchaseReturnRepository
	invUC        invUsecase.InventoryUsecase
	auditService audit.AuditService
}

func NewPurchaseReturnUsecase(
	db *gorm.DB,
	repo repositories.PurchaseReturnRepository,
	invUC invUsecase.InventoryUsecase,
	auditService audit.AuditService,
) PurchaseReturnUsecase {
	return &purchaseReturnUsecase{db: db, repo: repo, invUC: invUC, auditService: auditService}
}

func (u *purchaseReturnUsecase) GetFormData(ctx context.Context) (*dto.PurchaseReturnFormDataResponse, error) {
	if u.db == nil {
		return nil, errors.New(errPurchaseReturnDBNil)
	}

	var warehouses []warehouseModels.Warehouse
	if err := u.db.WithContext(ctx).
		Model(&warehouseModels.Warehouse{}).
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&warehouses).Error; err != nil {
		return nil, err
	}

	warehouseOptions := make([]dto.ReturnWarehouseOption, 0, len(warehouses))
	for _, wh := range warehouses {
		warehouseOptions = append(warehouseOptions, dto.ReturnWarehouseOption{ID: wh.ID, Name: wh.Name})
	}

	return &dto.PurchaseReturnFormDataResponse{
		Warehouses: warehouseOptions,
		ReturnReasons: []dto.ReturnOption{
			{Value: "DEFECT", Label: "Defect"},
			{Value: "EXCESS", Label: "Excess quantity"},
			{Value: "WRONG_ITEM", Label: "Wrong item"},
			{Value: "QUALITY_ISSUE", Label: "Quality issue"},
			{Value: "OTHER", Label: "Other"},
		},
		ItemConditions: []dto.ReturnOption{
			{Value: "GOOD", Label: "Good"},
			{Value: "DAMAGED", Label: "Damaged"},
			{Value: "EXPIRED", Label: "Expired"},
			{Value: "OPENED", Label: "Opened"},
		},
		Actions: []dto.ReturnOption{
			{Value: string(models.PurchaseReturnActionSupplierCredit), Label: "Supplier Credit"},
			{Value: string(models.PurchaseReturnActionRefund), Label: "Refund"},
			{Value: string(models.PurchaseReturnActionReplacement), Label: "Replacement"},
		},
	}, nil
}

func (u *purchaseReturnUsecase) List(ctx context.Context, params repositories.PurchaseReturnListParams) ([]*dto.PurchaseReturnResponse, int64, error) {
	rows, total, err := u.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}

	out := make([]*dto.PurchaseReturnResponse, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapPurchaseReturnRow(row))
	}

	return out, total, nil
}

func (u *purchaseReturnUsecase) GetByID(ctx context.Context, id string) (*dto.PurchaseReturnResponse, error) {
	if !security.CheckRecordScopeAccess(u.db, ctx, &models.PurchaseReturn{}, id, security.PurchaseScopeQueryOptions()) {
		return nil, ErrPurchaseReturnNotFound
	}

	row, err := u.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPurchaseReturnNotFound
		}
		return nil, err
	}

	return mapPurchaseReturnRow(row), nil
}

func (u *purchaseReturnUsecase) Create(ctx context.Context, req *dto.CreatePurchaseReturnRequest) (*dto.PurchaseReturnResponse, error) {
	if req == nil || len(req.Items) == 0 {
		return nil, ErrPurchaseReturnInvalid
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	if u.db == nil {
		return nil, errors.New(errPurchaseReturnDBNil)
	}

	createCtx, err := u.prepareCreateContext(ctx, req)
	if err != nil {
		return nil, err
	}

	now := apptime.Now()
	code := fmt.Sprintf("PR-%s", now.Format("20060102-150405"))

	row := &models.PurchaseReturn{
		Code:            code,
		GoodsReceiptID:  createCtx.GoodsReceiptID,
		PurchaseOrderID: normalizeOptionalString(req.PurchaseOrderID),
		SupplierID:      createCtx.SupplierID,
		WarehouseID:     createCtx.WarehouseID,
		Reason:          strings.TrimSpace(req.Reason),
		Action:          createCtx.Action,
		Status:          models.PurchaseReturnStatusDraft,
		Notes:           req.Notes,
		CreatedBy:       actorID,
	}

	items := make([]models.PurchaseReturnItem, 0, len(req.Items))
	totalAmount := 0.0
	for _, item := range req.Items {
		subtotal := item.Qty * item.UnitCost
		totalAmount += subtotal
		items = append(items, models.PurchaseReturnItem{
			GoodsReceiptItemID: normalizeOptionalString(item.GoodsReceiptItemID),
			ProductID:          strings.TrimSpace(item.ProductID),
			UOMID:              normalizeOptionalString(item.UOMID),
			Condition:          strings.ToUpper(strings.TrimSpace(item.Condition)),
			Notes:              normalizeOptionalString(item.Notes),
			Quantity:           item.Qty,
			UnitCost:           item.UnitCost,
			Subtotal:           subtotal,
		})
	}
	row.TotalAmount = totalAmount
	row.Items = items

	if err := u.repo.Create(ctx, row); err != nil {
		return nil, err
	}

	created, err := u.repo.GetByID(ctx, row.ID)
	if err != nil {
		return nil, err
	}

	return mapPurchaseReturnRow(created), nil
}

func (u *purchaseReturnUsecase) UpdateStatus(ctx context.Context, id string, status string) (*dto.PurchaseReturnResponse, error) {
	row, err := u.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPurchaseReturnNotFound
		}
		return nil, err
	}

	nextStatus, err := normalizePurchaseReturnStatus(status)
	if err != nil {
		return nil, ErrPurchaseReturnInvalid
	}

	if !canTransitionPurchaseReturnStatus(row.Status, nextStatus) {
		return nil, ErrPurchaseReturnInvalid
	}

	if err := u.repo.UpdateStatus(ctx, id, nextStatus); err != nil {
		return nil, err
	}

	if nextStatus == models.PurchaseReturnStatusApproved {
		actorID, _ := ctx.Value("user_id").(string)
		actorID = strings.TrimSpace(actorID)
		if err := u.createStockMovementsFromRows(ctx, row.Items, row.WarehouseID, row.Code, actorID); err != nil {
			return nil, err
		}
	}

	updated, err := u.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapPurchaseReturnRow(updated), nil
}

func (u *purchaseReturnUsecase) Delete(ctx context.Context, id string) error {
	row, err := u.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrPurchaseReturnNotFound
		}
		return err
	}

	if row.Status != models.PurchaseReturnStatusDraft && row.Status != models.PurchaseReturnStatusRejected {
		return ErrPurchaseReturnInvalid
	}

	return u.repo.Delete(ctx, id)
}

func (u *purchaseReturnUsecase) ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.PurchaseReturnAuditTrailEntry, int64, error) {
	if u.db == nil {
		return nil, 0, errors.New(errPurchaseReturnDBNil)
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

	tx := u.db.WithContext(ctx).Model(&coreModels.AuditLog{}).
		Where("audit_logs.target_id = ?", id).
		Where("audit_logs.permission_code LIKE ?", "purchase_return.%")

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

	entries := make([]dto.PurchaseReturnAuditTrailEntry, 0, len(rows))
	refCache := make(map[string]string)
	for _, r := range rows {
		meta := parsePurchaseAuditMetadata(ctx, u.db, r.Metadata, refCache)

		var user *dto.AuditTrailUser
		if r.ActorID != "" {
			email := ""
			name := ""
			if r.ActorEmail != nil {
				email = *r.ActorEmail
			}
			if r.ActorName != nil {
				name = *r.ActorName
			}
			user = &dto.AuditTrailUser{ID: r.ActorID, Email: email, Name: name}
		}

		entries = append(entries, dto.PurchaseReturnAuditTrailEntry{
			ID:             r.ID,
			Action:         r.Action,
			PermissionCode: r.PermissionCode,
			TargetID:       r.TargetID,
			Metadata:       meta,
			User:           user,
			CreatedAt:      r.CreatedAt,
		})
	}

	return entries, total, nil
}

func (u *purchaseReturnUsecase) prepareCreateContext(
	ctx context.Context,
	req *dto.CreatePurchaseReturnRequest,
) (*purchaseReturnCreateContext, error) {
	goodsReceiptID := strings.TrimSpace(req.GoodsReceiptID)
	if goodsReceiptID == "" {
		return nil, errors.New("goods_receipt_id is required")
	}

	action, err := normalizePurchaseReturnAction(req.Action)
	if err != nil {
		return nil, err
	}

	goodsReceipt, err := u.getGoodsReceipt(ctx, goodsReceiptID)
	if err != nil {
		return nil, err
	}

	if err := u.validateRequestedQty(ctx, goodsReceiptID, req.Items); err != nil {
		return nil, err
	}

	warehouseID := strings.TrimSpace(req.WarehouseID)
	if warehouseID == "" {
		return nil, errors.New("warehouse_id is required")
	}
	sourceWarehouseID := ""
	if goodsReceipt.WarehouseID != nil {
		sourceWarehouseID = strings.TrimSpace(*goodsReceipt.WarehouseID)
	}
	if sourceWarehouseID != "" && sourceWarehouseID != warehouseID {
		if !hasWarehouseOverridePermission(ctx, purchaseReturnWarehouseOverridePermission) {
			u.logWarehouseMismatchAttempt(ctx, goodsReceiptID, sourceWarehouseID, warehouseID, "denied")
			return nil, errors.New("warehouse_id must match goods receipt warehouse")
		}
		u.logWarehouseMismatchAttempt(ctx, goodsReceiptID, sourceWarehouseID, warehouseID, "allowed")
	}

	if err := u.validateRequestedQtyAgainstWarehouseStock(ctx, warehouseID, req.Items); err != nil {
		return nil, err
	}

	supplierID := strings.TrimSpace(req.SupplierID)
	if supplierID == "" {
		supplierID = strings.TrimSpace(goodsReceipt.SupplierID)
	}
	if supplierID == "" {
		return nil, errors.New("supplier_id is required")
	}

	return &purchaseReturnCreateContext{
		GoodsReceiptID: goodsReceiptID,
		WarehouseID:    warehouseID,
		SupplierID:     supplierID,
		Action:         action,
	}, nil
}

func (u *purchaseReturnUsecase) logWarehouseMismatchAttempt(
	ctx context.Context,
	goodsReceiptID string,
	sourceWarehouseID string,
	requestedWarehouseID string,
	result string,
) {
	if u.auditService == nil {
		return
	}

	u.auditService.Log(ctx, "purchase_return.warehouse_override", goodsReceiptID, map[string]interface{}{
		"goods_receipt_id":         goodsReceiptID,
		"source_warehouse_id":      sourceWarehouseID,
		"requested_warehouse_id":   requestedWarehouseID,
		"required_permission_code": purchaseReturnWarehouseOverridePermission,
		"result":                   result,
	})
}

func hasWarehouseOverridePermission(ctx context.Context, permissionCode string) bool {
	if strings.EqualFold(strings.TrimSpace(getContextString(ctx, "user_role")), "admin") {
		return true
	}

	if permissions, ok := ctx.Value("user_permissions").(map[string]bool); ok {
		return permissions[permissionCode]
	}

	if scopedPermissions, ok := ctx.Value("user_permissions_scope").(map[string]string); ok {
		_, exists := scopedPermissions[permissionCode]
		return exists
	}

	return false
}

func getContextString(ctx context.Context, key string) string {
	if ctx == nil {
		return ""
	}
	v, _ := ctx.Value(key).(string)
	return strings.TrimSpace(v)
}

func normalizePurchaseReturnAction(raw string) (models.PurchaseReturnAction, error) {
	action := strings.ToUpper(strings.TrimSpace(raw))
	switch action {
	case string(models.PurchaseReturnActionSupplierCredit), string(models.PurchaseReturnActionRefund), string(models.PurchaseReturnActionReplacement):
		return models.PurchaseReturnAction(action), nil
	default:
		return "", ErrPurchaseReturnInvalid
	}
}

func normalizePurchaseReturnStatus(raw string) (models.PurchaseReturnStatus, error) {
	status := strings.ToUpper(strings.TrimSpace(raw))
	switch status {
	case string(models.PurchaseReturnStatusDraft), string(models.PurchaseReturnStatusSubmitted), string(models.PurchaseReturnStatusApproved), string(models.PurchaseReturnStatusRejected):
		return models.PurchaseReturnStatus(status), nil
	default:
		return "", ErrPurchaseReturnInvalid
	}
}

func canTransitionPurchaseReturnStatus(current, next models.PurchaseReturnStatus) bool {
	if current == next {
		return true
	}

	switch current {
	case models.PurchaseReturnStatusDraft:
		return next == models.PurchaseReturnStatusSubmitted || next == models.PurchaseReturnStatusRejected
	case models.PurchaseReturnStatusSubmitted:
		return next == models.PurchaseReturnStatusApproved || next == models.PurchaseReturnStatusRejected
	case models.PurchaseReturnStatusRejected:
		return next == models.PurchaseReturnStatusDraft
	default:
		return false
	}
}

func normalizeOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func (u *purchaseReturnUsecase) validateRequestedQty(
	ctx context.Context,
	goodsReceiptID string,
	items []dto.CreatePurchaseReturnItemRequest,
) error {
	availableQtyByProduct, err := u.getAvailableGoodsReceiptQtyByProduct(ctx, goodsReceiptID)
	if err != nil {
		return err
	}

	requestedQtyByProduct := make(map[string]float64)
	for _, item := range items {
		productID := strings.TrimSpace(item.ProductID)
		requestedQtyByProduct[productID] += item.Qty
	}

	for productID, requestedQty := range requestedQtyByProduct {
		availableQty := availableQtyByProduct[productID]
		if requestedQty <= 0 || requestedQty > availableQty+0.0001 {
			return errors.New("return quantity exceeds available quantity from goods receipt")
		}
	}

	return nil
}

func (u *purchaseReturnUsecase) validateRequestedQtyAgainstWarehouseStock(
	ctx context.Context,
	warehouseID string,
	items []dto.CreatePurchaseReturnItemRequest,
) error {
	if u.invUC == nil {
		return nil
	}

	requestedQtyByProduct := make(map[string]float64)
	productIDs := make(map[string]struct{})

	for _, item := range items {
		productID := strings.TrimSpace(item.ProductID)
		if productID == "" {
			continue
		}
		requestedQtyByProduct[productID] += item.Qty
		productIDs[productID] = struct{}{}
	}

	availableQtyByProduct, err := u.getWarehouseAvailableQtyByProduct(ctx, warehouseID, productIDs)
	if err != nil {
		return err
	}

	for productID, requestedQty := range requestedQtyByProduct {
		availableQty := availableQtyByProduct[productID]
		if requestedQty > availableQty+0.0001 {
			return fmt.Errorf("return quantity exceeds available warehouse stock for product %s", productID)
		}
	}

	return nil
}

func (u *purchaseReturnUsecase) getWarehouseAvailableQtyByProduct(
	ctx context.Context,
	warehouseID string,
	productIDs map[string]struct{},
) (map[string]float64, error) {
	availableQtyByProduct := make(map[string]float64)

	if len(productIDs) == 0 {
		return availableQtyByProduct, nil
	}

	page := 1
	perPage := 200

	for {
		result, err := u.invUC.GetTreeProducts(ctx, &invDto.GetInventoryTreeProductsRequest{
			WarehouseID: warehouseID,
			Page:        page,
			PerPage:     perPage,
		})
		if err != nil {
			return nil, err
		}

		for _, item := range result.Data {
			productID := strings.TrimSpace(item.ProductID)
			if _, ok := productIDs[productID]; !ok {
				continue
			}
			availableQtyByProduct[productID] = item.Available
		}

		if !result.Meta.HasNext {
			break
		}
		page++
	}

	return availableQtyByProduct, nil
}

func (u *purchaseReturnUsecase) createStockMovements(
	ctx context.Context,
	items []dto.CreatePurchaseReturnItemRequest,
	warehouseID string,
	referenceNumber string,
	actorID string,
) error {
	if u.invUC == nil {
		return nil
	}

	for _, item := range items {
		moveReq := &invDto.CreateManualMovementRequest{
			ProductID:       strings.TrimSpace(item.ProductID),
			WarehouseID:     warehouseID,
			Type:            "OUT",
			Quantity:        item.Qty,
			ReferenceNumber: referenceNumber,
			Description:     "Purchase return stock adjustment",
			CreatedBy:       actorID,
		}
		if err := u.invUC.CreateManualStockMovement(ctx, moveReq); err != nil {
			return err
		}
	}

	return nil
}

func (u *purchaseReturnUsecase) createStockMovementsFromRows(
	ctx context.Context,
	items []models.PurchaseReturnItem,
	warehouseID string,
	referenceNumber string,
	actorID string,
) error {
	if u.invUC == nil {
		return nil
	}

	for _, item := range items {
		moveReq := &invDto.CreateManualMovementRequest{
			ProductID:       strings.TrimSpace(item.ProductID),
			WarehouseID:     warehouseID,
			Type:            "OUT",
			Quantity:        item.Quantity,
			ReferenceNumber: referenceNumber,
			Description:     "Purchase return stock adjustment",
			CreatedBy:       actorID,
		}
		if err := u.invUC.CreateManualStockMovement(ctx, moveReq); err != nil {
			return err
		}
	}

	return nil
}

func (u *purchaseReturnUsecase) getGoodsReceipt(ctx context.Context, goodsReceiptID string) (*models.GoodsReceipt, error) {
	if u.db == nil {
		return nil, errors.New(errPurchaseReturnDBNil)
	}

	var goodsReceipt models.GoodsReceipt
	if err := u.db.WithContext(ctx).
		Preload("Items").
		First(&goodsReceipt, "id = ?", goodsReceiptID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("goods receipt not found")
		}
		return nil, err
	}

	return &goodsReceipt, nil
}

func (u *purchaseReturnUsecase) getAvailableGoodsReceiptQtyByProduct(ctx context.Context, goodsReceiptID string) (map[string]float64, error) {
	if u.db == nil {
		return nil, errors.New(errPurchaseReturnDBNil)
	}

	type productQtyRow struct {
		ProductID string
		Qty       float64
	}

	sourceRows := make([]productQtyRow, 0)
	if err := u.db.WithContext(ctx).
		Model(&models.GoodsReceiptItem{}).
		Select("product_id, COALESCE(SUM(quantity_received), 0) AS qty").
		Where("goods_receipt_id = ?", goodsReceiptID).
		Group("product_id").
		Scan(&sourceRows).Error; err != nil {
		return nil, err
	}

	returnedRows := make([]productQtyRow, 0)
	if err := u.db.WithContext(ctx).
		Model(&models.PurchaseReturnItem{}).
		Select("purchase_return_items.product_id, COALESCE(SUM(purchase_return_items.quantity), 0) AS qty").
		Joins("JOIN purchase_returns ON purchase_returns.id = purchase_return_items.purchase_return_id").
		Where("purchase_returns.goods_receipt_id = ?", goodsReceiptID).
		Where("purchase_returns.deleted_at IS NULL").
		Where("purchase_returns.status <> ?", models.PurchaseReturnStatusRejected).
		Group("purchase_return_items.product_id").
		Scan(&returnedRows).Error; err != nil {
		return nil, err
	}

	returnedQtyByProduct := make(map[string]float64)
	for _, row := range returnedRows {
		returnedQtyByProduct[row.ProductID] = row.Qty
	}

	availableByProduct := make(map[string]float64)
	for _, row := range sourceRows {
		availableByProduct[row.ProductID] = math.Max(0, row.Qty-returnedQtyByProduct[row.ProductID])
	}

	return availableByProduct, nil
}

func mapPurchaseReturnRow(row *models.PurchaseReturn) *dto.PurchaseReturnResponse {
	items := make([]dto.PurchaseReturnItemResponse, 0, len(row.Items))
	for _, item := range row.Items {
		items = append(items, dto.PurchaseReturnItemResponse{
			ID:                 item.ID,
			GoodsReceiptItemID: item.GoodsReceiptItemID,
			ProductID:          item.ProductID,
			UOMID:              item.UOMID,
			Condition:          item.Condition,
			Notes:              item.Notes,
			Qty:                item.Quantity,
			UnitCost:           item.UnitCost,
			Subtotal:           item.Subtotal,
		})
	}

	return &dto.PurchaseReturnResponse{
		ID:                row.ID,
		Code:              row.Code,
		GoodsReceiptID:    row.GoodsReceiptID,
		PurchaseOrderID:   row.PurchaseOrderID,
		SupplierID:        row.SupplierID,
		WarehouseID:       row.WarehouseID,
		Reason:            row.Reason,
		Action:            string(row.Action),
		Status:            string(row.Status),
		Notes:             row.Notes,
		TotalAmount:       row.TotalAmount,
		StockAdjustmentID: row.StockAdjustmentID,
		DebitNoteID:       row.DebitNoteID,
		Items:             items,
		CreatedAt:         row.CreatedAt,
		UpdatedAt:         row.UpdatedAt,
	}
}
