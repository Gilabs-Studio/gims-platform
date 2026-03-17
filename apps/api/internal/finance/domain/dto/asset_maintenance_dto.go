package dto

import (
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
)

// Maintenance Schedule DTOs

type CreateMaintenanceScheduleRequest struct {
	AssetID           string                                  `json:"asset_id" binding:"required,uuid"`
	ScheduleType      financeModels.MaintenanceScheduleType   `json:"schedule_type" binding:"required,oneof=preventive corrective"`
	Frequency         financeModels.MaintenanceFrequency      `json:"frequency" binding:"required,oneof=daily weekly monthly yearly custom"`
	FrequencyValue    int                                     `json:"frequency_value" binding:"omitempty,min=1"`
	LastMaintenanceDate *string                               `json:"last_maintenance_date" binding:"omitempty"`
	NextMaintenanceDate string                                `json:"next_maintenance_date" binding:"required"`
	Description       string                                  `json:"description"`
	EstimatedCost     float64                                 `json:"estimated_cost" binding:"omitempty,gte=0"`
	AssignedTo        *string                                 `json:"assigned_to" binding:"omitempty,uuid"`
}

type UpdateMaintenanceScheduleRequest struct {
	ScheduleType      financeModels.MaintenanceScheduleType   `json:"schedule_type" binding:"required,oneof=preventive corrective"`
	Frequency         financeModels.MaintenanceFrequency      `json:"frequency" binding:"required,oneof=daily weekly monthly yearly custom"`
	FrequencyValue    int                                     `json:"frequency_value" binding:"omitempty,min=1"`
	LastMaintenanceDate *string                               `json:"last_maintenance_date" binding:"omitempty"`
	NextMaintenanceDate string                                `json:"next_maintenance_date" binding:"required"`
	Description       string                                  `json:"description"`
	EstimatedCost     float64                                 `json:"estimated_cost" binding:"omitempty,gte=0"`
	AssignedTo        *string                                 `json:"assigned_to" binding:"omitempty,uuid"`
	IsActive          bool                                    `json:"is_active"`
}

type ListMaintenanceSchedulesRequest struct {
	Page              int                                      `form:"page" binding:"omitempty,min=1"`
	PerPage           int                                      `form:"per_page" binding:"omitempty,min=1,max=100"`
	AssetID           *string                                  `form:"asset_id" binding:"omitempty,uuid"`
	ScheduleType      *financeModels.MaintenanceScheduleType   `form:"schedule_type" binding:"omitempty,oneof=preventive corrective"`
	IsActive          *bool                                    `form:"is_active"`
	Upcoming          *bool                                    `form:"upcoming"` // Filter for upcoming maintenance
	Overdue           *bool                                    `form:"overdue"`  // Filter for overdue maintenance
	SortBy            string                                   `form:"sort_by"`
	SortDir           string                                   `form:"sort_dir"`
}

type MaintenanceScheduleResponse struct {
	ID                   string                                 `json:"id"`
	AssetID              string                                 `json:"asset_id"`
	Asset                *AssetMiniResponse                     `json:"asset,omitempty"`
	ScheduleType         financeModels.MaintenanceScheduleType  `json:"schedule_type"`
	Frequency            financeModels.MaintenanceFrequency     `json:"frequency"`
	FrequencyValue       int                                    `json:"frequency_value"`
	LastMaintenanceDate  *time.Time                             `json:"last_maintenance_date"`
	NextMaintenanceDate  *time.Time                             `json:"next_maintenance_date"`
	Description          string                                 `json:"description"`
	EstimatedCost        float64                                `json:"estimated_cost"`
	AssignedTo           *string                                `json:"assigned_to"`
	Employee             *EmployeeMiniResponse                  `json:"employee,omitempty"`
	IsActive             bool                                   `json:"is_active"`
	IsOverdue            bool                                   `json:"is_overdue"`
	DaysUntilDue         int                                    `json:"days_until_due"`
	CreatedAt            time.Time                              `json:"created_at"`
	UpdatedAt            time.Time                              `json:"updated_at"`
}

