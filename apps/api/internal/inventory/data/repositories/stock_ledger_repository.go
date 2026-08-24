package repositories

import (
	"context"
	"strings"

	"github.com/gilabs/gims/api/internal/inventory/data/models"
	"github.com/gilabs/gims/api/internal/inventory/domain/dto"
	"gorm.io/gorm"
)

func (r *inventoryRepository) GetProductLedgers(ctx context.Context, productID string, req *dto.GetProductStockLedgersRequest) ([]models.StockLedger, int64, error) {
	items := make([]models.StockLedger, 0)

	trimmedProductID := strings.TrimSpace(productID)

	applyFilters := func(query *gorm.DB) *gorm.DB {
		if trimmedProductID != "" {
			query = query.Where("product_id = ?", trimmedProductID)
		}
		if req != nil {
			if req.TransactionType != "" {
				query = query.Where("UPPER(transaction_type) = ?", strings.ToUpper(strings.TrimSpace(req.TransactionType)))
			}
			if req.ParsedDateFrom != nil {
				query = query.Where("DATE(created_at) >= ?", req.ParsedDateFrom.Format("2006-01-02"))
			}
			if req.ParsedDateTo != nil {
				query = query.Where("DATE(created_at) <= ?", req.ParsedDateTo.Format("2006-01-02"))
			}
		}
		return query
	}

	countQuery := applyFilters(r.DB(ctx).Model(&models.StockLedger{}))
	var total int64
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if total == 0 {
		return []models.StockLedger{}, 0, nil
	}

	const MaxLimit = 1000
	limit := req.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}

	page := req.Page
	if page <= 0 {
		page = 1
	}

	offset := (page - 1) * limit
	dataQuery := applyFilters(r.DB(ctx).Model(&models.StockLedger{}))
	if err := dataQuery.
		Preload("Product").
		Order("created_at DESC, id DESC").
		Limit(limit).
		Offset(offset).
		Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

