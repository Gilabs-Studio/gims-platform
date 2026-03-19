package repositories

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

// MaintenanceScheduleListParams parameter untuk list schedules
type MaintenanceScheduleListParams struct {
	AssetID      *string
	ScheduleType *financeModels.MaintenanceScheduleType
	IsActive     *bool
	Upcoming     *bool  // Filter untuk maintenance dalam 7 hari ke depan
	Overdue      *bool  // Filter untuk maintenance yang overdue
	Limit        int
	Offset       int
	SortBy       string
	SortDir      string
}

// WorkOrderListParams parameter untuk list work orders
type WorkOrderListParams struct {
	AssetID    *string
	WOType     *financeModels.WorkOrderType
	Status     *financeModels.WorkOrderStatus
	Priority   *financeModels.WorkOrderPriority
	AssignedTo *string
	StartDate  *time.Time
	EndDate    *time.Time
	Limit      int
	Offset     int
	SortBy     string
	SortDir    string
}

// SparePartListParams parameter untuk list spare parts
type SparePartListParams struct {
	Search     string
	CategoryID *string
	IsActive   *bool
	LowStock   *bool  // Filter untuk low stock items
	AssetID    *string // Filter untuk spare parts yang terhubung ke asset tertentu
	Limit      int
	Offset     int
	SortBy     string
	SortDir    string
}

// MaintenanceRepository interface untuk maintenance operations
type MaintenanceRepository interface {
	// Maintenance Schedules
	FindScheduleByID(ctx context.Context, id string) (*financeModels.AssetMaintenanceSchedule, error)
	ListSchedules(ctx context.Context, params MaintenanceScheduleListParams) ([]financeModels.AssetMaintenanceSchedule, int64, error)
	CreateSchedule(ctx context.Context, schedule *financeModels.AssetMaintenanceSchedule) error
	UpdateSchedule(ctx context.Context, schedule *financeModels.AssetMaintenanceSchedule) error
	DeleteSchedule(ctx context.Context, id string) error
	GetOverdueSchedules(ctx context.Context) ([]financeModels.AssetMaintenanceSchedule, error)
	GetUpcomingSchedules(ctx context.Context, days int) ([]financeModels.AssetMaintenanceSchedule, error)

	// Work Orders
	FindWorkOrderByID(ctx context.Context, id string) (*financeModels.AssetWorkOrder, error)
	ListWorkOrders(ctx context.Context, params WorkOrderListParams) ([]financeModels.AssetWorkOrder, int64, error)
	CreateWorkOrder(ctx context.Context, wo *financeModels.AssetWorkOrder) error
	UpdateWorkOrder(ctx context.Context, wo *financeModels.AssetWorkOrder) error
	UpdateWorkOrderStatus(ctx context.Context, id string, status financeModels.WorkOrderStatus, notes string) error
	DeleteWorkOrder(ctx context.Context, id string) error
	GenerateWONumber(ctx context.Context) (string, error)

	// Work Order Spare Parts
	AddWorkOrderSparePart(ctx context.Context, wsp *financeModels.WorkOrderSparePart) error
	RemoveWorkOrderSparePart(ctx context.Context, id string) error
	GetWorkOrderSpareParts(ctx context.Context, workOrderID string) ([]financeModels.WorkOrderSparePart, error)

	// Spare Parts
	FindSparePartByID(ctx context.Context, id string) (*financeModels.AssetSparePart, error)
	FindSparePartByPartNumber(ctx context.Context, partNumber string) (*financeModels.AssetSparePart, error)
	ListSpareParts(ctx context.Context, params SparePartListParams) ([]financeModels.AssetSparePart, int64, error)
	CreateSparePart(ctx context.Context, sp *financeModels.AssetSparePart) error
	UpdateSparePart(ctx context.Context, sp *financeModels.AssetSparePart) error
	UpdateSparePartStock(ctx context.Context, id string, newStock int) error
	DeleteSparePart(ctx context.Context, id string) error
	GetLowStockParts(ctx context.Context) ([]financeModels.AssetSparePart, error)

	// Asset-Spare Part Links
	LinkAssetToSparePart(ctx context.Context, link *financeModels.AssetSparePartLink) error
	UnlinkAssetFromSparePart(ctx context.Context, assetID, sparePartID string) error
	GetSparePartsByAsset(ctx context.Context, assetID string) ([]financeModels.AssetSparePart, error)
	GetAssetsBySparePart(ctx context.Context, sparePartID string) ([]financeModels.Asset, error)

	// Dashboard & Reports
	GetDashboardStats(ctx context.Context) (*MaintenanceDashboardStats, error)
	GetMaintenanceCostByPeriod(ctx context.Context, startDate, endDate time.Time) (float64, error)

	// Form Data
	ListAssetsForForm(ctx context.Context) ([]dto.AssetMiniResponse, error)
	ListEmployeesForForm(ctx context.Context) ([]dto.EmployeeMiniResponse, error)
	ListUOMsForForm(ctx context.Context) ([]dto.UOMMiniResponse, error)
	ListWarehousesForForm(ctx context.Context) ([]dto.WarehouseMiniResponse, error)
}