// Work Order DTOs

type CreateWorkOrderRequest struct {
	AssetID       string                            `json:"asset_id" binding:"required,uuid"`
	ScheduleID    *string                           `json:"schedule_id" binding:"omitempty,uuid"`
	WOType        financeModels.WorkOrderType       `json:"wo_type" binding:"required,oneof=preventive corrective emergency"`
	Priority      financeModels.WorkOrderPriority   `json:"priority" binding:"omitempty,oneof=low medium high critical"`
	Description   string                            `json:"description" binding:"required"`
	PlannedDate   string                            `json:"planned_date" binding:"required"`
	AssignedTo    *string                           `json:"assigned_to" binding:"omitempty,uuid"`
	EstimatedCost float64                           `json:"estimated_cost" binding:"omitempty,gte=0"`
}

type UpdateWorkOrderRequest struct {
	Description   string                            `json:"description" binding:"required"`
	PlannedDate   string                            `json:"planned_date" binding:"required"`
	AssignedTo    *string                           `json:"assigned_to" binding:"omitempty,uuid"`
	EstimatedCost float64                           `json:"estimated_cost" binding:"omitempty,gte=0"`
}

type UpdateWorkOrderStatusRequest struct {
	Status        financeModels.WorkOrderStatus     `json:"status" binding:"required,oneof=open in_progress completed cancelled"`
	Notes         string                            `json:"notes"`
	ActualCost    float64                           `json:"actual_cost" binding:"omitempty,gte=0"`
	DowntimeHours float64                           `json:"downtime_hours" binding:"omitempty,gte=0"`
}

type ListWorkOrdersRequest struct {
	Page       int                               `form:"page" binding:"omitempty,min=1"`
	PerPage    int                               `form:"per_page" binding:"omitempty,min=1,max=100"`
	AssetID    *string                           `form:"asset_id" binding:"omitempty,uuid"`
	WOType     *financeModels.WorkOrderType      `form:"wo_type" binding:"omitempty,oneof=preventive corrective emergency"`
	Status     *financeModels.WorkOrderStatus    `form:"status" binding:"omitempty,oneof=open in_progress completed cancelled"`
	Priority   *financeModels.WorkOrderPriority  `form:"priority" binding:"omitempty,oneof=low medium high critical"`
	AssignedTo *string                           `form:"assigned_to" binding:"omitempty,uuid"`
	StartDate  *string                           `form:"start_date"`
	EndDate    *string                           `form:"end_date"`
	SortBy     string                            `form:"sort_by"`
	SortDir    string                            `form:"sort_dir"`
}

type WorkOrderSparePartRequest struct {
	SparePartID  string  `json:"spare_part_id" binding:"required,uuid"`
	QuantityUsed int     `json:"quantity_used" binding:"required,min=1"`
	UnitCost     float64 `json:"unit_cost" binding:"omitempty,gte=0"`
}

type WorkOrderResponse struct {
	ID            string                            `json:"id"`
	WONumber      string                            `json:"wo_number"`
	AssetID       string                            `json:"asset_id"`
	Asset         *AssetMiniResponse                `json:"asset,omitempty"`
	ScheduleID    *string                           `json:"schedule_id,omitempty"`
	WOType        financeModels.WorkOrderType       `json:"wo_type"`
	Status        financeModels.WorkOrderStatus     `json:"status"`
	Priority      financeModels.WorkOrderPriority   `json:"priority"`
	Description   string                            `json:"description"`
	PlannedDate   *time.Time                        `json:"planned_date"`
	CompletedDate *time.Time                        `json:"completed_date"`
	AssignedTo    *string                           `json:"assigned_to,omitempty"`
	Employee      *EmployeeMiniResponse             `json:"employee,omitempty"`
	ActualCost    float64                           `json:"actual_cost"`
	DowntimeHours float64                           `json:"downtime_hours"`
	Notes         string                            `json:"notes"`
	SpareParts    []WorkOrderSparePartResponse      `json:"spare_parts,omitempty"`
	TotalCost     float64                           `json:"total_cost"`
	CreatedAt     time.Time                         `json:"created_at"`
	UpdatedAt     time.Time                         `json:"updated_at"`
	CanTransition map[string]bool                   `json:"can_transition"`
}

