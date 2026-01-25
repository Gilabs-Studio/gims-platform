package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/user/data/models"
	"github.com/gilabs/gims/api/internal/user/domain/dto"
	"gorm.io/gorm"
)

type UserRepository interface {
	FindByID(ctx context.Context, id string) (*models.User, error)
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	List(ctx context.Context, req *dto.ListUsersRequest) ([]models.User, int64, error)
	Create(ctx context.Context, u *models.User) error
	Update(ctx context.Context, u *models.User) error
	Delete(ctx context.Context, id string) error
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	var u models.User
	err := r.getDB(ctx).Preload("Role").Preload("Role.Permissions").Where("id = ?", id).First(&u).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var u models.User
	err := r.getDB(ctx).Preload("Role").Preload("Role.Permissions").Where("email = ?", email).First(&u).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) List(ctx context.Context, req *dto.ListUsersRequest) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	query := r.getDB(ctx).Model(&models.User{}).Preload("Role").Preload("Role.Permissions")

	// Apply filters
	if req.Search != "" {
		search := req.Search + "%" // Prefix search for better performance with GIN index
		// Search across name, email, and role name
		query = query.Where(
			"users.name ILIKE ? OR users.email ILIKE ? OR EXISTS (SELECT 1 FROM roles WHERE roles.id = users.role_id AND roles.name ILIKE ?)",
			search, search, search,
		)
	}

	if req.Status != "" {
		query = query.Where("users.status = ?", req.Status)
	}

	if req.RoleID != "" {
		query = query.Where("users.role_id = ?", req.RoleID)
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

	// Fetch data - Order by updated_at DESC so recently updated items appear first
	err := query.Order("users.updated_at DESC").Offset(offset).Limit(perPage).Find(&users).Error
	if err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *userRepository) Create(ctx context.Context, u *models.User) error {
	return r.getDB(ctx).Create(u).Error
}

func (r *userRepository) Update(ctx context.Context, u *models.User) error {
	return r.getDB(ctx).Save(u).Error
}

func (r *userRepository) Delete(ctx context.Context, id string) error {
	return r.getDB(ctx).Where("id = ?", id).Delete(&models.User{}).Error
}