// MaintenanceDashboardStats statistik untuk dashboard
type MaintenanceDashboardStats struct {
	TotalSchedules         int64
	ActiveSchedules        int64
	OverdueMaintenance     int64
	UpcomingMaintenance    int64
	OpenWorkOrders         int64
	InProgressWorkOrders   int64
	CompletedThisMonth     int64
	TotalSpareParts        int64
	LowStockItems          int64
	TotalMaintenanceCost   float64
}

type maintenanceRepository struct {
	db *gorm.DB
}

func NewMaintenanceRepository(db *gorm.DB) MaintenanceRepository {
	return &maintenanceRepository{db: db}
}

// ==================== Maintenance Schedule Methods ====================

func (r *maintenanceRepository) FindScheduleByID(ctx context.Context, id string) (*financeModels.AssetMaintenanceSchedule, error) {
	var schedule financeModels.AssetMaintenanceSchedule
	err := r.db.WithContext(ctx).
		Preload("Asset").
		Preload("Asset.Category").
		Preload("Employee").
		First(&schedule, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &schedule, nil
}

var scheduleAllowedSort = map[string]string{
	"created_at":           "asset_maintenance_schedules.created_at",
	"updated_at":           "asset_maintenance_schedules.updated_at",
	"next_maintenance_date": "asset_maintenance_schedules.next_maintenance_date",
	"asset_id":             "asset_maintenance_schedules.asset_id",
}

func (r *maintenanceRepository) ListSchedules(ctx context.Context, params MaintenanceScheduleListParams) ([]financeModels.AssetMaintenanceSchedule, int64, error) {
	var items []financeModels.AssetMaintenanceSchedule
	var total int64

	q := r.db.WithContext(ctx).Model(&financeModels.AssetMaintenanceSchedule{}).
		Preload("Asset").
		Preload("Employee")

	if params.AssetID != nil {
		q = q.Where("asset_id = ?", *params.AssetID)
	}
	if params.ScheduleType != nil {
		q = q.Where("schedule_type = ?", *params.ScheduleType)
	}
	if params.IsActive != nil {
		q = q.Where("is_active = ?", *params.IsActive)
	}
	if params.Upcoming != nil && *params.Upcoming {
		// Next maintenance date dalam 7 hari ke depan
		q = q.Where("next_maintenance_date <= ?", time.Now().AddDate(0, 0, 7))
		q = q.Where("next_maintenance_date >= ?", time.Now())
		q = q.Where("is_active = ?", true)
	}
	if params.Overdue != nil && *params.Overdue {
		// Next maintenance date sudah lewat
		q = q.Where("next_maintenance_date < ?", time.Now())
		q = q.Where("is_active = ?", true)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := scheduleAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = scheduleAllowedSort["next_maintenance_date"]
	}
	sortDir := strings.ToLower(strings.TrimSpace(params.SortDir))
	if sortDir != "asc" {
		sortDir = "desc"
	}
	q = q.Order(sortCol + " " + sortDir)

	if params.Limit > 0 {
		q = q.Limit(params.Limit)
	}
	if params.Offset > 0 {
		q = q.Offset(params.Offset)
	}

	if err := q.Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *maintenanceRepository) CreateSchedule(ctx context.Context, schedule *financeModels.AssetMaintenanceSchedule) error {
	return r.db.WithContext(ctx).Create(schedule).Error
}

func (r *maintenanceRepository) UpdateSchedule(ctx context.Context, schedule *financeModels.AssetMaintenanceSchedule) error {
	return r.db.WithContext(ctx).Save(schedule).Error
}

func (r *maintenanceRepository) DeleteSchedule(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&financeModels.AssetMaintenanceSchedule{}, "id = ?", id).Error
}

