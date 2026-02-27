package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"
	"os"
	"time"

	"github.com/gilabs/gims/api/internal/core/utils"
	inventoryDTO "github.com/gilabs/gims/api/internal/inventory/domain/dto"
	inventoryUC "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	"github.com/gilabs/gims/api/internal/stock_opname/data/models"
	"github.com/gilabs/gims/api/internal/stock_opname/domain/dto"
	"github.com/gilabs/gims/api/internal/stock_opname/domain/mapper"
	"github.com/gilabs/gims/api/internal/stock_opname/domain/repository"
	"gorm.io/gorm"
)

var (
	ErrStockOpnameNotFound = errors.New("stock opname not found")
	ErrInvalidStatus       = errors.New("invalid status for this operation")
)

type StockOpnameUsecase interface {
	Create(ctx context.Context, req *dto.CreateStockOpnameRequest, createdBy *string) (*dto.StockOpnameResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateStockOpnameRequest) (*dto.StockOpnameResponse, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*dto.StockOpnameResponse, error)
	List(ctx context.Context, req *dto.ListStockOpnamesRequest) ([]dto.StockOpnameResponse, *utils.PaginationResult, error)
	SaveItems(ctx context.Context, opnameID string, req *dto.SaveStockOpnameItemsRequest) (*dto.StockOpnameResponse, error)
	ListItems(ctx context.Context, opnameID string) ([]dto.StockOpnameItemResponse, error)
	Submit(ctx context.Context, id string) (*dto.StockOpnameResponse, error)
	Approve(ctx context.Context, id string, approvedBy *string) (*dto.StockOpnameResponse, error)
	Reject(ctx context.Context, id string, rejectedBy *string) (*dto.StockOpnameResponse, error)
	Post(ctx context.Context, id string, postedBy *string) (*dto.StockOpnameResponse, error)
}

type stockOpnameUsecase struct {
	repo        repository.StockOpnameRepository
	inventoryUC inventoryUC.InventoryUsecase
}

func NewStockOpnameUsecase(repo repository.StockOpnameRepository, invUC inventoryUC.InventoryUsecase) StockOpnameUsecase {
	return &stockOpnameUsecase{repo: repo, inventoryUC: invUC}
}

func (u *stockOpnameUsecase) Create(ctx context.Context, req *dto.CreateStockOpnameRequest, createdBy *string) (*dto.StockOpnameResponse, error) {
	logDebug("Usecase Create started")
	opnameNumber, err := u.repo.GetNextOpnameNumber(ctx)
	if err != nil {
		logDebug(fmt.Sprintf("GetNextOpnameNumber error: %v", err))
		return nil, err
	}
	logDebug(fmt.Sprintf("Generated OpnameNumber: %s", opnameNumber))

	model, err := mapper.ToStockOpnameModel(req, opnameNumber, createdBy)
	if err != nil {
		logDebug(fmt.Sprintf("Mapper error: %v", err))
		return nil, err
	}
	logDebug("Mapper success, calling Repo Create")

	if err := u.repo.Create(ctx, model); err != nil {
		logDebug(fmt.Sprintf("Repo Create error: %v", err))
		return nil, err
	}
	logDebug("Repo Create success")

	resp := mapper.ToStockOpnameResponse(model)
	return &resp, nil
}

func logDebug(msg string) {
	f, err := os.OpenFile("/tmp/gims_debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	f.WriteString(fmt.Sprintf("%s: %s\n", time.Now().Format(time.RFC3339), msg))
}

func (u *stockOpnameUsecase) Update(ctx context.Context, id string, req *dto.UpdateStockOpnameRequest) (*dto.StockOpnameResponse, error) {
	opname, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrStockOpnameNotFound
		}
		return nil, err
	}

	if opname.Status != models.StockOpnameStatusDraft {
		return nil, ErrInvalidStatus
	}

	if req.Description != nil {
		opname.Description = *req.Description
	}
	if req.Date != nil {
		date, err := time.Parse("2006-01-02", *req.Date)
		if err == nil {
			opname.Date = date
		}
	}

	if err := u.repo.Update(ctx, opname); err != nil {
		return nil, err
	}

	resp := mapper.ToStockOpnameResponse(opname)
	return &resp, nil
}

func (u *stockOpnameUsecase) Delete(ctx context.Context, id string) error {
	opname, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrStockOpnameNotFound
		}
		return err
	}

	if opname.Status != models.StockOpnameStatusDraft {
		return ErrInvalidStatus
	}

	return u.repo.Delete(ctx, id)
}

func (u *stockOpnameUsecase) GetByID(ctx context.Context, id string) (*dto.StockOpnameResponse, error) {
	opname, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrStockOpnameNotFound
		}
		return nil, err
	}
	resp := mapper.ToStockOpnameResponse(opname)
	return &resp, nil
}

