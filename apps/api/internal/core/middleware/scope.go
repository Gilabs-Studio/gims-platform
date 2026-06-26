package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/core/errors"
	redisClient "github.com/gilabs/gims/api/internal/core/infrastructure/redis"
	"github.com/gin-gonic/gin"
	"golang.org/x/sync/singleflight"
	"gorm.io/gorm"
)

// ScopeContext holds resolved user context for data-level authorization
type ScopeContext struct {
	UserID       string   `json:"user_id"`
	EmployeeID   string   `json:"employee_id"`
	DivisionID   string   `json:"division_id"`
	AreaIDs      []string `json:"area_ids"`
	WarehouseIDs []string `json:"warehouse_ids"`
	OutletIDs    []string `json:"outlet_ids"`
}

var scopeSingleFlightGroup singleflight.Group

// GetScopeContext extracts the ScopeContext from Gin context
func GetScopeContext(c *gin.Context) *ScopeContext {
	if val, exists := c.Get("scope_context"); exists {
		if sc, ok := val.(*ScopeContext); ok {
			return sc
		}
	}
	return nil
}

// ScopeMiddleware resolves the current user's employee, division, and areas
// for downstream scope-based data filtering. It fetches once per request
// and stores the result in context.
func ScopeMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.Next()
			return
		}

		userIDStr, ok := userID.(string)
		if !ok || userIDStr == "" {
			c.Next()
			return
		}

		// Try cache first
		cacheKey := fmt.Sprintf("scope:%s", userIDStr)
		rdb := redisClient.GetClient()
		if rdb != nil {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
			val, err := rdb.Get(ctx, cacheKey).Result()
			cancel()
			if err == nil {
				var sc ScopeContext
				if err := json.Unmarshal([]byte(val), &sc); err == nil {
					debugLog("[scope] cache hit for user_id=%s", userIDStr)
					c.Set("scope_context", &sc)
					reqCtx := c.Request.Context()
					reqCtx = context.WithValue(reqCtx, "scope_user_id", sc.UserID)
					reqCtx = context.WithValue(reqCtx, "scope_employee_id", sc.EmployeeID)
					reqCtx = context.WithValue(reqCtx, "scope_division_id", sc.DivisionID)
					reqCtx = context.WithValue(reqCtx, "scope_outlet_ids", sc.OutletIDs)
					reqCtx = context.WithValue(reqCtx, "scope_area_ids", sc.AreaIDs)
					reqCtx = context.WithValue(reqCtx, "scope_warehouse_ids", sc.WarehouseIDs)
					c.Request = c.Request.WithContext(reqCtx)
					c.Next()
					return
				}
			}
		}

		// Cache miss: singleflight groups duplicate requests into one function call
		scVal, err, _ := scopeSingleFlightGroup.Do(userIDStr, func() (interface{}, error) {
			dbCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()

			type employeeRow struct {
				ID         string
				DivisionID *string
			}
			var emp employeeRow
			err := db.WithContext(dbCtx).
				Table("employees").
				Select("id, division_id").
				Where("user_id = ? AND deleted_at IS NULL", userIDStr).
				First(&emp).Error

			sc := &ScopeContext{
				UserID: userIDStr,
			}

			if err == nil {
				sc.EmployeeID = emp.ID
				if emp.DivisionID != nil {
					sc.DivisionID = *emp.DivisionID
				}

				// Resolve area IDs from employee_areas
				var areaIDs []string
				if err := db.WithContext(dbCtx).
					Table("employee_areas").
					Where("employee_id = ?", emp.ID).
					Pluck("area_id", &areaIDs).Error; err == nil {
					sc.AreaIDs = areaIDs
				}

				// Resolve outlet IDs from employee_outlets and direct manager assignment
				var outletIDs []string
				if err := db.WithContext(dbCtx).
					Table("employee_outlets").
					Where("employee_id = ? AND deleted_at IS NULL", emp.ID).
					Pluck("outlet_id", &outletIDs).Error; err == nil {
					sc.OutletIDs = outletIDs
				}

				var managedOutletIDs []string
				if err := db.WithContext(dbCtx).
					Table("outlets").
					Where("manager_id = ? AND deleted_at IS NULL", emp.ID).
					Pluck("id", &managedOutletIDs).Error; err == nil {
					uniqueOutlets := make(map[string]bool)
					for _, id := range sc.OutletIDs {
						uniqueOutlets[id] = true
					}
					for _, id := range managedOutletIDs {
						uniqueOutlets[id] = true
					}
					mergedOutletIDs := make([]string, 0, len(uniqueOutlets))
					for id := range uniqueOutlets {
						mergedOutletIDs = append(mergedOutletIDs, id)
					}
					sc.OutletIDs = mergedOutletIDs
				}

				// Resolve warehouse IDs from employee_warehouses
				var warehouseIDs []string
				if err := db.WithContext(dbCtx).
					Table("employee_warehouses").
					Where("employee_id = ? AND deleted_at IS NULL", emp.ID).
					Pluck("warehouse_id", &warehouseIDs).Error; err == nil {
					sc.WarehouseIDs = warehouseIDs
				}

				debugLog(
					"[scope] resolved user_id=%s employee_id=%s division_id=%s area_ids=%d outlet_ids=%d warehouse_ids=%d",
					userIDStr,
					sc.EmployeeID,
					sc.DivisionID,
					len(sc.AreaIDs),
					len(sc.OutletIDs),
					len(sc.WarehouseIDs),
				)
			} else if err != gorm.ErrRecordNotFound {
				return nil, err
			}

			if err == gorm.ErrRecordNotFound {
				debugLog("[scope] no-employee user_id=%s", userIDStr)
			}

			// Cache resolved scope context
			if rdb != nil {
				if val, err := json.Marshal(sc); err == nil {
					_ = rdb.Set(dbCtx, cacheKey, val, 1*time.Minute).Err()
				}
			}

			return sc, nil
		})

		if err != nil {
			errors.InternalServerErrorResponse(c, "failed to resolve user scope")
			c.Abort()
			return
		}

		sc := scVal.(*ScopeContext)
		c.Set("scope_context", sc)
		reqCtx := c.Request.Context()
		reqCtx = context.WithValue(reqCtx, "scope_user_id", sc.UserID)
		reqCtx = context.WithValue(reqCtx, "scope_employee_id", sc.EmployeeID)
		reqCtx = context.WithValue(reqCtx, "scope_division_id", sc.DivisionID)
		reqCtx = context.WithValue(reqCtx, "scope_outlet_ids", sc.OutletIDs)
		reqCtx = context.WithValue(reqCtx, "scope_area_ids", sc.AreaIDs)
		reqCtx = context.WithValue(reqCtx, "scope_warehouse_ids", sc.WarehouseIDs)
		c.Request = c.Request.WithContext(reqCtx)
		c.Next()
	}
}