func (r *maintenanceRepository) GetOverdueSchedules(ctx context.Context) ([]financeModels.AssetMaintenanceSchedule, error) {
	var items []financeModels.AssetMaintenanceSchedule
	err := r.db.WithContext(ctx).
		Preload("Asset").
		Preload("Employee").
		Where("next_maintenance_date < ?", time.Now()).
		Where("is_active = ?", true).
		Find(&items).Error
	return items, err
}

func (r *maintenanceRepository) GetUpcomingSchedules(ctx context.Context, days int) ([]financeModels.AssetMaintenanceSchedule, error) {
	var items []financeModels.AssetMaintenanceSchedule
	err := r.db.WithContext(ctx).
		Preload("Asset").
		Preload("Employee").
		Where("next_maintenance_date >= ?", time.Now()).
		Where("next_maintenance_date <= ?", time.Now().AddDate(0, 0, days)).
		Where("is_active = ?", true).
		Find(&items).Error
	return items, err
}

// ==================== Work Order Methods ====================

func (r *maintenanceRepository) FindWorkOrderByID(ctx context.Context, id string) (*financeModels.AssetWorkOrder, error) {
	var wo financeModels.AssetWorkOrder
	err := r.db.WithContext(ctx).
		Preload("Asset").
		Preload("Asset.Category").
		Preload("Schedule").
		Preload("Employee").
		Preload("SpareParts").
		Preload("SpareParts.SparePart").
		First(&wo, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &wo, nil
}

var workOrderAllowedSort = map[string]string{
	"created_at":   "asset_work_orders.created_at",
	"updated_at":   "asset_work_orders.updated_at",
	"planned_date": "asset_work_orders.planned_date",
	"status":       "asset_work_orders.status",
	"priority":     "asset_work_orders.priority",
	"wo_number":    "asset_work_orders.wo_number",
}

func (r *maintenanceRepository) ListWorkOrders(ctx context.Context, params WorkOrderListParams) ([]financeModels.AssetWorkOrder, int64, error) {
	var items []financeModels.AssetWorkOrder
	var total int64

	q := r.db.WithContext(ctx).Model(&financeModels.AssetWorkOrder{}).
		Preload("Asset").
		Preload("Employee")

	if params.AssetID != nil {
		q = q.Where("asset_id = ?", *params.AssetID)
	}
	if params.WOType != nil {
		q = q.Where("wo_type = ?", *params.WOType)
	}
	if params.Status != nil {
		q = q.Where("status = ?", *params.Status)
	}
	if params.Priority != nil {
		q = q.Where("priority = ?", *params.Priority)
	}
	if params.AssignedTo != nil {
		q = q.Where("assigned_to = ?", *params.AssignedTo)
	}
	if params.StartDate != nil {
		q = q.Where("planned_date >= ?", *params.StartDate)
	}
	if params.EndDate != nil {
		q = q.Where("planned_date <= ?", *params.EndDate)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := workOrderAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = workOrderAllowedSort["created_at"]
	}
	sortDir := strings.ToLower(strings.TrimSpace(params.SortDir))
	if sortDir != "asc" {
		sortDir = "desc"
	}
	q = q.Order(sortCol + " " + sortDir)

	if params.Limit > 0 {
		q = q.Limit(params.Limit)
	}
	if params.Offset > 0 {
		q = q.Offset(params.Offset)
	}

	if err := q.Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *maintenanceRepository) CreateWorkOrder(ctx context.Context, wo *financeModels.AssetWorkOrder) error {
	return r.db.WithContext(ctx).Create(wo).Error
}

func (r *maintenanceRepository) UpdateWorkOrder(ctx context.Context, wo *financeModels.AssetWorkOrder) error {
	return r.db.WithContext(ctx).Save(wo).Error
}

func (r *maintenanceRepository) UpdateWorkOrderStatus(ctx context.Context, id string, status financeModels.WorkOrderStatus, notes string) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if notes != "" {
		updates["notes"] = notes
	}
	if status == financeModels.WorkOrderStatusCompleted {
		now := apptime.Now()
		updates["completed_date"] = now
	}
	return r.db.WithContext(ctx).
		Model(&financeModels.AssetWorkOrder{}).
		Where("id = ?", id).
		Updates(updates).Error
}

