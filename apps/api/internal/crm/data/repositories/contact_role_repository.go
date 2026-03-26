package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/crm/data/models"
	"gorm.io/gorm"
)

// ContactRoleRepository defines the interface for contact role data access
type ContactRoleRepository interface {
	Create(ctx context.Context, role *models.ContactRole) error
	FindByID(ctx context.Context, id string) (*models.ContactRole, error)
	List(ctx context.Context, params ListParams) ([]models.ContactRole, int64, error)
	Update(ctx context.Context, role *models.ContactRole) error
	Delete(ctx context.Context, id string) error
}

type contactRoleRepository struct {
	db *gorm.DB
}

// NewContactRoleRepository creates a new contact role repository
func NewContactRoleRepository(db *gorm.DB) ContactRoleRepository {
	return &contactRoleRepository{db: db}
}

func (r *contactRoleRepository) Create(ctx context.Context, role *models.ContactRole) error {
	return r.db.WithContext(ctx).Create(role).Error
}

func (r *contactRoleRepository) FindByID(ctx context.Context, id string) (*models.ContactRole, error) {
	var role models.ContactRole
	err := r.db.WithContext(ctx).First(&role, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *contactRoleRepository) List(ctx context.Context, params ListParams) ([]models.ContactRole, int64, error) {
	var roles []models.ContactRole
	var total int64

	query := r.db.WithContext(ctx).Model(&models.ContactRole{})

	if params.Search != "" {
		search := params.Search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ? OR description ILIKE ?", search, search, search)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if params.SortBy != "" {
		// Quote column name to handle reserved keywords
		quotedColumn := "\"" + params.SortBy + "\""
		if params.SortDir == "desc" {
			quotedColumn += " DESC"
		} else {
			quotedColumn += " ASC"
		}
		query = query.Order(quotedColumn)
	} else {
		query = query.Order("name ASC")
	}

	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	if err := query.Find(&roles).Error; err != nil {
		return nil, 0, err
	}

	return roles, total, nil
}

func (r *contactRoleRepository) Update(ctx context.Context, role *models.ContactRole) error {
	return r.db.WithContext(ctx).Save(role).Error
}

func (r *contactRoleRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.ContactRole{}, "id = ?", id).Error
}