func (u *stockOpnameUsecase) List(ctx context.Context, req *dto.ListStockOpnamesRequest) ([]dto.StockOpnameResponse, *utils.PaginationResult, error) {
	// Defaults
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PerPage <= 0 {
		req.PerPage = 20
	}

	items, total, err := u.repo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	data := make([]dto.StockOpnameResponse, len(items))
	for i, item := range items {
		data[i] = mapper.ToStockOpnameResponse(&item)
	}

	pagination := &utils.PaginationResult{
		Page:       req.Page,
		PerPage:    req.PerPage,
		Total:      int(total),
		TotalPages: int(math.Ceil(float64(total) / float64(req.PerPage))),
	}

	return data, pagination, nil
}

func (u *stockOpnameUsecase) SaveItems(ctx context.Context, opnameID string, req *dto.SaveStockOpnameItemsRequest) (*dto.StockOpnameResponse, error) {
	opname, err := u.repo.FindByID(ctx, opnameID)
	if err != nil {
		return nil, err
	}

	if opname.Status != models.StockOpnameStatusDraft {
		return nil, ErrInvalidStatus
	}

	var items []models.StockOpnameItem
	for _, itemReq := range req.Items {
		variance := 0.0
		if itemReq.PhysicalQty != nil {
			variance = *itemReq.PhysicalQty - itemReq.SystemQty
		}

		items = append(items, models.StockOpnameItem{
			StockOpnameID: opnameID,
			ProductID:     itemReq.ProductID,
			SystemQty:     itemReq.SystemQty,
			PhysicalQty:   itemReq.PhysicalQty,
			VarianceQty:   variance,
			Notes:         itemReq.Notes,
		})
	}

	if err := u.repo.ReplaceItems(ctx, opnameID, items); err != nil {
		return nil, err
	}

	// Refresh
	return u.GetByID(ctx, opnameID)
}

func (u *stockOpnameUsecase) ListItems(ctx context.Context, opnameID string) ([]dto.StockOpnameItemResponse, error) {
	items, err := u.repo.ListItems(ctx, opnameID)
	if err != nil {
		return nil, err
	}

	data := make([]dto.StockOpnameItemResponse, len(items))
	for i, item := range items {
		data[i] = mapper.ToStockOpnameItemResponse(&item)
	}
	return data, nil
}

func (u *stockOpnameUsecase) Submit(ctx context.Context, id string) (*dto.StockOpnameResponse, error) {
	return u.updateStatus(ctx, id, models.StockOpnameStatusPending, nil)
}

func (u *stockOpnameUsecase) Approve(ctx context.Context, id string, approvedBy *string) (*dto.StockOpnameResponse, error) {
	return u.updateStatus(ctx, id, models.StockOpnameStatusApproved, approvedBy)
}

func (u *stockOpnameUsecase) Reject(ctx context.Context, id string, rejectedBy *string) (*dto.StockOpnameResponse, error) {
	return u.updateStatus(ctx, id, models.StockOpnameStatusRejected, rejectedBy)
}

func (u *stockOpnameUsecase) Post(ctx context.Context, id string, postedBy *string) (*dto.StockOpnameResponse, error) {
	// 1. Validate opname exists and is approved
	opname, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrStockOpnameNotFound
		}
		return nil, err
	}

	if opname.Status != models.StockOpnameStatusApproved {
		return nil, ErrInvalidStatus
	}

	// 2. Get all items with variance data
	items, err := u.repo.ListItems(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to list opname items: %w", err)
	}

	// 3. Build adjustment request from items with non-zero variance
	var adjustItems []inventoryDTO.AdjustStockItem
	for _, item := range items {
		if item.VarianceQty == 0 || item.PhysicalQty == nil {
			continue
		}
		adjustItems = append(adjustItems, inventoryDTO.AdjustStockItem{
			ProductID:   item.ProductID,
			VarianceQty: item.VarianceQty,
		})
	}

	// 4. Create ADJUST stock movements via inventory usecase
	if len(adjustItems) > 0 {
		postedByStr := ""
		if postedBy != nil {
			postedByStr = *postedBy
		}

		adjustReq := &inventoryDTO.AdjustStockFromOpnameRequest{
			OpnameID:     id,
			OpnameNumber: opname.OpnameNumber,
			WarehouseID:  opname.WarehouseID,
			Items:        adjustItems,
			PostedBy:     postedByStr,
			Notes:        fmt.Sprintf("Stock adjustment from opname %s", opname.OpnameNumber),
		}

		if err := u.inventoryUC.AdjustStockFromOpname(ctx, adjustReq); err != nil {
			return nil, fmt.Errorf("failed to create stock adjustments: %w", err)
		}
	}

	// 5. Update status to posted
	return u.updateStatus(ctx, id, models.StockOpnameStatusPosted, postedBy)
}

func (u *stockOpnameUsecase) updateStatus(ctx context.Context, id string, status models.StockOpnameStatus, userID *string) (*dto.StockOpnameResponse, error) {
	if err := u.repo.UpdateStatus(ctx, id, status, userID); err != nil {
		return nil, err
	}
	return u.GetByID(ctx, id)
}
