package repositories

import (
	"context"

	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	"github.com/gilabs/crm-healthcare/api/internal/organization/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/organization/domain/dto"
	"gorm.io/gorm"
)

// AreaSupervisorRepository defines the interface for area supervisor data access
type AreaSupervisorRepository interface {
	FindByID(ctx context.Context, id string) (*models.AreaSupervisor, error)
	FindByIDWithAreas(ctx context.Context, id string) (*models.AreaSupervisor, error)
	List(ctx context.Context, req *dto.ListAreaSupervisorsRequest) ([]models.AreaSupervisor, int64, error)
	Create(ctx context.Context, a *models.AreaSupervisor) error
	Update(ctx context.Context, a *models.AreaSupervisor) error
	Delete(ctx context.Context, id string) error
	// Area assignment methods
	AssignAreas(ctx context.Context, supervisorID string, areaIDs []string) error
	RemoveAllAreas(ctx context.Context, supervisorID string) error
	GetAssignedAreas(ctx context.Context, supervisorID string) ([]models.AreaSupervisorArea, error)
}

type areaSupervisorRepository struct {
	db *gorm.DB
}

// NewAreaSupervisorRepository creates a new AreaSupervisorRepository
func NewAreaSupervisorRepository(db *gorm.DB) AreaSupervisorRepository {
	return &areaSupervisorRepository{db: db}
}

func (r *areaSupervisorRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

func (r *areaSupervisorRepository) FindByID(ctx context.Context, id string) (*models.AreaSupervisor, error) {
	var supervisor models.AreaSupervisor
	err := r.getDB(ctx).Where("id = ?", id).First(&supervisor).Error
	if err != nil {
		return nil, err
	}
	return &supervisor, nil
}

func (r *areaSupervisorRepository) FindByIDWithAreas(ctx context.Context, id string) (*models.AreaSupervisor, error) {
	var supervisor models.AreaSupervisor
	err := r.getDB(ctx).
		Preload("Areas").
		Preload("Areas.Area").
		Where("id = ?", id).
		First(&supervisor).Error
	if err != nil {
		return nil, err
	}
	return &supervisor, nil
}

func (r *areaSupervisorRepository) List(ctx context.Context, req *dto.ListAreaSupervisorsRequest) ([]models.AreaSupervisor, int64, error) {
	var supervisors []models.AreaSupervisor
	var total int64

	query := r.getDB(ctx).Model(&models.AreaSupervisor{})

	// Apply search filter
	if req.Search != "" {
		search := "%" + req.Search + "%"
		query = query.Where("name ILIKE ? OR email ILIKE ?", search, search)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	// Apply sorting
	sortBy := "updated_at"
	if req.SortBy != "" {
		sortBy = req.SortBy
	}
	sortDir := "DESC"
	if req.SortDir == "asc" {
		sortDir = "ASC"
	}

	err := r.getDB(ctx).
		Preload("Areas").
		Preload("Areas.Area").
		Order("is_active DESC, " + sortBy + " " + sortDir).
		Offset(offset).
		Limit(perPage).
		Find(&supervisors).Error
	if err != nil {
		return nil, 0, err
	}

	return supervisors, total, nil
}

func (r *areaSupervisorRepository) Create(ctx context.Context, a *models.AreaSupervisor) error {
	return r.getDB(ctx).Create(a).Error
}

func (r *areaSupervisorRepository) Update(ctx context.Context, a *models.AreaSupervisor) error {
	return r.getDB(ctx).Save(a).Error
}

func (r *areaSupervisorRepository) Delete(ctx context.Context, id string) error {
	// Delete area assignments first
	if err := r.RemoveAllAreas(ctx, id); err != nil {
		return err
	}
	return r.getDB(ctx).Where("id = ?", id).Delete(&models.AreaSupervisor{}).Error
}

func (r *areaSupervisorRepository) AssignAreas(ctx context.Context, supervisorID string, areaIDs []string) error {
	// Remove existing assignments
	if err := r.RemoveAllAreas(ctx, supervisorID); err != nil {
		return err
	}

	// Create new assignments
	for _, areaID := range areaIDs {
		assignment := &models.AreaSupervisorArea{
			AreaSupervisorID: supervisorID,
			AreaID:           areaID,
		}
		if err := r.getDB(ctx).Create(assignment).Error; err != nil {
			return err
		}
	}

	return nil
}

func (r *areaSupervisorRepository) RemoveAllAreas(ctx context.Context, supervisorID string) error {
	return r.getDB(ctx).Where("area_supervisor_id = ?", supervisorID).Delete(&models.AreaSupervisorArea{}).Error
}

func (r *areaSupervisorRepository) GetAssignedAreas(ctx context.Context, supervisorID string) ([]models.AreaSupervisorArea, error) {
	var assignments []models.AreaSupervisorArea
	err := r.getDB(ctx).
		Preload("Area").
		Where("area_supervisor_id = ?", supervisorID).
		Find(&assignments).Error
	if err != nil {
		return nil, err
	}
	return assignments, nil
}
