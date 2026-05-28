package repositories

import (
	"context"
	"sync"
	"time"

	"github.com/gilabs/gims/api/internal/permission/data/models"
	"github.com/gilabs/gims/api/internal/permission/domain/dto"
	"gorm.io/gorm"
)

type PermissionRepository interface {
	FindByID(ctx context.Context, id string) (*models.Permission, error)
	FindByCode(ctx context.Context, code string) (*models.Permission, error)
	List(ctx context.Context) ([]models.Permission, error)
	ListPaginated(ctx context.Context, page, limit int, search string) ([]models.Permission, int64, error)
	Create(ctx context.Context, p *models.Permission) error
	Update(ctx context.Context, p *models.Permission) error
	Delete(ctx context.Context, id string) error
	GetByMenuID(ctx context.Context, menuID string) ([]models.Permission, error)
	GetByRoleID(ctx context.Context, roleID string) ([]models.Permission, error)
	GetUserPermissions(ctx context.Context, userID string) (*dto.GetUserPermissionsResponse, error)
	GetRootMenusWithChildren(ctx context.Context) ([]models.Menu, error)
}

type permissionRepository struct {
	db                  *gorm.DB
	cacheMutex          sync.RWMutex
	cachedList          []models.Permission
	cachedListExpiry    time.Time
	cachedRawList       []models.Permission
	cachedRawListExpiry time.Time
	cachedMenus         []models.Menu
	cachedMenusExpiry   time.Time
}

const (
	preloadMenuParent = "Menu.Parent"
	whereID = "id = ?"
	orderAsc = "\"order\" ASC"
)

func NewPermissionRepository(db *gorm.DB) PermissionRepository {
	return &permissionRepository{db: db}
}

func (r *permissionRepository) clearCache() {
	r.cacheMutex.Lock()
	defer r.cacheMutex.Unlock()
	r.cachedList = nil
	r.cachedRawList = nil
	r.cachedMenus = nil
}

func (r *permissionRepository) getAllRawPermissions(ctx context.Context) ([]models.Permission, error) {
	r.cacheMutex.RLock()
	if r.cachedRawList != nil && time.Now().Before(r.cachedRawListExpiry) {
		defer r.cacheMutex.RUnlock()
		return r.cachedRawList, nil
	}
	r.cacheMutex.RUnlock()

	r.cacheMutex.Lock()
	defer r.cacheMutex.Unlock()

	if r.cachedRawList != nil && time.Now().Before(r.cachedRawListExpiry) {
		return r.cachedRawList, nil
	}

	var permissions []models.Permission
	if err := r.db.WithContext(ctx).Find(&permissions).Error; err != nil {
		return nil, err
	}

	return permissions, nil
}

func (r *permissionRepository) getHierarchicalMenus(ctx context.Context) ([]models.Menu, error) {
	r.cacheMutex.RLock()
	if r.cachedMenus != nil && time.Now().Before(r.cachedMenusExpiry) {
		defer r.cacheMutex.RUnlock()
		return r.cachedMenus, nil
	}
	r.cacheMutex.RUnlock()

	r.cacheMutex.Lock()
	defer r.cacheMutex.Unlock()

	if r.cachedMenus != nil && time.Now().Before(r.cachedMenusExpiry) {
		return r.cachedMenus, nil
	}

	var menus []models.Menu
	err := r.db.WithContext(ctx).Where("parent_id IS NULL").
		Preload("Children", func(db *gorm.DB) *gorm.DB {
			return db.Order(orderAsc)
		}).
		Preload("Children.Children", func(db *gorm.DB) *gorm.DB {
			return db.Order(orderAsc)
		}).
		Preload("Children.Children.Children", func(db *gorm.DB) *gorm.DB {
			return db.Order(orderAsc)
		}).
		Order(orderAsc).
		Find(&menus).Error
	if err != nil {
		return nil, err
	}

	r.cachedMenus = menus
	r.cachedMenusExpiry = time.Now().Add(5 * time.Minute)

	return menus, nil
}

func (r *permissionRepository) FindByID(ctx context.Context, id string) (*models.Permission, error) {
	var p models.Permission
	err := r.db.WithContext(ctx).
		Preload("Menu").
		Preload(preloadMenuParent).
		Where(whereID, id).
		First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *permissionRepository) FindByCode(ctx context.Context, code string) (*models.Permission, error) {
	var p models.Permission
	err := r.db.WithContext(ctx).
		Preload("Menu").
		Preload(preloadMenuParent).
		Where("code = ?", code).
		First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *permissionRepository) List(ctx context.Context) ([]models.Permission, error) {
	r.cacheMutex.RLock()
	if r.cachedList != nil && time.Now().Before(r.cachedListExpiry) {
		defer r.cacheMutex.RUnlock()
		return r.cachedList, nil
	}
	r.cacheMutex.RUnlock()

	r.cacheMutex.Lock()
	defer r.cacheMutex.Unlock()

	if r.cachedList != nil && time.Now().Before(r.cachedListExpiry) {
		return r.cachedList, nil
	}

	var permissions []models.Permission
	err := r.db.WithContext(ctx).
		Preload("Menu", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, name, icon, url")
		}).
		Order("updated_at DESC").
		Find(&permissions).Error
	if err != nil {
		return nil, err
	}

	r.cachedList = permissions
	r.cachedListExpiry = time.Now().Add(5 * time.Minute)

	return permissions, nil
}

func (r *permissionRepository) GetByMenuID(ctx context.Context, menuID string) ([]models.Permission, error) {
	var permissions []models.Permission
	err := r.db.WithContext(ctx).Where("menu_id = ?", menuID).Find(&permissions).Error
	if err != nil {
		return nil, err
	}
	return permissions, nil
}

