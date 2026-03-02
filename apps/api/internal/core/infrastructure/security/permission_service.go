package security

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/redis"
	"gorm.io/gorm"
)

type PermissionService interface {
	GetPermissions(roleCode string) ([]string, error)
	GetPermissionsWithScope(roleCode string) (map[string]string, error)
	InvalidateCache(roleCode string) error
}

type cachedPermissionService struct {
	db           *gorm.DB
	l1Cache      sync.Map
	l1ScopeCache sync.Map // Separate L1 cache for scope-aware permissions
	l1TTL        time.Duration
	l2TTL        time.Duration
}

type l1CacheItem struct {
	permissions []string
	expiresAt   time.Time
}

type l1ScopeCacheItem struct {
	permissions map[string]string // code -> scope
	expiresAt   time.Time
}

func NewPermissionService(db *gorm.DB) PermissionService {
	return &cachedPermissionService{
		db:    db,
		l1TTL: 1 * time.Minute,
		l2TTL: 1 * time.Hour,
	}
}

func (s *cachedPermissionService) GetPermissions(roleCode string) ([]string, error) {
	// 1. Check L1 Cache (Memory)
	if item, ok := s.l1Cache.Load(roleCode); ok {
		cached := item.(l1CacheItem)
		if apptime.Now().Before(cached.expiresAt) {
			return cached.permissions, nil
		}
		s.l1Cache.Delete(roleCode)
	}

	// 2. Check L2 Cache (Redis)
	redisClient := redis.GetClient()
	cacheKey := fmt.Sprintf("permissions:%s", roleCode)
	
	if redisClient != nil {
		val, err := redisClient.Get(context.Background(), cacheKey).Result()
		if err == nil {
			var perms []string
			if err := json.Unmarshal([]byte(val), &perms); err == nil {
				// Populate L1
				s.l1Cache.Store(roleCode, l1CacheItem{
					permissions: perms,
					expiresAt:   apptime.Now().Add(s.l1TTL),
				})
				return perms, nil
			}
		}
	}

	// 3. Fetch from DB
	var perms []string
	query := `
		SELECT p.code 
		FROM permissions p 
		JOIN role_permissions rp ON rp.permission_id = p.id 
		JOIN roles r ON r.id = rp.role_id 
		WHERE r.code = ? AND p.deleted_at IS NULL AND r.deleted_at IS NULL
	`
	if err := s.db.Raw(query, roleCode).Scan(&perms).Error; err != nil {
		return nil, err
	}

	// 4. Update Caches
	// Update L2
	if redisClient != nil {
		data, _ := json.Marshal(perms)
		redisClient.Set(context.Background(), cacheKey, data, s.l2TTL)
	}

	// Update L1
	s.l1Cache.Store(roleCode, l1CacheItem{
		permissions: perms,
		expiresAt:   apptime.Now().Add(s.l1TTL),
	})

	return perms, nil
}

// GetPermissionsWithScope returns permission codes mapped to their scope for a role
func (s *cachedPermissionService) GetPermissionsWithScope(roleCode string) (map[string]string, error) {
	// 1. Check L1 Scope Cache (Memory)
	if item, ok := s.l1ScopeCache.Load(roleCode); ok {
		cached := item.(l1ScopeCacheItem)
		if apptime.Now().Before(cached.expiresAt) {
			return cached.permissions, nil
		}
		s.l1ScopeCache.Delete(roleCode)
	}

	// 2. Check L2 Cache (Redis)
	redisClient := redis.GetClient()
	scopeCacheKey := fmt.Sprintf("permissions_scope:%s", roleCode)

	if redisClient != nil {
		val, err := redisClient.Get(context.Background(), scopeCacheKey).Result()
		if err == nil {
			var perms map[string]string
			if err := json.Unmarshal([]byte(val), &perms); err == nil {
				// Populate L1
				s.l1ScopeCache.Store(roleCode, l1ScopeCacheItem{
					permissions: perms,
					expiresAt:   apptime.Now().Add(s.l1TTL),
				})
				return perms, nil
			}
		}
	}

	// 3. Fetch from DB with scope
	type permRow struct {
		Code  string
		Scope string
	}
	var rows []permRow
	query := `
		SELECT p.code, COALESCE(rp.scope, 'ALL') as scope
		FROM permissions p
		JOIN role_permissions rp ON rp.permission_id = p.id
		JOIN roles r ON r.id = rp.role_id
		WHERE r.code = ? AND p.deleted_at IS NULL AND r.deleted_at IS NULL
	`
	if err := s.db.Raw(query, roleCode).Scan(&rows).Error; err != nil {
		log.Printf("[PermissionService] GetPermissionsWithScope DB error for role '%s': %v", roleCode, err)

		// Fallback: load permissions without scope, default all to ALL
		fallbackPerms, fallbackErr := s.GetPermissions(roleCode)
		if fallbackErr != nil {
			log.Printf("[PermissionService] Fallback GetPermissions also failed for role '%s': %v", roleCode, fallbackErr)
			return nil, err
		}

		log.Printf("[PermissionService] Fallback succeeded: loaded %d permissions with default scope ALL for role '%s'", len(fallbackPerms), roleCode)
		perms := make(map[string]string, len(fallbackPerms))
		for _, code := range fallbackPerms {
			perms[code] = "ALL"
		}
		return perms, nil
	}

	perms := make(map[string]string, len(rows))
	for _, row := range rows {
		// Default scope to ALL if empty or not set
		scope := row.Scope
		if scope == "" {
			scope = "ALL"
		}
		perms[row.Code] = scope
	}

	// 4. Update Caches
	if redisClient != nil {
		data, _ := json.Marshal(perms)
		redisClient.Set(context.Background(), scopeCacheKey, data, s.l2TTL)
	}

	s.l1ScopeCache.Store(roleCode, l1ScopeCacheItem{
		permissions: perms,
		expiresAt:   apptime.Now().Add(s.l1TTL),
	})

	return perms, nil
}

func (s *cachedPermissionService) InvalidateCache(roleCode string) error {
	// Clear L1 (both caches)
	s.l1Cache.Delete(roleCode)
	s.l1ScopeCache.Delete(roleCode)

	// Clear L2
	redisClient := redis.GetClient()
	if redisClient != nil {
		cacheKey := fmt.Sprintf("permissions:%s", roleCode)
		scopeCacheKey := fmt.Sprintf("permissions_scope:%s", roleCode)
		return redisClient.Del(context.Background(), cacheKey, scopeCacheKey).Err()
	}
	return nil
}
