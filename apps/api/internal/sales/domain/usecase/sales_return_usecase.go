package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/internal/core/apptime"
	invDto "github.com/gilabs/gims/api/internal/inventory/domain/dto"
	invUsecase "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	"github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	warehouseModels "github.com/gilabs/gims/api/internal/warehouse/data/models"
	"gorm.io/gorm"
)

var (
	ErrSalesReturnNotFound = errors.New("sales return not found")
	ErrSalesReturnInvalid  = errors.New("invalid sales return request")
)

type SalesReturnUsecase interface {
	GetFormData(ctx context.Context) (*dto.SalesReturnFormDataResponse, error)
	List(ctx context.Context, params repositories.SalesReturnListParams) ([]*dto.SalesReturnResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.SalesReturnResponse, error)
	Create(ctx context.Context, req *dto.CreateSalesReturnRequest) (*dto.SalesReturnResponse, error)
}

type salesReturnUsecase struct {
	db      *gorm.DB
	repo    repositories.SalesReturnRepository
	invUC   invUsecase.InventoryUsecase
}

func NewSalesReturnUsecase(
	db *gorm.DB,
	repo repositories.SalesReturnRepository,
	invUC invUsecase.InventoryUsecase,
) SalesReturnUsecase {
	return &salesReturnUsecase{
		db:    db,
		repo:  repo,
		invUC: invUC,
	}
}

func (u *salesReturnUsecase) GetFormData(ctx context.Context) (*dto.SalesReturnFormDataResponse, error) {
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
		warehouseOptions = append(warehouseOptions, dto.ReturnWarehouseOption{
			ID:   wh.ID,
			Name: wh.Name,
		})
	}

	return &dto.SalesReturnFormDataResponse{
		Warehouses: warehouseOptions,
		ReturnReasons: []dto.ReturnOption{
			{Value: "DAMAGED", Label: "Damaged item"},
			{Value: "WRONG_ITEM", Label: "Wrong item"},
			{Value: "EXPIRED", Label: "Expired item"},
			{Value: "CUSTOMER_REQUEST", Label: "Customer request"},
			{Value: "OTHER", Label: "Other"},
		},
		ItemConditions: []dto.ReturnOption{
			{Value: "GOOD", Label: "Good"},
			{Value: "DAMAGED", Label: "Damaged"},
			{Value: "EXPIRED", Label: "Expired"},
			{Value: "OPENED", Label: "Opened"},
		},
		Actions: []dto.ReturnOption{
			{Value: string(models.SalesReturnActionRefund), Label: "Refund"},
			{Value: string(models.SalesReturnActionCreditNote), Label: "Credit Note"},
			{Value: string(models.SalesReturnActionReplacement), Label: "Replacement"},
		},
		RefundMethods: []dto.ReturnOption{
			{Value: "BANK_TRANSFER", Label: "Bank Transfer"},
			{Value: "CASH", Label: "Cash"},
			{Value: "WALLET", Label: "Wallet"},
		},
	}, nil
}

func (u *salesReturnUsecase) List(ctx context.Context, params repositories.SalesReturnListParams) ([]*dto.SalesReturnResponse, int64, error) {
	rows, total, err := u.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}

	out := make([]*dto.SalesReturnResponse, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapSalesReturnRow(row))
	}

	return out, total, nil
}

func (u *salesReturnUsecase) GetByID(ctx context.Context, id string) (*dto.SalesReturnResponse, error) {
	row, err := u.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSalesReturnNotFound
		}
		return nil, err
	}

	return mapSalesReturnRow(row), nil
}

func (u *salesReturnUsecase) Create(ctx context.Context, req *dto.CreateSalesReturnRequest) (*dto.SalesReturnResponse, error) {
	if req == nil || len(req.Items) == 0 {
		return nil, ErrSalesReturnInvalid
	}

	action := strings.ToUpper(strings.TrimSpace(req.Action))
	if action != string(models.SalesReturnActionRefund) &&
		action != string(models.SalesReturnActionCreditNote) &&
		action != string(models.SalesReturnActionReplacement) {
		return nil, ErrSalesReturnInvalid
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
	code := fmt.Sprintf("SR-%s", now.Format("20060102-150405"))

	row := &models.SalesReturn{
		Code:        code,
		InvoiceID:   strings.TrimSpace(req.InvoiceID),
		DeliveryID:  req.DeliveryID,
		WarehouseID: strings.TrimSpace(req.WarehouseID),
		CustomerID:  strings.TrimSpace(req.CustomerID),
		Reason:      strings.TrimSpace(req.Reason),
		Action:      models.SalesReturnAction(action),
		Status:      models.SalesReturnStatusDraft,
		Notes:       req.Notes,
		CreatedBy:   actorID,
	}

	items := make([]models.SalesReturnItem, 0, len(req.Items))
	totalAmount := 0.0
	for _, item := range req.Items {
		subtotal := item.Qty * item.UnitPrice
		totalAmount += subtotal

		items = append(items, models.SalesReturnItem{
			InvoiceItemID: item.InvoiceItemID,
			ProductID:     strings.TrimSpace(item.ProductID),
			UOMID:         item.UOMID,
			Condition:     strings.ToUpper(strings.TrimSpace(item.Condition)),
			Quantity:      item.Qty,
			UnitPrice:     item.UnitPrice,
			Subtotal:      subtotal,
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
				Type:            "IN",
				Quantity:        item.Qty,
				ReferenceNumber: row.Code,
				Description:     "Sales return stock adjustment",
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

	return mapSalesReturnRow(created), nil
}

func mapSalesReturnRow(row *models.SalesReturn) *dto.SalesReturnResponse {
	items := make([]dto.SalesReturnItemResponse, 0, len(row.Items))
	for _, item := range row.Items {
		items = append(items, dto.SalesReturnItemResponse{
			ID:            item.ID,
			InvoiceItemID: item.InvoiceItemID,
			ProductID:     item.ProductID,
			UOMID:         item.UOMID,
			Condition:     item.Condition,
			Qty:           item.Quantity,
			UnitPrice:     item.UnitPrice,
			Subtotal:      item.Subtotal,
		})
	}

	return &dto.SalesReturnResponse{
		ID:                row.ID,
		Code:              row.Code,
		InvoiceID:         row.InvoiceID,
		DeliveryID:        row.DeliveryID,
		WarehouseID:       row.WarehouseID,
		CustomerID:        row.CustomerID,
		Reason:            row.Reason,
		Action:            string(row.Action),
		Status:            string(row.Status),
		Notes:             row.Notes,
		TotalAmount:       row.TotalAmount,
		StockAdjustmentID: row.StockAdjustmentID,
		CreditNoteID:      row.CreditNoteID,
		Items:             items,
		CreatedAt:         row.CreatedAt,
		UpdatedAt:         row.UpdatedAt,
	}
}