func (r *maintenanceRepository) DeleteWorkOrder(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&financeModels.AssetWorkOrder{}, "id = ?", id).Error
}

func (r *maintenanceRepository) GenerateWONumber(ctx context.Context) (string, error) {
	now := apptime.Now()
	prefix := "WO-" + now.Format("200601") + "-"

	var lastWO financeModels.AssetWorkOrder
	err := r.db.WithContext(ctx).
		Unscoped().
		Where("wo_number LIKE ?", prefix+"%").
		Order("wo_number DESC").
		First(&lastWO).Error

	nextNum := 1
	if err == nil {
		parts := strings.Split(lastWO.WONumber, "-")
		if len(parts) == 3 {
			var lastNum int
			fmt.Sscanf(parts[2], "%d", &lastNum)
			nextNum = lastNum + 1
		}
	}

	return fmt.Sprintf("%s%04d", prefix, nextNum), nil
}

// ==================== Work Order Spare Parts Methods ====================

func (r *maintenanceRepository) AddWorkOrderSparePart(ctx context.Context, wsp *financeModels.WorkOrderSparePart) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Create work order spare part
		if err := tx.Create(wsp).Error; err != nil {
			return err
		}

		// Reduce spare part stock
		if err := tx.Model(&financeModels.AssetSparePart{}).
			Where("id = ?", wsp.SparePartID).
			UpdateColumn("current_stock", gorm.Expr("current_stock - ?", wsp.QuantityUsed)).Error; err != nil {
			return err
		}

		return nil
	})
}

func (r *maintenanceRepository) RemoveWorkOrderSparePart(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get the spare part usage first
		var wsp financeModels.WorkOrderSparePart
		if err := tx.First(&wsp, "id = ?", id).Error; err != nil {
			return err
		}

		// Restore stock
		if err := tx.Model(&financeModels.AssetSparePart{}).
			Where("id = ?", wsp.SparePartID).
			UpdateColumn("current_stock", gorm.Expr("current_stock + ?", wsp.QuantityUsed)).Error; err != nil {
			return err
		}

		// Delete the record
		return tx.Delete(&financeModels.WorkOrderSparePart{}, "id = ?", id).Error
	})
}

func (r *maintenanceRepository) GetWorkOrderSpareParts(ctx context.Context, workOrderID string) ([]financeModels.WorkOrderSparePart, error) {
	var items []financeModels.WorkOrderSparePart
	err := r.db.WithContext(ctx).
		Preload("SparePart").
		Where("work_order_id = ?", workOrderID).
		Find(&items).Error
	return items, err
}

// ==================== Spare Part Methods ====================

