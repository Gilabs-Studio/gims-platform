package repositories

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/stock_opname/data/models"
	"github.com/gilabs/gims/api/internal/stock_opname/domain/dto"
	"github.com/gilabs/gims/api/internal/stock_opname/domain/repository"
	"gorm.io/gorm"
)

type stockOpnameRepository struct {
	db *gorm.DB
}

func NewStockOpnameRepository(db *gorm.DB) repository.StockOpnameRepository {
	return &stockOpnameRepository{db: db}
}

func (r *stockOpnameRepository) Create(ctx context.Context, opname *models.StockOpname) error {
	return r.db.WithContext(ctx).Create(opname).Error
}

func (r *stockOpnameRepository) Update(ctx context.Context, opname *models.StockOpname) error {
	return r.db.WithContext(ctx).Save(opname).Error
}

func (r *stockOpnameRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.StockOpname{}, "id = ?", id).Error
}

func (r *stockOpnameRepository) FindByID(ctx context.Context, id string) (*models.StockOpname, error) {
	var opname models.StockOpname
	err := r.db.WithContext(ctx).
		Preload("Items").
		First(&opname, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &opname, nil
}

func (r *stockOpnameRepository) List(ctx context.Context, req *dto.ListStockOpnamesRequest) ([]models.StockOpname, int64, error) {
	var opnames []models.StockOpname
	var total int64

	query := r.db.WithContext(ctx).Model(&models.StockOpname{}).Preload("Warehouse").Preload("Items")

	// Apply scope-based data filtering (OWN/DIVISION/AREA/ALL)
	query = security.ApplyScopeFilter(query, ctx, security.DefaultScopeQueryOptions())

	if req.Search != "" {
		search := "%" + strings.ToLower(req.Search) + "%"
		query = query.Where("LOWER(opname_number) LIKE ? OR LOWER(description) LIKE ?", search, search)
	}

	if req.WarehouseID != "" {
		query = query.Where("warehouse_id = ?", req.WarehouseID)
	}

	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	if req.StartDate != "" {
		query = query.Where("date >= ?", req.StartDate)
	}

	if req.EndDate != "" {
		query = query.Where("date <= ?", req.EndDate)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (req.Page - 1) * req.PerPage
	err := query.Order("created_at DESC").
		Limit(req.PerPage).
		Offset(offset).
		Find(&opnames).Error

	return opnames, total, err
}

func (r *stockOpnameRepository) ReplaceItems(ctx context.Context, opnameID string, items []models.StockOpnameItem) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete existing items
		if err := tx.Where("stock_opname_id = ?", opnameID).Delete(&models.StockOpnameItem{}).Error; err != nil {
			return err
		}

		// Create new items
		if len(items) > 0 {
			if err := tx.Create(&items).Error; err != nil {
				return err
			}
		}

		// Update stats on Opname
		var totalVariance float64
		for _, item := range items {
			totalVariance += item.VarianceQty
		}

		if err := tx.Model(&models.StockOpname{}).Where("id = ?", opnameID).Updates(map[string]interface{}{
			"total_items":        len(items),
			"total_variance_qty": totalVariance,
		}).Error; err != nil {
			return err
		}

		return nil
	})
}

func (r *stockOpnameRepository) ListItems(ctx context.Context, opnameID string) ([]models.StockOpnameItem, error) {
	var items []models.StockOpnameItem
	err := r.db.WithContext(ctx).
		Where("stock_opname_id = ?", opnameID).
		Preload("Product").
		Find(&items).Error
	return items, err
}

func (r *stockOpnameRepository) UpdateStatus(ctx context.Context, id string, status models.StockOpnameStatus, userID *string) error {
	updates := map[string]interface{}{"status": status, "updated_at": apptime.Now()}
	if userID != nil {
		updates["updated_by"] = *userID
	}
	return r.db.WithContext(ctx).Model(&models.StockOpname{}).Where("id = ?", id).Updates(updates).Error
}

func (r *stockOpnameRepository) GetNextOpnameNumber(ctx context.Context) (string, error) {
	prefix := fmt.Sprintf("OP-%s-", apptime.Now().Format("200601"))
	var lastOpname models.StockOpname
	err := r.db.WithContext(ctx).
		Where("opname_number LIKE ?", prefix+"%").
		Order("opname_number DESC").
		First(&lastOpname).Error

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", err
	}

	seq := 1
	if err == nil {
		// Parse last number
		parts := strings.Split(lastOpname.OpnameNumber, "-")
		if len(parts) == 3 {
			var lastSeq int
			fmt.Sscanf(parts[2], "%d", &lastSeq)
			seq = lastSeq + 1
		}
	}

	return fmt.Sprintf("%s%04d", prefix, seq), nil
}
