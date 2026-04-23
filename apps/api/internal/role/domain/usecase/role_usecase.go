package usecase

import (
	"context"
	"errors"

	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/events"
	infraEvents "github.com/gilabs/gims/api/internal/core/infrastructure/events"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/role/data/models"
	"github.com/gilabs/gims/api/internal/role/data/repositories"
	"github.com/gilabs/gims/api/internal/role/domain/dto"
	"github.com/gilabs/gims/api/internal/role/domain/mapper"
	tenantRepos "github.com/gilabs/gims/api/internal/tenant/data/repositories"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

var (
	ErrRoleNotFound           = errors.New("role not found")
	ErrRoleAlreadyExists      = errors.New("role already exists")
	ErrRoleProtected          = errors.New("role is protected and cannot be deleted or modified")
	ErrRoleInUse              = errors.New("role is in use by users and cannot be deleted")
	ErrLastAdminCannotDelete  = errors.New("cannot delete the last admin role")
	ErrLastAdminCannotDisable = errors.New("cannot disable the last admin role")
	ErrPermissionNotAllowedForPlan = errors.New("one or more permissions are not allowed for the tenant plan")
)

const (
	cacheRoleByIDKey = "roles:id:%s"
	cacheRoleListKeyFmt = "roles:list:page:%d:limit:%d"
	cacheRoleListPage1Limit10 = "roles:list:page:1:limit:10"
	cacheRoleListPage1Limit20 = "roles:list:page:1:limit:20"
)

type RoleUsecase interface {
	List(ctx context.Context, page, limit int) ([]dto.RoleResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.RoleResponse, error)
	Create(ctx context.Context, req *dto.CreateRoleRequest) (*dto.RoleResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateRoleRequest) (*dto.RoleResponse, error)
	Delete(ctx context.Context, id string) error
	AssignPermissions(ctx context.Context, roleID string, permissionIDs []string) error
	AssignPermissionsWithScope(ctx context.Context, roleID string, assignments []dto.PermissionAssignment) error
	ValidateUserRole(ctx context.Context, userID string, roleID string) (bool, error)
}

type roleUsecase struct {
	roleRepo       repositories.RoleRepository
	eventPublisher infraEvents.EventPublisher
	redis          *redis.Client
	permService    security.PermissionService
	db             *gorm.DB
	planRepo       tenantRepos.SubscriptionPlanRepository
}

func NewRoleUsecase(roleRepo repositories.RoleRepository, eventPublisher infraEvents.EventPublisher, redis *redis.Client, permService security.PermissionService, db *gorm.DB, planRepo tenantRepos.SubscriptionPlanRepository) RoleUsecase {
	return &roleUsecase{
		roleRepo:       roleRepo,
		eventPublisher: eventPublisher,
		redis:          redis,
		permService:    permService,
		db:             db,
		planRepo:       planRepo,
	}
}

func (u *roleUsecase) List(ctx context.Context, page, limit int) ([]dto.RoleResponse, int64, error) {
	cacheKey := fmt.Sprintf(cacheRoleListKeyFmt, page, limit)

	// Try to get from cache
	val, err := u.redis.Get(ctx, cacheKey).Result()
	if err == nil {
		var cachedResult struct {
			Roles []dto.RoleResponse `json:"roles"`
			Total int64              `json:"total"`
		}
		if err := json.Unmarshal([]byte(val), &cachedResult); err == nil {
			return cachedResult.Roles, cachedResult.Total, nil
		}
	}

	// Get from DB
	roles, total, err := u.roleRepo.List(ctx, page, limit)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]dto.RoleResponse, len(roles))
	for i, r := range roles {
		responses[i] = *mapper.ToRoleResponse(&r)
	}

	// Cache result (TTL 5 minutes)
	cacheData := struct {
		Roles []dto.RoleResponse `json:"roles"`
		Total int64              `json:"total"`
	}{
		Roles: responses,
		Total: total,
	}

	if data, err := json.Marshal(cacheData); err == nil {
		u.redis.Set(ctx, cacheKey, data, 5*time.Minute)
	}

	return responses, total, nil
}

func (u *roleUsecase) GetByID(ctx context.Context, id string) (*dto.RoleResponse, error) {
	cacheKey := fmt.Sprintf("roles:id:%s", id)

	// Try to get from cache
	val, err := u.redis.Get(ctx, cacheKey).Result()
	if err == nil {
		var cachedRole dto.RoleResponse
		if err := json.Unmarshal([]byte(val), &cachedRole); err == nil {
			return &cachedRole, nil
		}
	}

	r, err := u.roleRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}
	
	resp := mapper.ToRoleResponse(r)

	// Cache result (TTL 15 minutes)
	if data, err := json.Marshal(resp); err == nil {
		u.redis.Set(ctx, cacheKey, data, 15*time.Minute)
	}

	return resp, nil
}