func (r *maintenanceRepository) FindSparePartByID(ctx context.Context, id string) (*financeModels.AssetSparePart, error) {
	var sp financeModels.AssetSparePart
	err := r.db.WithContext(ctx).
		Preload("AssetLinks.Asset").
		First(&sp, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &sp, nil
}

func (r *maintenanceRepository) FindSparePartByPartNumber(ctx context.Context, partNumber string) (*financeModels.AssetSparePart, error) {
	var sp financeModels.AssetSparePart
	err := r.db.WithContext(ctx).
		Where("part_number = ?", partNumber).
		First(&sp).Error
	if err != nil {
		return nil, err
	}
	return &sp, nil
}

var sparePartAllowedSort = map[string]string{
	"created_at":    "asset_spare_parts.created_at",
	"updated_at":    "asset_spare_parts.updated_at",
	"part_number":   "asset_spare_parts.part_number",
	"part_name":     "asset_spare_parts.part_name",
	"current_stock": "asset_spare_parts.current_stock",
}

func (r *maintenanceRepository) ListSpareParts(ctx context.Context, params SparePartListParams) ([]financeModels.AssetSparePart, int64, error) {
	var items []financeModels.AssetSparePart
	var total int64

	q := r.db.WithContext(ctx).Model(&financeModels.AssetSparePart{})

	if s := strings.TrimSpace(params.Search); s != "" {
		like := "%" + s + "%"
		q = q.Where("part_number ILIKE ? OR part_name ILIKE ? OR description ILIKE ?", like, like, like)
	}
	if params.CategoryID != nil {
		q = q.Where("category_id = ?", *params.CategoryID)
	}
	if params.IsActive != nil {
		q = q.Where("is_active = ?", *params.IsActive)
	}
	if params.LowStock != nil && *params.LowStock {
		q = q.Where("current_stock <= reorder_point")
	}
	if params.AssetID != nil {
		// Join dengan asset_spare_part_links
		q = q.Joins("JOIN asset_spare_part_links ON asset_spare_part_links.spare_part_id = asset_spare_parts.id").
			Where("asset_spare_part_links.asset_id = ?", *params.AssetID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := sparePartAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = sparePartAllowedSort["part_number"]
	}
	sortDir := strings.ToLower(strings.TrimSpace(params.SortDir))
	if sortDir != "asc" {
		sortDir = "desc"
	}
	q = q.Order(sortCol + " " + sortDir)

	if params.Limit > 0 {
		q = q.Limit(params.Limit)
	}
	if params.Offset > 0 {
		q = q.Offset(params.Offset)
	}

	if err := q.Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *maintenanceRepository) CreateSparePart(ctx context.Context, sp *financeModels.AssetSparePart) error {
	return r.db.WithContext(ctx).Create(sp).Error
}

func (r *maintenanceRepository) UpdateSparePart(ctx context.Context, sp *financeModels.AssetSparePart) error {
	return r.db.WithContext(ctx).Save(sp).Error
}

func (r *maintenanceRepository) UpdateSparePartStock(ctx context.Context, id string, newStock int) error {
	return r.db.WithContext(ctx).
		Model(&financeModels.AssetSparePart{}).
		Where("id = ?", id).
		Update("current_stock", newStock).Error
}

func (r *maintenanceRepository) DeleteSparePart(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&financeModels.AssetSparePart{}, "id = ?", id).Error
}

func (r *maintenanceRepository) GetLowStockParts(ctx context.Context) ([]financeModels.AssetSparePart, error) {
	var items []financeModels.AssetSparePart
	err := r.db.WithContext(ctx).
		Where("current_stock <= reorder_point").
		Where("is_active = ?", true).
		Find(&items).Error
	return items, err
}

// ==================== Asset-Spare Part Link Methods ====================

func (r *maintenanceRepository) LinkAssetToSparePart(ctx context.Context, link *financeModels.AssetSparePartLink) error {
	return r.db.WithContext(ctx).Create(link).Error
}

func (r *maintenanceRepository) UnlinkAssetFromSparePart(ctx context.Context, assetID, sparePartID string) error {
	return r.db.WithContext(ctx).
		Delete(&financeModels.AssetSparePartLink{}, "asset_id = ? AND spare_part_id = ?", assetID, sparePartID).Error
}

func (r *maintenanceRepository) GetSparePartsByAsset(ctx context.Context, assetID string) ([]financeModels.AssetSparePart, error) {
	var items []financeModels.AssetSparePart
	err := r.db.WithContext(ctx).
		Joins("JOIN asset_spare_part_links ON asset_spare_part_links.spare_part_id = asset_spare_parts.id").
		Where("asset_spare_part_links.asset_id = ?", assetID).
		Find(&items).Error
	return items, err
}

func (r *maintenanceRepository) GetAssetsBySparePart(ctx context.Context, sparePartID string) ([]financeModels.Asset, error) {
	var items []financeModels.Asset
	err := r.db.WithContext(ctx).
		Joins("JOIN asset_spare_part_links ON asset_spare_part_links.asset_id = assets.id").
		Where("asset_spare_part_links.spare_part_id = ?", sparePartID).
		Find(&items).Error
	return items, err
}

// ==================== Dashboard & Reports Methods ====================

func (r *maintenanceRepository) GetDashboardStats(ctx context.Context) (*MaintenanceDashboardStats, error) {
	stats := &MaintenanceDashboardStats{}

	// Total schedules
	r.db.WithContext(ctx).Model(&financeModels.AssetMaintenanceSchedule{}).Count(&stats.TotalSchedules)

	// Active schedules
	r.db.WithContext(ctx).Model(&financeModels.AssetMaintenanceSchedule{}).Where("is_active = ?", true).Count(&stats.ActiveSchedules)

	// Overdue maintenance
	r.db.WithContext(ctx).Model(&financeModels.AssetMaintenanceSchedule{}).
		Where("next_maintenance_date < ?", time.Now()).
		Where("is_active = ?", true).
		Count(&stats.OverdueMaintenance)

	// Upcoming maintenance (next 7 days)
	r.db.WithContext(ctx).Model(&financeModels.AssetMaintenanceSchedule{}).
		Where("next_maintenance_date >= ?", time.Now()).
		Where("next_maintenance_date <= ?", time.Now().AddDate(0, 0, 7)).
		Where("is_active = ?", true).
		Count(&stats.UpcomingMaintenance)

	// Open work orders
	r.db.WithContext(ctx).Model(&financeModels.AssetWorkOrder{}).
		Where("status = ?", financeModels.WorkOrderStatusOpen).
		Count(&stats.OpenWorkOrders)

	// In progress work orders
	r.db.WithContext(ctx).Model(&financeModels.AssetWorkOrder{}).
		Where("status = ?", financeModels.WorkOrderStatusInProgress).
		Count(&stats.InProgressWorkOrders)

	// Completed this month
	startOfMonth := time.Date(time.Now().Year(), time.Now().Month(), 1, 0, 0, 0, 0, time.Now().Location())
	r.db.WithContext(ctx).Model(&financeModels.AssetWorkOrder{}).
		Where("status = ?", financeModels.WorkOrderStatusCompleted).
		Where("completed_date >= ?", startOfMonth).
		Count(&stats.CompletedThisMonth)

	// Total spare parts
	r.db.WithContext(ctx).Model(&financeModels.AssetSparePart{}).Count(&stats.TotalSpareParts)

	// Low stock items
	r.db.WithContext(ctx).Model(&financeModels.AssetSparePart{}).
		Where("current_stock <= reorder_point").
		Where("is_active = ?", true).
		Count(&stats.LowStockItems)

	// Total maintenance cost this month
	var totalCost float64
	r.db.WithContext(ctx).Model(&financeModels.AssetWorkOrder{}).
		Where("status = ?", financeModels.WorkOrderStatusCompleted).
		Where("completed_date >= ?", startOfMonth).
		Select("COALESCE(SUM(actual_cost), 0)").
		Scan(&totalCost)
	stats.TotalMaintenanceCost = totalCost

	return stats, nil
}

func (r *maintenanceRepository) GetMaintenanceCostByPeriod(ctx context.Context, startDate, endDate time.Time) (float64, error) {
	var totalCost float64
	err := r.db.WithContext(ctx).Model(&financeModels.AssetWorkOrder{}).
		Where("status = ?", financeModels.WorkOrderStatusCompleted).
		Where("completed_date >= ?", startDate).
		Where("completed_date <= ?", endDate).
		Select("COALESCE(SUM(actual_cost), 0)").
		Scan(&totalCost).Error
	return totalCost, err
}

// ==================== Form Data Methods ====================

func (r *maintenanceRepository) ListAssetsForForm(ctx context.Context) ([]dto.AssetMiniResponse, error) {
	var assets []dto.AssetMiniResponse
	err := r.db.WithContext(ctx).Model(&financeModels.Asset{}).
		Select("id, code, name").
		Where("status != ?", financeModels.AssetStatusDisposed).
		Order("code ASC").
		Scan(&assets).Error
	return assets, err
}

func (r *maintenanceRepository) ListEmployeesForForm(ctx context.Context) ([]dto.EmployeeMiniResponse, error) {
	var employees []dto.EmployeeMiniResponse
	err := r.db.WithContext(ctx).Table("employees").
		Select("id, employee_code, name, email").
		Where("is_active = ?", true).
		Order("name ASC").
		Scan(&employees).Error
	return employees, err
}

func (r *maintenanceRepository) ListUOMsForForm(ctx context.Context) ([]dto.UOMMiniResponse, error) {
	var uoms []dto.UOMMiniResponse
	err := r.db.WithContext(ctx).Table("units_of_measure").
		Select("id, name, symbol").
		Where("is_active = ?", true).
		Order("name ASC").
		Scan(&uoms).Error
	return uoms, err
}

func (r *maintenanceRepository) ListWarehousesForForm(ctx context.Context) ([]dto.WarehouseMiniResponse, error) {
	var warehouses []dto.WarehouseMiniResponse
	err := r.db.WithContext(ctx).Table("warehouses").
		Select("id, code, name").
		Where("is_active = ?", true).
		Order("code ASC").
		Scan(&warehouses).Error
	return warehouses, err
}
