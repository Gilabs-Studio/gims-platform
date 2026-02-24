package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/gilabs/gims/api/internal/organization/domain/dto"
	"gorm.io/gorm"
)

// CompanyRepository defines the interface for company data access
type CompanyRepository interface {
	FindByID(ctx context.Context, id string) (*models.Company, error)
	FindByIDWithVillage(ctx context.Context, id string) (*models.Company, error)
	List(ctx context.Context, req *dto.ListCompaniesRequest) ([]models.Company, int64, error)
	Create(ctx context.Context, c *models.Company) error
	Update(ctx context.Context, c *models.Company) error
	Delete(ctx context.Context, id string) error
}

type companyRepository struct {
	db *gorm.DB
}

// NewCompanyRepository creates a new CompanyRepository
func NewCompanyRepository(db *gorm.DB) CompanyRepository {
	return &companyRepository{db: db}
}

func (r *companyRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

func (r *companyRepository) FindByID(ctx context.Context, id string) (*models.Company, error) {
	var company models.Company
	err := r.getDB(ctx).Where("id = ?", id).First(&company).Error
	if err != nil {
		return nil, err
	}
	return &company, nil
}

func (r *companyRepository) FindByIDWithVillage(ctx context.Context, id string) (*models.Company, error) {
	var company models.Company
	err := r.getDB(ctx).
		Preload("Province").
		Preload("City").
		Preload("District").
		Preload("Village").
		Preload("Village.District").
		Preload("Village.District.City").
		Preload("Village.District.City.Province").
		Preload("Village.District.City.Province.Country").
		Where("id = ?", id).
		First(&company).Error
	if err != nil {
		return nil, err
	}
	return &company, nil
}

func (r *companyRepository) List(ctx context.Context, req *dto.ListCompaniesRequest) ([]models.Company, int64, error) {
	var companies []models.Company
	var total int64

	query := r.getDB(ctx).Model(&models.Company{})

	// Apply search filter
	if req.Search != "" {
		search := "%" + req.Search + "%"
		query = query.Where("name ILIKE ? OR email ILIKE ? OR npwp ILIKE ?", search, search, search)
	}

	// Apply status filter
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	// Apply is_active filter when provided
	if req.IsActive != nil {
		query = query.Where("is_active = ?", *req.IsActive)
	}

	// Apply village filter
	if req.VillageID != "" {
		query = query.Where("village_id = ?", req.VillageID)
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
		Preload("Province").
		Preload("City").
		Preload("District").
		Preload("Village").
		Where(query).
		Order("is_active DESC, " + sortBy + " " + sortDir).
		Offset(offset).
		Limit(perPage).
		Find(&companies).Error
	if err != nil {
		return nil, 0, err
	}

	return companies, total, nil
}

func (r *companyRepository) Create(ctx context.Context, c *models.Company) error {
	return r.getDB(ctx).Create(c).Error
}

func (r *companyRepository) Update(ctx context.Context, c *models.Company) error {
	return r.getDB(ctx).Save(c).Error
}

func (r *companyRepository) Delete(ctx context.Context, id string) error {
	return r.getDB(ctx).Where("id = ?", id).Delete(&models.Company{}).Error
}