func (u *roleUsecase) Create(ctx context.Context, req *dto.CreateRoleRequest) (*dto.RoleResponse, error) {
	// Check if code already exists
	_, err := u.roleRepo.FindByCode(ctx, req.Code)
	if err == nil {
		return nil, ErrRoleAlreadyExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Set default status
	status := req.Status
	if status == "" {
		status = "active"
	}

	// Invalidate cache
	// We scan only a few keys or just expire them. Since we don't know all pages, 
	// specific invalidation is hard without maintaining a set of keys.
	// For now, let's just invalidate the specific role ID cache. 
	// List cache uses 5 min TTL, so it will expire eventually.
	// For immediate consistency, we could use keys pattern matching but it's expensive.
	// Enterprise solution: Use a "version" key for lists or just accept eventual consistency (5 mins).
	// Let's implement partial invalidation for common first page.
	u.redis.Del(ctx, cacheRoleListPage1Limit10, cacheRoleListPage1Limit20)
 	
	// Create role
	r := &models.Role{
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		Status:      status,
		IsProtected: false, // Always false for user-created roles
	}

	if err := u.roleRepo.Create(ctx, r); err != nil {
		return nil, err
	}

	// Reload with permissions
	createdRole, err := u.roleRepo.FindByID(ctx, r.ID)
	if err != nil {
		return nil, err
	}

	// Publish event (async, fire-and-forget)
	u.eventPublisher.PublishAsync(ctx, events.NewRoleCreatedEvent(ctx, events.RoleCreatedPayload{
		RoleID:      r.ID,
		Name:        r.Name,
		Code:        r.Code,
		Description: r.Description,
		Status:      r.Status,
		CreatedAt:   r.CreatedAt,
	}))

	return mapper.ToRoleResponse(createdRole), nil
}

func (u *roleUsecase) Update(ctx context.Context, id string, req *dto.UpdateRoleRequest) (*dto.RoleResponse, error) {
	// Find role
	r, err := u.roleRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}

	// Validate protected role changes in helper to keep complexity low
	if err := u.validateProtectedRoleChange(ctx, r, req); err != nil {
		return nil, err
	}

	// Update fields
	if req.Name != "" {
		r.Name = req.Name
	}

	if req.Code != "" {
		// Check if code already exists (excluding current role)
		existingRole, err := u.roleRepo.FindByCode(ctx, req.Code)
		if err == nil && existingRole.ID != id {
			return nil, ErrRoleAlreadyExists
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		r.Code = req.Code
	}

	if req.Description != "" {
		r.Description = req.Description
	}

	if req.Status != "" {
		r.Status = req.Status
	}

	if err := u.roleRepo.Update(ctx, r); err != nil {
		return nil, err
	}

	// Invalidate cache
	u.redis.Del(ctx, fmt.Sprintf(cacheRoleByIDKey, id))
	u.redis.Del(ctx, cacheRoleListPage1Limit10, cacheRoleListPage1Limit20)

	// Reload with permissions
	updatedRole, err := u.roleRepo.FindByID(ctx, r.ID)
	if err != nil {
		return nil, err
	}

	// Publish event (async, fire-and-forget)
	u.eventPublisher.PublishAsync(ctx, events.NewRoleUpdatedEvent(ctx, events.RoleUpdatedPayload{
		RoleID:      r.ID,
		Name:        r.Name,
		Code:        r.Code,
		Description: r.Description,
		Status:      r.Status,
		UpdatedAt:   r.UpdatedAt,
	}))

	return mapper.ToRoleResponse(updatedRole), nil
}

func (u *roleUsecase) validateProtectedRoleChange(ctx context.Context, r *models.Role, req *dto.UpdateRoleRequest) error {
	if !r.IsProtected {
		return nil
	}

	// Protected roles cannot have status changed to inactive if it's the last admin
	if req.Status == "inactive" && r.Code == "admin" {
		adminCount, err := u.roleRepo.CountAdmins(ctx)
		if err != nil {
			return err
		}
		if adminCount <= 1 {
			return ErrLastAdminCannotDisable
		}
	}

	// Protected roles cannot have code changed
	if req.Code != "" && req.Code != r.Code {
		return ErrRoleProtected
	}

	return nil
}

func (u *roleUsecase) Delete(ctx context.Context, id string) error {
	// Check if role exists
	r, err := u.roleRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrRoleNotFound
		}
		return err
	}

	// Check if role is protected
	if r.IsProtected {
		return ErrRoleProtected
	}

	// Check if role is admin and it's the last admin
	if r.Code == "admin" {
		adminCount, err := u.roleRepo.CountAdmins(ctx)
		if err != nil {
			return err
		}
		if adminCount <= 1 {
			return ErrLastAdminCannotDelete
		}
	}

	// Check if role is in use by users
	userCount, err := u.roleRepo.CountUsersByRoleID(ctx, id)
	if err != nil {
		return err
	}
	if userCount > 0 {
		return ErrRoleInUse
	}

	if err := u.roleRepo.Delete(ctx, id); err != nil {
		return err
	}

	// Invalidate cache
	u.redis.Del(ctx, fmt.Sprintf(cacheRoleByIDKey, id))
	u.redis.Del(ctx, cacheRoleListPage1Limit10, cacheRoleListPage1Limit20)

	// Publish event (async, fire-and-forget)
	u.eventPublisher.PublishAsync(ctx, events.NewRoleDeletedEvent(ctx, events.RoleDeletedPayload{
		RoleID:    id,
		Code:      r.Code,
		DeletedAt: apptime.Now(),
	}))

	return nil
}

