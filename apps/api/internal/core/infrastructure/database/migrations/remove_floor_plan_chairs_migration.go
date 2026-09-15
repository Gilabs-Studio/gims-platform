package migrations

import (
	"encoding/json"
	"log"

	"gorm.io/gorm"
)

// RemoveFloorPlanChairsMigration migrates pos_floor_plans and pos_layout_versions
// by removing separate "chair" objects and ensuring the parent table object's
// "capacity" field holds the correct number of people.
func RemoveFloorPlanChairsMigration(db *gorm.DB) error {
	type planRow struct {
		ID         string `gorm:"primaryKey"`
		LayoutData string `gorm:"column:layout_data"`
	}

	sanitizeLayoutData := func(raw string) (string, bool) {
		if raw == "" || raw == "[]" {
			return raw, false
		}

		var objects []map[string]interface{}
		if err := json.Unmarshal([]byte(raw), &objects); err != nil {
			return raw, false
		}

		// Check if any chairs exist
		hasChairs := false
		chairCounts := make(map[string]int)
		for _, obj := range objects {
			if t, ok := obj["type"].(string); ok && t == "chair" {
				hasChairs = true
				if parentID, ok := obj["parentId"].(string); ok && parentID != "" {
					chairCounts[parentID]++
				}
			}
		}

		if !hasChairs {
			return raw, false
		}

		var filtered []map[string]interface{}
		for _, obj := range objects {
			t, _ := obj["type"].(string)
			if t == "chair" {
				// Drop chair object
				continue
			}

			if t == "table" {
				id, _ := obj["id"].(string)
				chairs := chairCounts[id]
				existingCap := 0
				if c, ok := obj["capacity"].(float64); ok {
					existingCap = int(c)
				}
				newCap := existingCap
				if chairs > newCap {
					newCap = chairs
				}
				if newCap <= 0 {
					newCap = 4
				}
				obj["capacity"] = newCap
				delete(obj, "chairLayout")
				delete(obj, "chairDistribution")
			}

			filtered = append(filtered, obj)
		}

		cleaned, err := json.Marshal(filtered)
		if err != nil {
			return raw, false
		}
		return string(cleaned), true
	}

	// 1. Migrate pos_floor_plans
	var plans []planRow
	if err := db.Table("pos_floor_plans").
		Where("layout_data LIKE '%\"type\":\"chair\"%' OR layout_data LIKE '%\"type\": \"chair\"%'").
		Find(&plans).Error; err == nil {
		for _, p := range plans {
			if cleaned, changed := sanitizeLayoutData(p.LayoutData); changed {
				if err := db.Table("pos_floor_plans").Where("id = ?", p.ID).Update("layout_data", cleaned).Error; err != nil {
					log.Printf("Warning: failed to sanitize pos_floor_plans %s: %v", p.ID, err)
				}
			}
		}
	}

	// 2. Migrate pos_layout_versions
	var versions []planRow
	if err := db.Table("pos_layout_versions").
		Where("layout_data LIKE '%\"type\":\"chair\"%' OR layout_data LIKE '%\"type\": \"chair\"%'").
		Find(&versions).Error; err == nil {
		for _, v := range versions {
			if cleaned, changed := sanitizeLayoutData(v.LayoutData); changed {
				if err := db.Table("pos_layout_versions").Where("id = ?", v.ID).Update("layout_data", cleaned).Error; err != nil {
					log.Printf("Warning: failed to sanitize pos_layout_versions %s: %v", v.ID, err)
				}
			}
		}
	}

	return nil
}
