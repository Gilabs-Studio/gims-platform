package models

import (
	"time"

	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MaintenanceScheduleType string

type MaintenanceFrequency string

const (
	MaintenanceScheduleTypePreventive MaintenanceScheduleType = "preventive"
	MaintenanceScheduleTypeCorrective MaintenanceScheduleType = "corrective"
)

const (
	MaintenanceFrequencyDaily    MaintenanceFrequency = "daily"
	MaintenanceFrequencyWeekly   MaintenanceFrequency = "weekly"
	MaintenanceFrequencyMonthly  MaintenanceFrequency = "monthly"
	MaintenanceFrequencyYearly   MaintenanceFrequency = "yearly"
	MaintenanceFrequencyCustom   MaintenanceFrequency = "custom"
)

type AssetMaintenanceSchedule struct {
	ID                   string                `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	AssetID              string                `gorm:"type:uuid;not null;index" json:"asset_id"`
	Asset                *Asset                `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
	ScheduleType         MaintenanceScheduleType `gorm:"type:varchar(20);not null" json:"schedule_type"`
	Frequency            MaintenanceFrequency  `gorm:"type:varchar(20);not null" json:"frequency"`
	FrequencyValue       int                   `gorm:"default:1" json:"frequency_value"`
	LastMaintenanceDate  *time.Time            `gorm:"type:date" json:"last_maintenance_date"`
	NextMaintenanceDate  *time.Time            `gorm:"type:date;index" json:"next_maintenance_date"`
	Description          string                `gorm:"type:text" json:"description"`
	EstimatedCost        float64               `gorm:"type:numeric(18,2);default:0" json:"estimated_cost"`
	AssignedTo           *string               `gorm:"type:uuid;index" json:"assigned_to"`
	Employee             *orgModels.Employee   `gorm:"foreignKey:AssignedTo" json:"employee,omitempty"`
	IsActive             bool                  `gorm:"default:true" json:"is_active"`

	WorkOrders []AssetWorkOrder `gorm:"foreignKey:ScheduleID" json:"work_orders,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (AssetMaintenanceSchedule) TableName() string {
	return "asset_maintenance_schedules"
}

func (s *AssetMaintenanceSchedule) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// CalculateNextDate menghitung tanggal maintenance berikutnya berdasarkan frequency
func (s *AssetMaintenanceSchedule) CalculateNextDate(from time.Time) time.Time {
	switch s.Frequency {
	case MaintenanceFrequencyDaily:
		return from.AddDate(0, 0, s.FrequencyValue)
	case MaintenanceFrequencyWeekly:
		return from.AddDate(0, 0, 7*s.FrequencyValue)
	case MaintenanceFrequencyMonthly:
		return from.AddDate(0, s.FrequencyValue, 0)
	case MaintenanceFrequencyYearly:
		return from.AddDate(s.FrequencyValue, 0, 0)
	default:
		return from.AddDate(0, 1, 0) // default monthly
	}
}

// IsOverdue mengecek apakah maintenance sudah overdue
func (s *AssetMaintenanceSchedule) IsOverdue() bool {
	if s.NextMaintenanceDate == nil {
		return false
	}
	return s.IsActive && s.NextMaintenanceDate.Before(time.Now())
}

// DaysUntilDue menghitung jumlah hari sampai maintenance due
func (s *AssetMaintenanceSchedule) DaysUntilDue() int {
	if s.NextMaintenanceDate == nil {
		return 0
	}
	return int(s.NextMaintenanceDate.Sub(time.Now()).Hours() / 24)
}
