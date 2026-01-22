package repositories

import (
	"context"

	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	"github.com/gilabs/crm-healthcare/api/internal/geographic/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/geographic/domain/dto"
	"gorm.io/gorm"
)

// VillageRepository defines the interface for village data access
type VillageRepository interface {
	FindByID(ctx context.Context, id string) (*models.Village, error)
	FindByCode(ctx context.Context, code string) (*models.Village, error)
	List(ctx context.Context, req *dto.ListVillagesRequest) ([]models.Village, int64, error)
	Create(ctx context.Context, v *models.Village) error
	Update(ctx context.Context, v *models.Village) error
	Delete(ctx context.Context, id string) error
}

type villageRepository struct {
	db *gorm.DB
}

// NewVillageRepository creates a new VillageRepository
func NewVillageRepository(db *gorm.DB) VillageRepository {
	return &villageRepository{db: db}
}

func (r *villageRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

func (r *villageRepository) FindByID(ctx context.Context, id string) (*models.Village, error) {
	var village models.Village
	err := r.getDB(ctx).
		Preload("District").
		Preload("District.City").
		Preload("District.City.Province").
		Preload("District.City.Province.Country").
		Where("id = ?", id).First(&village).Error
	if err != nil {
		return nil, err
	}
	return &village, nil
}

func (r *villageRepository) FindByCode(ctx context.Context, code string) (*models.Village, error) {
	var village models.Village
	err := r.getDB(ctx).
		Preload("District").
		Preload("District.City").
		Preload("District.City.Province").
		Preload("District.City.Province.Country").
		Where("code = ?", code).First(&village).Error
	if err != nil {
		return nil, err
	}
	return &village, nil
}

func (r *villageRepository) List(ctx context.Context, req *dto.ListVillagesRequest) ([]models.Village, int64, error) {
	var villages []models.Village
	var total int64

	query := r.getDB(ctx).Model(&models.Village{}).Preload("District").Preload("District.City")

	// Apply search filter
	if req.Search != "" {
		search := "%" + req.Search + "%"
		query = query.Where("villages.name ILIKE ? OR villages.code ILIKE ? OR villages.postal_code ILIKE ?", search, search, search)
	}

	// Apply district filter
	if req.DistrictID != "" {
		query = query.Where("villages.district_id = ?", req.DistrictID)
	}

	// Apply type filter
	if req.Type != "" {
		query = query.Where("villages.type = ?", req.Type)
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
	sortBy := "villages.updated_at"
	if req.SortBy != "" {
		sortBy = "villages." + req.SortBy
	}
	sortDir := "DESC"
	if req.SortDir == "asc" {
		sortDir = "ASC"
	}

	err := query.Order("is_active DESC, " + sortBy + " " + sortDir).Offset(offset).Limit(perPage).Find(&villages).Error
	if err != nil {
		return nil, 0, err
	}

	return villages, total, nil
}

func (r *villageRepository) Create(ctx context.Context, v *models.Village) error {
	return r.getDB(ctx).Create(v).Error
}

func (r *villageRepository) Update(ctx context.Context, v *models.Village) error {
	return r.getDB(ctx).Save(v).Error
}

func (r *villageRepository) Delete(ctx context.Context, id string) error {
	return r.getDB(ctx).Where("id = ?", id).Delete(&models.Village{}).Error
}