func (u *roleUsecase) AssignPermissions(ctx context.Context, roleID string, permissionIDs []string) error {
	// Check if role exists
	role, err := u.roleRepo.FindByID(ctx, roleID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrRoleNotFound
		}
		return err
	}

	if err := u.validatePlanPermissionBoundary(ctx, permissionIDs); err != nil {
		return err
	}

	if err := u.roleRepo.AssignPermissions(ctx, roleID, permissionIDs); err != nil {
		return err
	}

	u.invalidatePermissionCaches(ctx, roleID, role.Code)

	// Publish event (async, fire-and-forget)
	u.eventPublisher.PublishAsync(ctx, events.NewRolePermissionsAssignedEvent(ctx, events.RolePermissionsAssignedPayload{
		RoleID:        roleID,
		PermissionIDs: permissionIDs,
		AssignedAt:    apptime.Now(),
	}))

	return nil
}

func (u *roleUsecase) AssignPermissionsWithScope(ctx context.Context, roleID string, assignments []dto.PermissionAssignment) error {
	// Validate role exists
	role, err := u.roleRepo.FindByID(ctx, roleID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrRoleNotFound
		}
		return err
	}

	// Validate all scopes
	for _, a := range assignments {
		if !models.IsValidScope(a.Scope) {
			return fmt.Errorf("invalid scope '%s' for permission '%s'", a.Scope, a.PermissionID)
		}
	}

	// Convert to model-level assignments
	rolePerms := make([]models.RolePermission, 0, len(assignments))
	permIDs := make([]string, 0, len(assignments))
	for _, a := range assignments {
		scope := a.Scope
		if scope == "" {
			scope = models.ScopeAll
		}
		permIDs = append(permIDs, a.PermissionID)
		rolePerms = append(rolePerms, models.RolePermission{
			RoleID:       roleID,
			PermissionID: a.PermissionID,
			Scope:        scope,
		})
	}

	if err := u.validatePlanPermissionBoundary(ctx, permIDs); err != nil {
		return err
	}

	if err := u.roleRepo.AssignPermissionsWithScope(ctx, roleID, rolePerms); err != nil {
		return err
	}

	u.invalidatePermissionCaches(ctx, roleID, role.Code)

	// Publish event with permission IDs
	u.eventPublisher.PublishAsync(ctx, events.NewRolePermissionsAssignedEvent(ctx, events.RolePermissionsAssignedPayload{
		RoleID:        role.ID,
		PermissionIDs: permIDs,
		AssignedAt:    apptime.Now(),
	}))

	return nil
}

func (u *roleUsecase) validatePlanPermissionBoundary(ctx context.Context, permissionIDs []string) error {
	if len(permissionIDs) == 0 || u.db == nil || u.planRepo == nil {
		return nil
	}

	// System admins are platform-wide operators and are not constrained by tenant plans.
	if middleware.IsSystemAdmin(ctx) {
		return nil
	}

	tenantID := middleware.TenantFromContext(ctx)
	if tenantID == "" {
		return nil
	}

	planSlug, err := u.resolveTenantPlanSlug(ctx, tenantID)
	if err != nil || planSlug == "" {
		return ErrPermissionNotAllowedForPlan
	}

	modules, err := u.planRepo.GetEnabledModules(ctx, planSlug)
	if err != nil {
		return ErrPermissionNotAllowedForPlan
	}
	allowedModules := make(map[string]struct{}, len(modules))
	for _, m := range modules {
		allowedModules[strings.ToLower(strings.TrimSpace(m))] = struct{}{}
	}

	permissionMeta, err := u.fetchPermissionMeta(ctx, permissionIDs)
	if err != nil {
		return err
	}

	if len(permissionMeta) == 0 {
		return nil
	}

	for _, p := range permissionMeta {
		codeLower := strings.ToLower(p.Code)
		if strings.HasPrefix(codeLower, "dashboard.") ||
			strings.HasPrefix(codeLower, "profile.") ||
			strings.HasPrefix(codeLower, "setting") ||
			strings.HasPrefix(codeLower, "billing.") ||
			strings.HasPrefix(codeLower, "user.") ||
			strings.HasPrefix(codeLower, "role.") ||
			strings.HasPrefix(codeLower, "permission.") ||
			strings.HasPrefix(codeLower, "company.") ||
			strings.HasPrefix(codeLower, "warehouse.") ||
			strings.HasPrefix(codeLower, "product.") ||
			strings.HasPrefix(codeLower, "customer.") ||
			strings.HasPrefix(codeLower, "supplier.") ||
			strings.HasPrefix(codeLower, "employee.") {
			continue
		}

		module := normalizeMenuModule(p.MenuModule)
		if module == "" {
			module = moduleFromURL(p.MenuURL)
		}
		if module == "" {
			continue
		}
		if _, ok := allowedModules[module]; !ok {
			return ErrPermissionNotAllowedForPlan
		}
	}

	return nil
}

