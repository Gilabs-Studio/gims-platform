package repositories

import (
	"context"
	"strings"

	"github.com/gilabs/gims/api/internal/purchase/data/models"
	"gorm.io/gorm"
)

type PurchaseRequisitionRepository interface {
	List(ctx context.Context, params PurchaseRequisitionListParams) ([]*models.PurchaseRequisition, int64, error)
}

type PurchaseRequisitionListParams struct {
	Search  string
	SortBy  string
	SortDir string
	Limit   int
	Offset  int
}

type purchaseRequisitionRepository struct {
	db *gorm.DB
}

func NewPurchaseRequisitionRepository(db *gorm.DB) PurchaseRequisitionRepository {
	return &purchaseRequisitionRepository{db: db}
}

func (r *purchaseRequisitionRepository) List(ctx context.Context, params PurchaseRequisitionListParams) ([]*models.PurchaseRequisition, int64, error) {
	var results []*models.PurchaseRequisition
	var total int64

	baseQuery := r.db.WithContext(ctx).Model(&models.PurchaseRequisition{})

	if params.Search != "" {
		pattern := "%" + params.Search + "%"
		baseQuery = baseQuery.Where(
			"code ILIKE ? OR notes ILIKE ? OR request_date ILIKE ?",
			pattern,
			pattern,
			pattern,
		)
	}

	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	query := r.db.WithContext(ctx).Model(&models.PurchaseRequisition{})
	if params.Search != "" {
		pattern := "%" + params.Search + "%"
		query = query.Where(
			"code ILIKE ? OR notes ILIKE ? OR request_date ILIKE ?",
			pattern,
			pattern,
			pattern,
		)
	}

	sortField := normalizePRSortField(params.SortBy)
	sortDir := strings.ToLower(params.SortDir)
	if sortDir != "asc" {
		sortDir = "desc"
	}
	query = query.Order(sortField + " " + sortDir)

	if params.Limit > 0 {
		query = query.Limit(params.Limit).Offset(params.Offset)
	}

	// N+1 safe: preload relations in bulk
	query = query.
		Preload("Supplier").
		Preload("PaymentTerms").
		Preload("BusinessUnit").
		Preload("Employee.User")

	if err := query.Find(&results).Error; err != nil {
		return nil, 0, err
	}

	return results, total, nil
}

func normalizePRSortField(raw string) string {
	switch raw {
	case "code":
		return "code"
	case "request_date":
		return "request_date"
	case "status":
		return "status"
	case "total_amount":
		return "total_amount"
	case "created_at":
		return "created_at"
	case "updated_at":
		return "updated_at"
	default:
		return "created_at"
	}
}
