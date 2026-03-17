package models

import (
	"time"

	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// YearlyTarget represents annual sales targets for a specific area
type YearlyTarget struct {
	ID    string `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Code  string `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"`
	AreaID *string `gorm:"type:uuid;index" json:"area_id"`
	Area   *orgModels.Area `gorm:"foreignKey:AreaID" json:"area,omitempty"`
	Year   int    `gorm:"not null;index" json:"year"`
	TotalTarget float64 `gorm:"type:decimal(20,2);not null" json:"total_target"`
	Notes  string `gorm:"type:text" json:"notes"`
	
	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	
	// Relations
	MonthlyTargets []MonthlyTarget `gorm:"foreignKey:YearlyTargetID;constraint:OnDelete:CASCADE" json:"monthly_targets,omitempty"`
}

// TableName specifies the table name for YearlyTarget
func (YearlyTarget) TableName() string {
	return "yearly_targets"
}

// BeforeCreate hook to generate UUID
func (yt *YearlyTarget) BeforeCreate(tx *gorm.DB) error {
	if yt.ID == "" {
		yt.ID = uuid.New().String()
	}
	return nil
}

// CalculateAchievements calculates total actual and achievement percent
func (yt *YearlyTarget) CalculateAchievements() (totalActual float64, achievementPercent float64) {
	for i := range yt.MonthlyTargets {
		mt := &yt.MonthlyTargets[i]
		mt.CalculateAchievement()
		totalActual += mt.ActualAmount
	}
	
	if yt.TotalTarget > 0 {
		achievementPercent = (totalActual / yt.TotalTarget) * 100
	}
	
	return totalActual, achievementPercent
}
