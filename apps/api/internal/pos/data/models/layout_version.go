package models

import "time"

// LayoutVersion stores immutable snapshots created when a floor plan is published
type LayoutVersion struct {
	ID          string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	FloorPlanID string    `gorm:"type:uuid;not null;index:idx_layout_versions_floor_plan" json:"floor_plan_id"`
	Version     int       `gorm:"type:int;not null" json:"version"`
	LayoutData  string    `gorm:"type:jsonb;not null" json:"layout_data"`
	PublishedAt time.Time `gorm:"type:timestamptz;not null" json:"published_at"`
	PublishedBy string    `gorm:"type:varchar(100);not null" json:"published_by"`
}

// TableName overrides the default table name
func (LayoutVersion) TableName() string {
	return "pos_layout_versions"
}
