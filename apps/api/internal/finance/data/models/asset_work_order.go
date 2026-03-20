package models

import (
	"time"

	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WorkOrderType string

type WorkOrderStatus string

type WorkOrderPriority string

const (
	WorkOrderTypePreventive WorkOrderType = "preventive"
	WorkOrderTypeCorrective WorkOrderType = "corrective"
	WorkOrderTypeEmergency  WorkOrderType = "emergency"
)

const (
	WorkOrderStatusOpen       WorkOrderStatus = "open"
	WorkOrderStatusInProgress WorkOrderStatus = "in_progress"
	WorkOrderStatusCompleted  WorkOrderStatus = "completed"
	WorkOrderStatusCancelled  WorkOrderStatus = "cancelled"
)

const (
	WorkOrderPriorityLow      WorkOrderPriority = "low"
	WorkOrderPriorityMedium   WorkOrderPriority = "medium"
	WorkOrderPriorityHigh     WorkOrderPriority = "high"
	WorkOrderPriorityCritical WorkOrderPriority = "critical"
)

type AssetWorkOrder struct {
	ID           string            `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	WONumber     string            `gorm:"type:varchar(50);not null;uniqueIndex" json:"wo_number"`
	AssetID      string            `gorm:"type:uuid;not null;index" json:"asset_id"`
	Asset        *Asset            `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
	ScheduleID   *string           `gorm:"type:uuid;index" json:"schedule_id"`
	Schedule     *AssetMaintenanceSchedule `gorm:"foreignKey:ScheduleID" json:"schedule,omitempty"`
	WOType       WorkOrderType     `gorm:"type:varchar(20);not null" json:"wo_type"`
	Status       WorkOrderStatus   `gorm:"type:varchar(20);default:'open';index" json:"status"`
	Priority     WorkOrderPriority `gorm:"type:varchar(10);default:'medium';index" json:"priority"`
	Description  string            `gorm:"type:text" json:"description"`
	PlannedDate  *time.Time        `gorm:"type:date;index" json:"planned_date"`
	CompletedDate *time.Time       `gorm:"type:date" json:"completed_date"`
	AssignedTo   *string           `gorm:"type:uuid;index" json:"assigned_to"`
	Employee     *orgModels.Employee `gorm:"foreignKey:AssignedTo" json:"employee,omitempty"`
	ActualCost   float64           `gorm:"type:numeric(18,2);default:0" json:"actual_cost"`
	DowntimeHours float64          `gorm:"type:numeric(8,2);default:0" json:"downtime_hours"`
	Notes        string            `gorm:"type:text" json:"notes"`

	SpareParts []WorkOrderSparePart `gorm:"foreignKey:WorkOrderID;constraint:OnDelete:CASCADE" json:"spare_parts,omitempty"`

	CreatedBy *string `gorm:"type:uuid" json:"created_by"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (AssetWorkOrder) TableName() string {
	return "asset_work_orders"
}

func (wo *AssetWorkOrder) BeforeCreate(tx *gorm.DB) error {
	if wo.ID == "" {
		wo.ID = uuid.New().String()
	}
	return nil
}

// IsOpen mengecek apakah work order masih open
func (wo *AssetWorkOrder) IsOpen() bool {
	return wo.Status == WorkOrderStatusOpen || wo.Status == WorkOrderStatusInProgress
}

// IsCompleted mengecek apakah work order sudah selesai
func (wo *AssetWorkOrder) IsCompleted() bool {
	return wo.Status == WorkOrderStatusCompleted
}

// TotalSparePartsCost menghitung total biaya spare parts
func (wo *AssetWorkOrder) TotalSparePartsCost() float64 {
	total := 0.0
	for _, sp := range wo.SpareParts {
		total += sp.TotalCost
	}
	return total
}

// CalculateTotalCost menghitung total biaya (actual + spare parts)
func (wo *AssetWorkOrder) CalculateTotalCost() float64 {
	return wo.ActualCost + wo.TotalSparePartsCost()
}

// CanTransitionTo mengecek apakah status transition valid
func (wo *AssetWorkOrder) CanTransitionTo(newStatus WorkOrderStatus) bool {
	switch wo.Status {
	case WorkOrderStatusOpen:
		return newStatus == WorkOrderStatusInProgress || newStatus == WorkOrderStatusCancelled
	case WorkOrderStatusInProgress:
		return newStatus == WorkOrderStatusCompleted || newStatus == WorkOrderStatusCancelled
	case WorkOrderStatusCompleted, WorkOrderStatusCancelled:
		return false
	default:
		return false
	}
}