func (r *permissionRepository) GetByRoleID(ctx context.Context, roleID string) ([]models.Permission, error) {
	var permissions []models.Permission
	err := r.db.WithContext(ctx).Table("permissions").
		Joins("INNER JOIN role_permissions ON permissions.id = role_permissions.permission_id").
		Where("role_permissions.role_id = ?", roleID).
		Find(&permissions).Error
	if err != nil {
		return nil, err
	}
	return permissions, nil
}

func (r *permissionRepository) GetUserPermissions(ctx context.Context, userID string) (*dto.GetUserPermissionsResponse, error) {
	// Get user's role
	var roleID string
	var roleCode string
	err := r.db.WithContext(ctx).Table("users").Where(whereID, userID).Pluck("role_id", &roleID).Error
	if err != nil {
		return nil, err
	}

	// Get role code to check if user is admin
	err = r.db.WithContext(ctx).Table("roles").Where(whereID, roleID).Pluck("code", &roleCode).Error
	if err != nil {
		return nil, err
	}

	// Check if user is admin - admin has ALL permissions
	isAdmin := roleCode == "admin"

	// Fetch all permissions once from cache (or fresh from DB if expired)
	allPermissions, err := r.getAllRawPermissions(ctx)
	if err != nil {
		return nil, err
	}

	// Create a map of permission IDs for quick lookup
	permissionMap := make(map[string]bool)

	if isAdmin {
		// Admin: Use the preloaded/cached allPermissions and set them all to TRUE
		for _, p := range allPermissions {
			permissionMap[p.ID] = true
		}
	} else {
		// Non-admin: Get permissions for the role
		permissions, err := r.GetByRoleID(ctx, roleID)
		if err != nil {
			return nil, err
		}
		for _, p := range permissions {
			permissionMap[p.ID] = true
		}
	}

	// Get all menus with hierarchy (recursive preload, cached)
	menus, err := r.getHierarchicalMenus(ctx)
	if err != nil {
		return nil, err
	}

	permissionsByMenu := make(map[string][]models.Permission)
	for _, p := range allPermissions {
		if p.MenuID != nil {
			permissionsByMenu[*p.MenuID] = append(permissionsByMenu[*p.MenuID], p)
		}
	}

	// Build hierarchical response
	result := &dto.GetUserPermissionsResponse{
		Menus: make([]dto.MenuWithActionsResponse, 0),
	}

	for _, menu := range menus {
		menuResp := r.buildMenuWithActions(menu, permissionMap, isAdmin, permissionsByMenu)
		result.Menus = append(result.Menus, *menuResp)
	}

	return result, nil
}

func (r *permissionRepository) buildMenuWithActions(menu models.Menu, permissionMap map[string]bool, isAdmin bool, permissionsByMenu map[string][]models.Permission) *dto.MenuWithActionsResponse {
	// Get permissions for this menu from memory map
	menuPermissions := permissionsByMenu[menu.ID]

	// Build actions
	actions := make([]dto.ActionResponse, 0)
	for _, p := range menuPermissions {
		// Admin always has access to all actions
		access := isAdmin || permissionMap[p.ID]
		actions = append(actions, dto.ActionResponse{
			ID:     p.ID,
			Code:   p.Code,
			Name:   p.Name,
			Action: p.Action,
			Access: access,
		})
	}

	// Build menu response
	menuResp := &dto.MenuWithActionsResponse{
		ID:       menu.ID,
		Name:     menu.Name,
		Icon:     menu.Icon,
		URL:      menu.URL,
		Actions:  actions,
		Children: make([]dto.MenuWithActionsResponse, 0),
	}

	// Recursively build children
	if len(menu.Children) > 0 {
		for _, child := range menu.Children {
			childResp := r.buildMenuWithActions(child, permissionMap, isAdmin, permissionsByMenu)
			menuResp.Children = append(menuResp.Children, *childResp)
		}
	}

	return menuResp
}

func (r *permissionRepository) ListPaginated(ctx context.Context, page, limit int, search string) ([]models.Permission, int64, error) {
	var permissions []models.Permission
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Permission{})
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ? OR resource ILIKE ?", like, like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.
		Preload("Menu").
		Preload(preloadMenuParent).
		Order("updated_at DESC").
		Offset(offset).Limit(limit).
		Find(&permissions).Error
	return permissions, total, err
}

func (r *permissionRepository) Create(ctx context.Context, p *models.Permission) error {
	err := r.db.WithContext(ctx).Create(p).Error
	if err == nil {
		r.clearCache()
	}
	return err
}

func (r *permissionRepository) Update(ctx context.Context, p *models.Permission) error {
	err := r.db.WithContext(ctx).Save(p).Error
	if err == nil {
		r.clearCache()
	}
	return err
}

func (r *permissionRepository) Delete(ctx context.Context, id string) error {
	err := r.db.WithContext(ctx).Where(whereID, id).Delete(&models.Permission{}).Error
	if err == nil {
		r.clearCache()
	}
	return err
}

func (r *permissionRepository) GetRootMenusWithChildren(ctx context.Context) ([]models.Menu, error) {
	var menus []models.Menu
	
	// Get root menus (parent_id is NULL) with their children recursively
	err := r.db.WithContext(ctx).
		Where("parent_id IS NULL AND status = ?", "active").
		Preload("Children", func(db *gorm.DB) *gorm.DB {
			return db.Where("status = ?", "active").Order(orderAsc)
		}).
		Preload("Children.Children", func(db *gorm.DB) *gorm.DB {
			return db.Where("status = ?", "active").Order(orderAsc)
		}).
		Order(orderAsc).
		Find(&menus).Error
		
	return menus, err
}
