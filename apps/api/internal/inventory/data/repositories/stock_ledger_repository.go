package repositories

import (
	"context"
	"strings"

	"github.com/gilabs/gims/api/internal/inventory/data/models"
	"github.com/gilabs/gims/api/internal/inventory/domain/dto"
)

func (r *inventoryRepository) GetProductLedgers(ctx context.Context, productID string, req *dto.GetProductStockLedgersRequest) ([]models.StockLedger, int64, error) {
	items := make([]models.StockLedger, 0)
	var total int64

	query := r.DB(ctx).Model(&models.StockLedger{}).Where("product_id = ?", productID)

	if req.TransactionType != "" {
		query = query.Where("transaction_type = ?", strings.ToUpper(strings.TrimSpace(req.TransactionType)))
	}
	if req.ParsedDateFrom != nil {
		query = query.Where("DATE(created_at) >= ?", req.ParsedDateFrom.Format("2006-01-02"))
	}
	if req.ParsedDateTo != nil {
		query = query.Where("DATE(created_at) <= ?", req.ParsedDateTo.Format("2006-01-02"))
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (req.Page - 1) * req.Limit
	if err := query.
		Order("created_at DESC, transaction_id DESC, id DESC").
		Limit(req.Limit).
		Offset(offset).
		Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}