type WorkOrderSparePartResponse struct {
	ID           string                `json:"id"`
	SparePartID  string                `json:"spare_part_id"`
	SparePart    *SparePartMiniResponse `json:"spare_part,omitempty"`
	QuantityUsed int                   `json:"quantity_used"`
	UnitCost     float64               `json:"unit_cost"`
	TotalCost    float64               `json:"total_cost"`
	CreatedAt    time.Time             `json:"created_at"`
}

// Spare Part DTOs

type CreateSparePartRequest struct {
	PartNumber    string  `json:"part_number" binding:"required,max=50"`
	PartName      string  `json:"part_name" binding:"required,max=255"`
	Description   string  `json:"description"`
	CategoryID    *string `json:"category_id" binding:"omitempty,uuid"`
	UnitOfMeasure string  `json:"unit_of_measure" binding:"omitempty,max=20"`
	MinStockLevel int     `json:"min_stock_level" binding:"omitempty,min=0"`
	MaxStockLevel *int    `json:"max_stock_level" binding:"omitempty,min=0"`
	ReorderPoint  int     `json:"reorder_point" binding:"omitempty,min=0"`
	CurrentStock  int     `json:"current_stock" binding:"omitempty,min=0"`
	UnitCost      float64 `json:"unit_cost" binding:"omitempty,gte=0"`
	SupplierID    *string `json:"supplier_id" binding:"omitempty,uuid"`
	Location      string  `json:"location"`
}

type UpdateSparePartRequest struct {
	PartName      string  `json:"part_name" binding:"required,max=255"`
	Description   string  `json:"description"`
	CategoryID    *string `json:"category_id" binding:"omitempty,uuid"`
	UnitOfMeasure string  `json:"unit_of_measure" binding:"omitempty,max=20"`
	MinStockLevel int     `json:"min_stock_level" binding:"omitempty,min=0"`
	MaxStockLevel *int    `json:"max_stock_level" binding:"omitempty,min=0"`
	ReorderPoint  int     `json:"reorder_point" binding:"omitempty,min=0"`
	UnitCost      float64 `json:"unit_cost" binding:"omitempty,gte=0"`
	SupplierID    *string `json:"supplier_id" binding:"omitempty,uuid"`
	Location      string  `json:"location"`
	IsActive      bool    `json:"is_active"`
}

type UpdateSparePartStockRequest struct {
	CurrentStock int     `json:"current_stock" binding:"required,min=0"`
	Reason       string  `json:"reason" binding:"required"`
}

