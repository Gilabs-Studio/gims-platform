package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WorkSchedule represents a work schedule configuration
// Following international ERP standards with flexible hours support
type WorkSchedule struct {
	ID          string         `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string         `gorm:"size:100;not null" json:"name"`
	Description string         `gorm:"size:255" json:"description"`
	DivisionID  *string        `gorm:"type:uuid;index" json:"division_id"`
	IsDefault   bool           `gorm:"default:false" json:"is_default"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`

	// Standard work hours
	StartTime string `gorm:"size:5;not null" json:"start_time"` // Format: "08:00"
	EndTime   string `gorm:"size:5;not null" json:"end_time"`   // Format: "17:00"

	// Flexible hours configuration
	IsFlexible        bool   `gorm:"default:false" json:"is_flexible"`
	FlexibleStartTime string `gorm:"size:5" json:"flexible_start_time"` // e.g., "07:00" - can clock in from this time
	FlexibleEndTime   string `gorm:"size:5" json:"flexible_end_time"`   // e.g., "09:00" - must clock in before this time

	// Break time
	BreakStartTime string `gorm:"size:5" json:"break_start_time"` // e.g., "12:00"
	BreakEndTime   string `gorm:"size:5" json:"break_end_time"`   // e.g., "13:00"
	BreakDuration  int    `gorm:"default:60" json:"break_duration"` // in minutes

	// Working days (bitmask: 1=Mon, 2=Tue, 4=Wed, 8=Thu, 16=Fri, 32=Sat, 64=Sun)
	// Example: 31 = Mon-Fri (1+2+4+8+16)
	WorkingDays int `gorm:"default:31" json:"working_days"`

	// Working hours per day (for overtime calculation)
	WorkingHoursPerDay float64 `gorm:"type:decimal(4,2);default:8.00" json:"working_hours_per_day"`

	// Tolerance settings (in minutes)
	LateToleranceMinutes  int `gorm:"default:0" json:"late_tolerance_minutes"`
	EarlyLeaveToleranceMinutes int `gorm:"default:0" json:"early_leave_tolerance_minutes"`

	// GPS Settings
	RequireGPS      bool    `gorm:"default:true" json:"require_gps"`
	GPSRadiusMeter  float64 `gorm:"type:decimal(10,2);default:100.00" json:"gps_radius_meter"` // Tolerance radius in meters
	OfficeLatitude  float64 `gorm:"type:decimal(10,8)" json:"office_latitude"`
	OfficeLongitude float64 `gorm:"type:decimal(11,8)" json:"office_longitude"`

	CreatedAt time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

func (w *WorkSchedule) BeforeCreate(tx *gorm.DB) error {
	if w.ID == "" {
		w.ID = uuid.New().String()
	}
	return nil
}

// IsWorkingDay checks if a given weekday is a working day
// weekday: 0=Sunday, 1=Monday, ..., 6=Saturday
func (w *WorkSchedule) IsWorkingDay(weekday int) bool {
	// Convert to our bitmask format (Monday=1, Sunday=64)
	var dayBit int
	switch weekday {
	case 0: // Sunday
		dayBit = 64
	case 1: // Monday
		dayBit = 1
	case 2: // Tuesday
		dayBit = 2
	case 3: // Wednesday
		dayBit = 4
	case 4: // Thursday
		dayBit = 8
	case 5: // Friday
		dayBit = 16
	case 6: // Saturday
		dayBit = 32
	}
	return w.WorkingDays&dayBit != 0
}