func (u *roleUsecase) resolveTenantPlanSlug(ctx context.Context, tenantID string) (string, error) {
	var planSlug string
	err := u.db.WithContext(ctx).
		Table("tenant_subscriptions").
		Select("plan").
		Where("tenant_id = ? AND status IN ('active','trial') AND deleted_at IS NULL", tenantID).
		Order("created_at DESC").
		Limit(1).
		Row().Scan(&planSlug)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(strings.ToLower(planSlug)), nil
}

type permissionMetaRow struct {
	Code       string
	MenuURL    string
	MenuModule string
}

func (u *roleUsecase) fetchPermissionMeta(ctx context.Context, permissionIDs []string) ([]permissionMetaRow, error) {
	uniq := make([]string, 0, len(permissionIDs))
	seen := make(map[string]struct{}, len(permissionIDs))
	for _, id := range permissionIDs {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		uniq = append(uniq, id)
	}

	if len(uniq) == 0 {
		return []permissionMetaRow{}, nil
	}

	rows := make([]permissionMetaRow, 0, len(uniq))
	err := u.db.WithContext(ctx).
		Table("permissions p").
		Select("p.code AS code, COALESCE(m.url, '') AS menu_url, COALESCE(m.module, '') AS menu_module").
		Joins("LEFT JOIN menus m ON m.id = p.menu_id").
		Where("p.id IN ? AND p.deleted_at IS NULL", uniq).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func normalizeMenuModule(module string) string {
	m := strings.ToLower(strings.TrimSpace(module))
	switch m {
	case "hrd", "human-resources", "human_resources":
		return "hr"
	case "stock":
		return "inventory"
	default:
		return m
	}
}

func moduleFromURL(url string) string {
	p := strings.ToLower(strings.TrimSpace(url))
	if p == "" {
		return ""
	}
	switch {
	case strings.HasPrefix(p, "/hrd"):
		return "hr"
	case strings.HasPrefix(p, "/stock"):
		return "inventory"
	case strings.HasPrefix(p, "/pos"):
		return "pos"
	case strings.HasPrefix(p, "/crm"):
		return "crm"
	case strings.HasPrefix(p, "/sales"):
		return "sales"
	case strings.HasPrefix(p, "/purchase"):
		return "purchase"
	case strings.HasPrefix(p, "/finance"):
		return "finance"
	default:
		return ""
	}
}



// invalidatePermissionCaches clears role and permission caches after assignment changes.
// Both L1 (in-memory via PermissionService) and L2 (Redis) caches are invalidated
// to ensure permission/scope changes take effect immediately.
func (u *roleUsecase) invalidatePermissionCaches(ctx context.Context, roleID string, roleCode string) {
	u.redis.Del(ctx, fmt.Sprintf(cacheRoleByIDKey, roleID))
	u.redis.Del(ctx, cacheRoleListPage1Limit10, cacheRoleListPage1Limit20)

	// Invalidate L1 in-memory cache in PermissionService (immediate effect)
	if u.permService != nil {
		if err := u.permService.InvalidateCache(roleCode); err != nil {
			log.Printf("[RoleUsecase] failed to invalidate L1 permission cache for role '%s': %v", roleCode, err)
		}
	}

	// Invalidate L2 Redis permission caches (correct key patterns)
	for _, pattern := range []string{"permissions:*", "permissions_scope:*"} {
		iter := u.redis.Scan(ctx, 0, pattern, 0).Iterator()
		for iter.Next(ctx) {
			u.redis.Del(ctx, iter.Val())
		}
	}
}

func (u *roleUsecase) ValidateUserRole(ctx context.Context, userID string, roleID string) (bool, error) {
	// Check if role exists and is active
	r, err := u.roleRepo.FindByID(ctx, roleID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}

	// Check if role is active
	if r.Status != "active" {
		return false, nil
	}

	return true, nil
}
