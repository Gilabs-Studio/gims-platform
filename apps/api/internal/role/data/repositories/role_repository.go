package repositories

import (
	"context"

	"github.com/gilabs/crm-healthcare/api/internal/role/data/models"
	"gorm.io/gorm"
)

type RoleRepository interface {
	FindByID(ctx context.Context, id string) (*models.Role, error)
	FindByCode(ctx context.Context, code string) (*models.Role, error)
	List(ctx context.Context, page, limit int) ([]models.Role, int64, error)
	Create(ctx context.Context, ro *models.Role) error
	Update(ctx context.Context, ro *models.Role) error
	Delete(ctx context.Context, id string) error
	AssignPermissions(ctx context.Context, roleID string, permissionIDs []string) error
	GetPermissions(ctx context.Context, roleID string) ([]string, error)
	CountUsersByRoleID(ctx context.Context, roleID string) (int64, error)
	CountAdmins(ctx context.Context) (int64, error)
}

type roleRepository struct {
	db *gorm.DB
}

func NewRoleRepository(db *gorm.DB) RoleRepository {
	return &roleRepository{db: db}
}

func (r *roleRepository) FindByID(ctx context.Context, id string) (*models.Role, error) {
	var ro models.Role
	err := r.db.WithContext(ctx).Preload("Permissions").Where("id = ?", id).First(&ro).Error
	if err != nil {
		return nil, err
	}
	return &ro, nil
}

func (r *roleRepository) FindByCode(ctx context.Context, code string) (*models.Role, error) {
	var ro models.Role
	err := r.db.WithContext(ctx).Preload("Permissions").Where("code = ?", code).First(&ro).Error
	if err != nil {
		return nil, err
	}
	return &ro, nil
}

func (r *roleRepository) List(ctx context.Context, page, limit int) ([]models.Role, int64, error) {
	var roles []models.Role
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Role{})

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Preload("Permissions").
		Order("is_active DESC, updated_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&roles).Error

	if err != nil {
		return nil, 0, err
	}
	return roles, total, nil
}

func (r *roleRepository) Create(ctx context.Context, ro *models.Role) error {
	return r.db.WithContext(ctx).Create(ro).Error
}

func (r *roleRepository) Update(ctx context.Context, ro *models.Role) error {
	return r.db.WithContext(ctx).Save(ro).Error
}

func (r *roleRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.Role{}).Error
}

func (r *roleRepository) AssignPermissions(ctx context.Context, roleID string, permissionIDs []string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// First, clear existing permissions
		if err := tx.Exec("DELETE FROM role_permissions WHERE role_id = ?", roleID).Error; err != nil {
			return err
		}

		// Then assign new permissions
		if len(permissionIDs) > 0 {
			for _, permID := range permissionIDs {
				if err := tx.Exec(
					"INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
					roleID, permID,
				).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func (r *roleRepository) GetPermissions(ctx context.Context, roleID string) ([]string, error) {
	var permissionIDs []string
	err := r.db.WithContext(ctx).Table("role_permissions").
		Where("role_id = ?", roleID).
		Pluck("permission_id", &permissionIDs).Error
	if err != nil {
		return nil, err
	}
	return permissionIDs, nil
}

func (r *roleRepository) CountUsersByRoleID(ctx context.Context, roleID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Table("users").Where("role_id = ? AND deleted_at IS NULL", roleID).Count(&count).Error
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (r *roleRepository) CountAdmins(ctx context.Context) (int64, error) {
	var count int64
	// Count users with admin role (code = "admin")
	err := r.db.WithContext(ctx).Table("users").
		Joins("JOIN roles ON users.role_id = roles.id").
		Where("roles.code = ? AND users.deleted_at IS NULL AND roles.deleted_at IS NULL", "admin").
		Count(&count).Error
	if err != nil {
		return 0, err
	}
	return count, nil
}
