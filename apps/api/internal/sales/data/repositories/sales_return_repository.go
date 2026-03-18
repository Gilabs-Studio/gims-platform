package repositories

import (
	"context"
	"strings"

	"github.com/gilabs/gims/api/internal/sales/data/models"
	"gorm.io/gorm"
)

type SalesReturnListParams struct {
	Search    string
	Status    string
	Action    string
	InvoiceID string
	SortBy    string
	SortDir   string
	Limit     int
	Offset    int
}

type SalesReturnRepository interface {
	List(ctx context.Context, params SalesReturnListParams) ([]*models.SalesReturn, int64, error)
	GetByID(ctx context.Context, id string) (*models.SalesReturn, error)
	Create(ctx context.Context, row *models.SalesReturn) error
}

type salesReturnRepository struct {
	db *gorm.DB
}

func NewSalesReturnRepository(db *gorm.DB) SalesReturnRepository {
	return &salesReturnRepository{db: db}
}

var salesReturnAllowedSort = map[string]string{
	"created_at": "sales_returns.created_at",
	"updated_at": "sales_returns.updated_at",
	"code":       "sales_returns.code",
}

func (r *salesReturnRepository) List(ctx context.Context, params SalesReturnListParams) ([]*models.SalesReturn, int64, error) {
	rows := make([]*models.SalesReturn, 0)
	var total int64

	q := r.db.WithContext(ctx).Model(&models.SalesReturn{}).Preload("Items")

	if s := strings.TrimSpace(params.Search); s != "" {
		like := "%" + s + "%"
		q = q.Where("sales_returns.code ILIKE ? OR sales_returns.reason ILIKE ?", like, like)
	}
	if s := strings.TrimSpace(params.Status); s != "" {
		q = q.Where("sales_returns.status = ?", strings.ToUpper(s))
	}
	if a := strings.TrimSpace(params.Action); a != "" {
		q = q.Where("sales_returns.action = ?", strings.ToUpper(a))
	}
	if inv := strings.TrimSpace(params.InvoiceID); inv != "" {
		q = q.Where("sales_returns.invoice_id = ?", inv)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := salesReturnAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = salesReturnAllowedSort["created_at"]
	}
	sortDir := strings.ToLower(strings.TrimSpace(params.SortDir))
	if sortDir != "asc" {
		sortDir = "desc"
	}
	q = q.Order(sortCol + " " + sortDir)

	if params.Limit > 0 {
		q = q.Limit(params.Limit)
	}
	if params.Offset > 0 {
		q = q.Offset(params.Offset)
	}

	if err := q.Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *salesReturnRepository) GetByID(ctx context.Context, id string) (*models.SalesReturn, error) {
	var row models.SalesReturn
	if err := r.db.WithContext(ctx).Preload("Items").First(&row, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *salesReturnRepository) Create(ctx context.Context, row *models.SalesReturn) error {
	return r.db.WithContext(ctx).Create(row).Error
}
