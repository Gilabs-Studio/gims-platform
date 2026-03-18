package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/internal/core/apptime"
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

type PurchaseReturnUsecase interface {
	GetFormData(ctx context.Context) (*dto.PurchaseReturnFormDataResponse, error)
	List(ctx context.Context, params repositories.PurchaseReturnListParams) ([]*dto.PurchaseReturnResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.PurchaseReturnResponse, error)
	Create(ctx context.Context, req *dto.CreatePurchaseReturnRequest) (*dto.PurchaseReturnResponse, error)
}

type purchaseReturnUsecase struct {
	db    *gorm.DB
	repo  repositories.PurchaseReturnRepository
	invUC invUsecase.InventoryUsecase
}

func NewPurchaseReturnUsecase(
	db *gorm.DB,
	repo repositories.PurchaseReturnRepository,
	invUC invUsecase.InventoryUsecase,
) PurchaseReturnUsecase {
	return &purchaseReturnUsecase{db: db, repo: repo, invUC: invUC}
}

func (u *purchaseReturnUsecase) GetFormData(ctx context.Context) (*dto.PurchaseReturnFormDataResponse, error) {
	if u.db == nil {
		return nil, errors.New("db is nil")
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

	action := strings.ToUpper(strings.TrimSpace(req.Action))
	if action != string(models.PurchaseReturnActionSupplierCredit) &&
		action != string(models.PurchaseReturnActionRefund) &&
		action != string(models.PurchaseReturnActionReplacement) {
		return nil, ErrPurchaseReturnInvalid
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	if u.db == nil {
		return nil, errors.New("db is nil")
	}

	now := apptime.Now()
	code := fmt.Sprintf("PR-%s", now.Format("20060102-150405"))

	row := &models.PurchaseReturn{
		Code:            code,
		GoodsReceiptID:  strings.TrimSpace(req.GoodsReceiptID),
		PurchaseOrderID: req.PurchaseOrderID,
		SupplierID:      strings.TrimSpace(req.SupplierID),
		WarehouseID:     strings.TrimSpace(req.WarehouseID),
		Reason:          strings.TrimSpace(req.Reason),
		Action:          models.PurchaseReturnAction(action),
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
			GoodsReceiptItemID: item.GoodsReceiptItemID,
			ProductID:          strings.TrimSpace(item.ProductID),
			UOMID:              item.UOMID,
			Condition:          strings.ToUpper(strings.TrimSpace(item.Condition)),
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

	if u.invUC != nil {
		for _, item := range req.Items {
			moveReq := &invDto.CreateManualMovementRequest{
				ProductID:       strings.TrimSpace(item.ProductID),
				WarehouseID:     strings.TrimSpace(req.WarehouseID),
				Type:            "OUT",
				Quantity:        item.Qty,
				ReferenceNumber: row.Code,
				Description:     "Purchase return stock adjustment",
				CreatedBy:       actorID,
			}
			if err := u.invUC.CreateManualStockMovement(ctx, moveReq); err != nil {
				return nil, err
			}
		}
	}

	created, err := u.repo.GetByID(ctx, row.ID)
	if err != nil {
		return nil, err
	}

	return mapPurchaseReturnRow(created), nil
}

func mapPurchaseReturnRow(row *models.PurchaseReturn) *dto.PurchaseReturnResponse {
	items := make([]dto.PurchaseReturnItemResponse, 0, len(row.Items))
	for _, item := range row.Items {
		items = append(items, dto.PurchaseReturnItemResponse{
			ID:                item.ID,
			GoodsReceiptItemID: item.GoodsReceiptItemID,
			ProductID:         item.ProductID,
			UOMID:             item.UOMID,
			Condition:         item.Condition,
			Qty:               item.Quantity,
			UnitCost:          item.UnitCost,
			Subtotal:          item.Subtotal,
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
