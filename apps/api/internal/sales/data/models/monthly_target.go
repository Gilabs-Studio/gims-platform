package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// MonthlyTarget represents monthly sales target breakdown
type MonthlyTarget struct {
	ID             string  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	YearlyTargetID string  `gorm:"type:uuid;not null;index" json:"yearly_target_id"`
	Month          int     `gorm:"not null" json:"month"` // 1-12
	TargetAmount   float64 `gorm:"type:decimal(20,2);not null" json:"target_amount"`
	ActualAmount   float64 `gorm:"type:decimal(20,2);default:0" json:"actual_amount"`
	AchievementPercent float64 `gorm:"type:decimal(5,2);default:0" json:"achievement_percent"`
	Notes          string  `gorm:"type:text" json:"notes"`
	
	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	
	// Relations
	YearlyTarget *YearlyTarget `gorm:"foreignKey:YearlyTargetID" json:"yearly_target,omitempty"`
}

// TableName specifies the table name for MonthlyTarget
func (MonthlyTarget) TableName() string {
	return "monthly_targets"
}

// BeforeCreate hook to generate UUID
func (mt *MonthlyTarget) BeforeCreate(tx *gorm.DB) error {
	if mt.ID == "" {
		mt.ID = uuid.New().String()
	}
	return nil
}

// CalculateAchievement calculates the achievement percentage
func (mt *MonthlyTarget) CalculateAchievement() {
	if mt.TargetAmount > 0 {
		mt.AchievementPercent = (mt.ActualAmount / mt.TargetAmount) * 100
	} else {
		mt.AchievementPercent = 0
	}
}
