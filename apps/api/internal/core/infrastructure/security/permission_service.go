package security

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/redis"
	"gorm.io/gorm"
)

type PermissionService interface {
	GetPermissions(roleCode string) ([]string, error)
	InvalidateCache(roleCode string) error
}

type cachedPermissionService struct {
	db          *gorm.DB
	l1Cache     sync.Map
	l1TTL       time.Duration
	l2TTL       time.Duration
}

type l1CacheItem struct {
	permissions []string
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
		if time.Now().Before(cached.expiresAt) {
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
					expiresAt:   time.Now().Add(s.l1TTL),
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
		expiresAt:   time.Now().Add(s.l1TTL),
	})

	return perms, nil
}

func (s *cachedPermissionService) InvalidateCache(roleCode string) error {
	// Clear L1
	s.l1Cache.Delete(roleCode)

	// Clear L2
	redisClient := redis.GetClient()
	if redisClient != nil {
		cacheKey := fmt.Sprintf("permissions:%s", roleCode)
		return redisClient.Del(context.Background(), cacheKey).Err()
	}
	return nil
}