type ListSparePartsRequest struct {
	Page         int     `form:"page" binding:"omitempty,min=1"`
	PerPage      int     `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search       string  `form:"search"`
	CategoryID   *string `form:"category_id" binding:"omitempty,uuid"`
	IsActive     *bool   `form:"is_active"`
	LowStock     *bool   `form:"low_stock"` // Filter for low stock items
	AssetID      *string `form:"asset_id" binding:"omitempty,uuid"` // Filter by linked asset
	SortBy       string  `form:"sort_by"`
	SortDir      string  `form:"sort_dir"`
}

type SparePartResponse struct {
	ID             string                `json:"id"`
	PartNumber     string                `json:"part_number"`
	PartName       string                `json:"part_name"`
	Description    string                `json:"description"`
	CategoryID     *string               `json:"category_id,omitempty"`
	UnitOfMeasure  string                `json:"unit_of_measure"`
	MinStockLevel  int                   `json:"min_stock_level"`
	MaxStockLevel  *int                  `json:"max_stock_level,omitempty"`
	ReorderPoint   int                   `json:"reorder_point"`
	CurrentStock   int                   `json:"current_stock"`
	UnitCost       float64               `json:"unit_cost"`
	StockValue     float64               `json:"stock_value"`
	SupplierID     *string               `json:"supplier_id,omitempty"`
	Location       string                `json:"location"`
	IsActive       bool                  `json:"is_active"`
	IsLowStock     bool                  `json:"is_low_stock"`
	IsOutOfStock   bool                  `json:"is_out_of_stock"`
	LinkedAssets   []AssetMiniResponse   `json:"linked_assets,omitempty"`
	CreatedAt      time.Time             `json:"created_at"`
	UpdatedAt      time.Time             `json:"updated_at"`
}

type SparePartMiniResponse struct {
	ID           string  `json:"id"`
	PartNumber   string  `json:"part_number"`
	PartName     string  `json:"part_name"`
	UnitOfMeasure string `json:"unit_of_measure"`
	CurrentStock int     `json:"current_stock"`
	UnitCost     float64 `json:"unit_cost"`
}

// Asset-Spare Part Link DTOs

type CreateAssetSparePartLinkRequest struct {
	AssetID          string `json:"asset_id" binding:"required,uuid"`
	SparePartID      string `json:"spare_part_id" binding:"required,uuid"`
	QuantityPerAsset int    `json:"quantity_per_asset" binding:"required,min=1"`
	Notes            string `json:"notes"`
}

// Maintenance Alert DTOs

type MaintenanceAlertResponse struct {
	Type            string    `json:"type"` // overdue, upcoming, low_stock
	Title           string    `json:"title"`
	Description     string    `json:"description"`
	AssetID         string    `json:"asset_id"`
	AssetCode       string    `json:"asset_code"`
	AssetName       string    `json:"asset_name"`
	DueDate         *time.Time `json:"due_date,omitempty"`
	DaysOverdue     int       `json:"days_overdue,omitempty"`
	DaysUntilDue    int       `json:"days_until_due,omitempty"`
	ScheduleID      *string   `json:"schedule_id,omitempty"`
	SparePartID     *string   `json:"spare_part_id,omitempty"`
	SparePartName   *string   `json:"spare_part_name,omitempty"`
	CurrentStock    int       `json:"current_stock,omitempty"`
	ReorderPoint    int       `json:"reorder_point,omitempty"`
}

type MaintenanceDashboardResponse struct {
	TotalSchedules      int                         `json:"total_schedules"`
	ActiveSchedules     int                         `json:"active_schedules"`
	OverdueMaintenance  int                         `json:"overdue_maintenance"`
	UpcomingMaintenance int                         `json:"upcoming_maintenance"` // next 7 days
	OpenWorkOrders      int                         `json:"open_work_orders"`
	InProgressWorkOrders int                        `json:"in_progress_work_orders"`
	CompletedThisMonth  int                         `json:"completed_this_month"`
	TotalSpareParts     int                         `json:"total_spare_parts"`
	LowStockItems       int                         `json:"low_stock_items"`
	TotalMaintenanceCost float64                    `json:"total_maintenance_cost_this_month"`
	Alerts              []MaintenanceAlertResponse  `json:"alerts"`
}

// Mini response untuk relasi

type EmployeeMiniResponse struct {
	ID           string `json:"id"`
	EmployeeCode string `json:"employee_code"`
	Name         string `json:"name"`
	Email        string `json:"email,omitempty"`
}

// Form Data DTOs

type UOMMiniResponse struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Symbol string `json:"symbol"`
}

type WarehouseMiniResponse struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}

type MaintenanceFormDataResponse struct {
	Assets     []AssetMiniResponse    `json:"assets"`
	Employees  []EmployeeMiniResponse `json:"employees"`
	UOMs       []UOMMiniResponse      `json:"uoms"`
	Warehouses []WarehouseMiniResponse `json:"warehouses"`
}
