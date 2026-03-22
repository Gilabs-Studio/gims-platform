package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/crm/data/models"
	"gorm.io/gorm"
)

// LeadSourceRepository defines the interface for lead source data access
type LeadSourceRepository interface {
	Create(ctx context.Context, source *models.LeadSource) error
	FindByID(ctx context.Context, id string) (*models.LeadSource, error)
	List(ctx context.Context, params ListParams) ([]models.LeadSource, int64, error)
	Update(ctx context.Context, source *models.LeadSource) error
	Delete(ctx context.Context, id string) error
	GetMaxOrder(ctx context.Context) (int, error)
}

type leadSourceRepository struct {
	db *gorm.DB
}

// NewLeadSourceRepository creates a new lead source repository
func NewLeadSourceRepository(db *gorm.DB) LeadSourceRepository {
	return &leadSourceRepository{db: db}
}

func (r *leadSourceRepository) Create(ctx context.Context, source *models.LeadSource) error {
	return r.db.WithContext(ctx).Create(source).Error
}

func (r *leadSourceRepository) FindByID(ctx context.Context, id string) (*models.LeadSource, error) {
	var source models.LeadSource
	err := r.db.WithContext(ctx).First(&source, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &source, nil
}

func (r *leadSourceRepository) List(ctx context.Context, params ListParams) ([]models.LeadSource, int64, error) {
	var sources []models.LeadSource
	var total int64

	query := r.db.WithContext(ctx).Model(&models.LeadSource{})

	if params.Search != "" {
		search := params.Search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ? OR description ILIKE ?", search, search, search)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if params.SortBy != "" {
		order := params.SortBy
		if params.SortDir == "desc" {
			order += " DESC"
		} else {
			order += " ASC"
		}
		query = query.Order(order)
	} else {
		query = query.Order("\"order\" ASC, name ASC")
	}

	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	if err := query.Find(&sources).Error; err != nil {
		return nil, 0, err
	}

	return sources, total, nil
}

func (r *leadSourceRepository) Update(ctx context.Context, source *models.LeadSource) error {
	return r.db.WithContext(ctx).Save(source).Error
}

func (r *leadSourceRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.LeadSource{}, "id = ?", id).Error
}

func (r *leadSourceRepository) GetMaxOrder(ctx context.Context) (int, error) {
	var maxOrder int
	err := r.db.WithContext(ctx).
		Model(&models.LeadSource{}).
		Select(`COALESCE(MAX("order"), 0)`).
		Scan(&maxOrder).Error
	if err != nil {
		return 0, err
	}
	return maxOrder, nil
}
