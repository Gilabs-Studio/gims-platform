package repositories

import (
	"context"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/purchase/data/models"
	"gorm.io/gorm"
)

type PurchaseReturnListParams struct {
	Search         string
	Status         string
	Action         string
	GoodsReceiptID string
	SortBy         string
	SortDir        string
	Limit          int
	Offset         int
}

type PurchaseReturnRepository interface {
	List(ctx context.Context, params PurchaseReturnListParams) ([]*models.PurchaseReturn, int64, error)
	GetByID(ctx context.Context, id string) (*models.PurchaseReturn, error)
	Create(ctx context.Context, row *models.PurchaseReturn) error
	UpdateStatus(ctx context.Context, id string, status models.PurchaseReturnStatus) error
	Delete(ctx context.Context, id string) error
}

type purchaseReturnRepository struct {
	db *gorm.DB
}

func NewPurchaseReturnRepository(db *gorm.DB) PurchaseReturnRepository {
	return &purchaseReturnRepository{db: db}
}

var purchaseReturnAllowedSort = map[string]string{
	"created_at": "purchase_returns.created_at",
	"updated_at": "purchase_returns.updated_at",
	"code":       "purchase_returns.code",
}

const purchaseReturnIDFilter = "id = ?"

func (r *purchaseReturnRepository) List(ctx context.Context, params PurchaseReturnListParams) ([]*models.PurchaseReturn, int64, error) {
	rows := make([]*models.PurchaseReturn, 0)
	var total int64

	q := r.db.WithContext(ctx).Model(&models.PurchaseReturn{}).Preload("Items")
	q = security.ApplyScopeFilter(q, ctx, security.PurchaseScopeQueryOptions())

	if s := strings.TrimSpace(params.Search); s != "" {
		like := "%" + s + "%"
		q = q.Joins("LEFT JOIN suppliers ON suppliers.id = purchase_returns.supplier_id")
		q = q.Where("suppliers.name ILIKE ? OR purchase_returns.code ILIKE ? OR purchase_returns.reason ILIKE ?", like, like, like)
	}
	if s := strings.TrimSpace(params.Status); s != "" {
		q = q.Where("purchase_returns.status = ?", strings.ToUpper(s))
	}
	if a := strings.TrimSpace(params.Action); a != "" {
		q = q.Where("purchase_returns.action = ?", strings.ToUpper(a))
	}
	if gr := strings.TrimSpace(params.GoodsReceiptID); gr != "" {
		q = q.Where("purchase_returns.goods_receipt_id = ?", gr)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := purchaseReturnAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = purchaseReturnAllowedSort["created_at"]
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

func (r *purchaseReturnRepository) GetByID(ctx context.Context, id string) (*models.PurchaseReturn, error) {
	var row models.PurchaseReturn
	if err := r.db.WithContext(ctx).Preload("Items").First(&row, purchaseReturnIDFilter, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *purchaseReturnRepository) Create(ctx context.Context, row *models.PurchaseReturn) error {
	return r.db.WithContext(ctx).Create(row).Error
}

func (r *purchaseReturnRepository) UpdateStatus(ctx context.Context, id string, status models.PurchaseReturnStatus) error {
	return r.db.WithContext(ctx).
		Model(&models.PurchaseReturn{}).
		Where(purchaseReturnIDFilter, id).
		Update("status", status).Error
}

func (r *purchaseReturnRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.PurchaseReturn{}, purchaseReturnIDFilter, id).Error
}
