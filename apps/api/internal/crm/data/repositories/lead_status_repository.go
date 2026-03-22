package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/crm/data/models"
	"gorm.io/gorm"
)

// LeadStatusRepository defines the interface for lead status data access
type LeadStatusRepository interface {
	Create(ctx context.Context, status *models.LeadStatus) error
	FindByID(ctx context.Context, id string) (*models.LeadStatus, error)
	List(ctx context.Context, params ListParams) ([]models.LeadStatus, int64, error)
	Update(ctx context.Context, status *models.LeadStatus) error
	Delete(ctx context.Context, id string) error
	FindDefault(ctx context.Context) (*models.LeadStatus, error)
	FindConverted(ctx context.Context) (*models.LeadStatus, error)
	GetMaxOrder(ctx context.Context) (int, error)
}

type leadStatusRepository struct {
	db *gorm.DB
}

// NewLeadStatusRepository creates a new lead status repository
func NewLeadStatusRepository(db *gorm.DB) LeadStatusRepository {
	return &leadStatusRepository{db: db}
}

func (r *leadStatusRepository) Create(ctx context.Context, status *models.LeadStatus) error {
	return r.db.WithContext(ctx).Create(status).Error
}

func (r *leadStatusRepository) FindByID(ctx context.Context, id string) (*models.LeadStatus, error) {
	var status models.LeadStatus
	err := r.db.WithContext(ctx).First(&status, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &status, nil
}

func (r *leadStatusRepository) List(ctx context.Context, params ListParams) ([]models.LeadStatus, int64, error) {
	var statuses []models.LeadStatus
	var total int64

	query := r.db.WithContext(ctx).Model(&models.LeadStatus{})

	if params.Search != "" {
		search := params.Search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ? OR description ILIKE ?", search, search, search)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if params.SortBy != "" {
		// Quote column name to handle reserved keywords like 'order'
		quotedColumn := "\"" + params.SortBy + "\""
		if params.SortDir == "desc" {
			quotedColumn += " DESC"
		} else {
			quotedColumn += " ASC"
		}
		query = query.Order(quotedColumn)
	} else {
		query = query.Order("\"order\" ASC, name ASC")
	}

	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	if err := query.Find(&statuses).Error; err != nil {
		return nil, 0, err
	}

	return statuses, total, nil
}

func (r *leadStatusRepository) Update(ctx context.Context, status *models.LeadStatus) error {
	return r.db.WithContext(ctx).Save(status).Error
}

func (r *leadStatusRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.LeadStatus{}, "id = ?", id).Error
}

func (r *leadStatusRepository) FindDefault(ctx context.Context) (*models.LeadStatus, error) {
	var status models.LeadStatus
	err := r.db.WithContext(ctx).Where("is_default = ?", true).First(&status).Error
	if err != nil {
		return nil, err
	}
	return &status, nil
}

func (r *leadStatusRepository) FindConverted(ctx context.Context) (*models.LeadStatus, error) {
	var status models.LeadStatus
	err := r.db.WithContext(ctx).Where("is_converted = ?", true).First(&status).Error
	if err != nil {
		return nil, err
	}
	return &status, nil
}

func (r *leadStatusRepository) GetMaxOrder(ctx context.Context) (int, error) {
	var maxOrder int
	err := r.db.WithContext(ctx).
		Model(&models.LeadStatus{}).
		Select(`COALESCE(MAX("order"), 0)`).
		Scan(&maxOrder).Error
	if err != nil {
		return 0, err
	}
	return maxOrder, nil
}
