package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"gorm.io/gorm"
)

var (
	ErrMaintenanceScheduleNotFound = errors.New("maintenance schedule not found")
	ErrWorkOrderNotFound          = errors.New("work order not found")
	ErrSparePartNotFound          = errors.New("spare part not found")
	ErrInvalidStatusTransition    = errors.New("invalid status transition")
	ErrPartNumberExists           = errors.New("part number already exists")
	ErrInsufficientStock          = errors.New("insufficient stock")
)

type AssetMaintenanceUsecase interface {
	// Maintenance Schedules
	CreateSchedule(ctx context.Context, req *dto.CreateMaintenanceScheduleRequest) (*dto.MaintenanceScheduleResponse, error)
	UpdateSchedule(ctx context.Context, id string, req *dto.UpdateMaintenanceScheduleRequest) (*dto.MaintenanceScheduleResponse, error)
	DeleteSchedule(ctx context.Context, id string) error
	GetScheduleByID(ctx context.Context, id string) (*dto.MaintenanceScheduleResponse, error)
	ListSchedules(ctx context.Context, req *dto.ListMaintenanceSchedulesRequest) ([]dto.MaintenanceScheduleResponse, int64, error)

	// Work Orders
	CreateWorkOrder(ctx context.Context, req *dto.CreateWorkOrderRequest) (*dto.WorkOrderResponse, error)
	UpdateWorkOrder(ctx context.Context, id string, req *dto.UpdateWorkOrderRequest) (*dto.WorkOrderResponse, error)
	UpdateWorkOrderStatus(ctx context.Context, id string, req *dto.UpdateWorkOrderStatusRequest) (*dto.WorkOrderResponse, error)
	DeleteWorkOrder(ctx context.Context, id string) error
	GetWorkOrderByID(ctx context.Context, id string) (*dto.WorkOrderResponse, error)
	ListWorkOrders(ctx context.Context, req *dto.ListWorkOrdersRequest) ([]dto.WorkOrderResponse, int64, error)
	AddSparePartToWorkOrder(ctx context.Context, workOrderID string, req *dto.WorkOrderSparePartRequest) (*dto.WorkOrderResponse, error)
	RemoveSparePartFromWorkOrder(ctx context.Context, workOrderID string, sparePartUsageID string) (*dto.WorkOrderResponse, error)

	// Spare Parts
	CreateSparePart(ctx context.Context, req *dto.CreateSparePartRequest) (*dto.SparePartResponse, error)
	UpdateSparePart(ctx context.Context, id string, req *dto.UpdateSparePartRequest) (*dto.SparePartResponse, error)
	UpdateSparePartStock(ctx context.Context, id string, req *dto.UpdateSparePartStockRequest) (*dto.SparePartResponse, error)
	DeleteSparePart(ctx context.Context, id string) error
	GetSparePartByID(ctx context.Context, id string) (*dto.SparePartResponse, error)
	ListSpareParts(ctx context.Context, req *dto.ListSparePartsRequest) ([]dto.SparePartResponse, int64, error)

	// Asset-Spare Part Links
	LinkAssetToSparePart(ctx context.Context, req *dto.CreateAssetSparePartLinkRequest) error
	UnlinkAssetFromSparePart(ctx context.Context, assetID, sparePartID string) error

	// Dashboard & Alerts
	GetDashboard(ctx context.Context) (*dto.MaintenanceDashboardResponse, error)
	GetAlerts(ctx context.Context) ([]dto.MaintenanceAlertResponse, error)

	// Form Data
	GetFormData(ctx context.Context) (*dto.MaintenanceFormDataResponse, error)
}

type assetMaintenanceUsecase struct {
	db   *gorm.DB
	repo repositories.MaintenanceRepository
}

func NewAssetMaintenanceUsecase(db *gorm.DB, repo repositories.MaintenanceRepository) AssetMaintenanceUsecase {
	return &assetMaintenanceUsecase{db: db, repo: repo}
}

// ==================== Helper Functions ====================

func parseMaintenanceDate(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, errors.New("date is required")
	}
	return time.Parse("2006-01-02", value)
}

func getMaintenanceActorID(ctx context.Context) string {
	actorID, _ := ctx.Value("user_id").(string)
	return strings.TrimSpace(actorID)
}

// ==================== Maintenance Schedule Methods ====================

func (uc *assetMaintenanceUsecase) CreateSchedule(ctx context.Context, req *dto.CreateMaintenanceScheduleRequest) (*dto.MaintenanceScheduleResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID := getMaintenanceActorID(ctx)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	nextDate, err := parseMaintenanceDate(req.NextMaintenanceDate)
	if err != nil {
		return nil, err
	}

	var lastDate *time.Time
	if req.LastMaintenanceDate != nil && *req.LastMaintenanceDate != "" {
		parsed, err := parseMaintenanceDate(*req.LastMaintenanceDate)
		if err != nil {
			return nil, err
		}
		lastDate = &parsed
	}

	if req.FrequencyValue < 1 {
		req.FrequencyValue = 1
	}

	schedule := &financeModels.AssetMaintenanceSchedule{
		AssetID:             strings.TrimSpace(req.AssetID),
		ScheduleType:        req.ScheduleType,
		Frequency:           req.Frequency,
		FrequencyValue:      req.FrequencyValue,
		LastMaintenanceDate: lastDate,
		NextMaintenanceDate: &nextDate,
		Description:         strings.TrimSpace(req.Description),
		EstimatedCost:       req.EstimatedCost,
		AssignedTo:          req.AssignedTo,
		IsActive:            true,
	}

	if err := uc.repo.CreateSchedule(ctx, schedule); err != nil {
		return nil, err
	}

	return uc.GetScheduleByID(ctx, schedule.ID)
}

func (uc *assetMaintenanceUsecase) UpdateSchedule(ctx context.Context, id string, req *dto.UpdateMaintenanceScheduleRequest) (*dto.MaintenanceScheduleResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	schedule, err := uc.repo.FindScheduleByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrMaintenanceScheduleNotFound
		}
		return nil, err
	}

	nextDate, err := parseMaintenanceDate(req.NextMaintenanceDate)
	if err != nil {
		return nil, err
	}

	var lastDate *time.Time
	if req.LastMaintenanceDate != nil && *req.LastMaintenanceDate != "" {
		parsed, err := parseMaintenanceDate(*req.LastMaintenanceDate)
		if err != nil {
			return nil, err
		}
		lastDate = &parsed
	}

	schedule.ScheduleType = req.ScheduleType
	schedule.Frequency = req.Frequency
	schedule.FrequencyValue = req.FrequencyValue
	schedule.LastMaintenanceDate = lastDate
	schedule.NextMaintenanceDate = &nextDate
	schedule.Description = strings.TrimSpace(req.Description)
	schedule.EstimatedCost = req.EstimatedCost
	schedule.AssignedTo = req.AssignedTo
	schedule.IsActive = req.IsActive

	if err := uc.repo.UpdateSchedule(ctx, schedule); err != nil {
		return nil, err
	}

	return uc.GetScheduleByID(ctx, id)
}

func (uc *assetMaintenanceUsecase) DeleteSchedule(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("id is required")
	}

	_, err := uc.repo.FindScheduleByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrMaintenanceScheduleNotFound
		}
		return err
	}

	return uc.repo.DeleteSchedule(ctx, id)
}

func (uc *assetMaintenanceUsecase) GetScheduleByID(ctx context.Context, id string) (*dto.MaintenanceScheduleResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}

	schedule, err := uc.repo.FindScheduleByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrMaintenanceScheduleNotFound
		}
		return nil, err
	}

	return uc.mapScheduleToResponse(schedule), nil
}

func (uc *assetMaintenanceUsecase) ListSchedules(ctx context.Context, req *dto.ListMaintenanceSchedulesRequest) ([]dto.MaintenanceScheduleResponse, int64, error) {
	if req == nil {
		req = &dto.ListMaintenanceSchedulesRequest{}
	}

	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	items, total, err := uc.repo.ListSchedules(ctx, repositories.MaintenanceScheduleListParams{
		AssetID:      req.AssetID,
		ScheduleType: req.ScheduleType,
		IsActive:     req.IsActive,
		Upcoming:     req.Upcoming,
		Overdue:      req.Overdue,
		Limit:        perPage,
		Offset:       (page - 1) * perPage,
		SortBy:       req.SortBy,
		SortDir:      req.SortDir,
	})
	if err != nil {
		return nil, 0, err
	}

	res := make([]dto.MaintenanceScheduleResponse, 0, len(items))
	for i := range items {
		res = append(res, *uc.mapScheduleToResponse(&items[i]))
	}
	return res, total, nil
}

func (uc *assetMaintenanceUsecase) mapScheduleToResponse(schedule *financeModels.AssetMaintenanceSchedule) *dto.MaintenanceScheduleResponse {
	resp := &dto.MaintenanceScheduleResponse{
		ID:              schedule.ID,
		AssetID:         schedule.AssetID,
		ScheduleType:    schedule.ScheduleType,
		Frequency:       schedule.Frequency,
		FrequencyValue:  schedule.FrequencyValue,
		Description:     schedule.Description,
		EstimatedCost:   schedule.EstimatedCost,
		AssignedTo:      schedule.AssignedTo,
		IsActive:        schedule.IsActive,
		CreatedAt:       schedule.CreatedAt,
		UpdatedAt:       schedule.UpdatedAt,
	}

	if schedule.LastMaintenanceDate != nil {
		resp.LastMaintenanceDate = schedule.LastMaintenanceDate
	}
	if schedule.NextMaintenanceDate != nil {
		resp.NextMaintenanceDate = schedule.NextMaintenanceDate
		resp.IsOverdue = schedule.IsOverdue()
		resp.DaysUntilDue = schedule.DaysUntilDue()
	}

	if schedule.Asset != nil {
		resp.Asset = &dto.AssetMiniResponse{
			ID:   schedule.Asset.ID,
			Code: schedule.Asset.Code,
			Name: schedule.Asset.Name,
		}
	}

	if schedule.Employee != nil {
		resp.Employee = &dto.EmployeeMiniResponse{
			ID:           schedule.Employee.ID,
			EmployeeCode: schedule.Employee.EmployeeCode,
			Name:         schedule.Employee.Name,
			Email:        schedule.Employee.Email,
		}
	}

	return resp
}

// ==================== Work Order Methods ====================

func (uc *assetMaintenanceUsecase) CreateWorkOrder(ctx context.Context, req *dto.CreateWorkOrderRequest) (*dto.WorkOrderResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID := getMaintenanceActorID(ctx)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	plannedDate, err := parseMaintenanceDate(req.PlannedDate)
	if err != nil {
		return nil, err
	}

	woNumber, err := uc.repo.GenerateWONumber(ctx)
	if err != nil {
		return nil, err
	}

	priority := req.Priority
	if priority == "" {
		priority = financeModels.WorkOrderPriorityMedium
	}

	wo := &financeModels.AssetWorkOrder{
		WONumber:    woNumber,
		AssetID:     strings.TrimSpace(req.AssetID),
		ScheduleID:  req.ScheduleID,
		WOType:      req.WOType,
		Priority:    priority,
		Description: strings.TrimSpace(req.Description),
		PlannedDate: &plannedDate,
		AssignedTo:  req.AssignedTo,
		Status:      financeModels.WorkOrderStatusOpen,
		CreatedBy:   &actorID,
	}

	if err := uc.repo.CreateWorkOrder(ctx, wo); err != nil {
		return nil, err
	}

	return uc.GetWorkOrderByID(ctx, wo.ID)
}

func (uc *assetMaintenanceUsecase) UpdateWorkOrder(ctx context.Context, id string, req *dto.UpdateWorkOrderRequest) (*dto.WorkOrderResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	wo, err := uc.repo.FindWorkOrderByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrWorkOrderNotFound
		}
		return nil, err
	}

	if !wo.IsOpen() {
		return nil, errors.New("cannot update work order that is not open")
	}

	plannedDate, err := parseMaintenanceDate(req.PlannedDate)
	if err != nil {
		return nil, err
	}

	wo.Description = strings.TrimSpace(req.Description)
	wo.PlannedDate = &plannedDate
	wo.AssignedTo = req.AssignedTo

	if err := uc.repo.UpdateWorkOrder(ctx, wo); err != nil {
		return nil, err
	}

	return uc.GetWorkOrderByID(ctx, id)
}

func (uc *assetMaintenanceUsecase) UpdateWorkOrderStatus(ctx context.Context, id string, req *dto.UpdateWorkOrderStatusRequest) (*dto.WorkOrderResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	wo, err := uc.repo.FindWorkOrderByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrWorkOrderNotFound
		}
		return nil, err
	}

	if !wo.CanTransitionTo(req.Status) {
		return nil, ErrInvalidStatusTransition
	}

	notes := strings.TrimSpace(req.Notes)
	if err := uc.repo.UpdateWorkOrderStatus(ctx, id, req.Status, notes); err != nil {
		return nil, err
	}

	// If completed, update the schedule's last maintenance date
	if req.Status == financeModels.WorkOrderStatusCompleted && wo.ScheduleID != nil {
		schedule, err := uc.repo.FindScheduleByID(ctx, *wo.ScheduleID)
		if err == nil {
			now := apptime.Now()
			schedule.LastMaintenanceDate = &now
			nextDate := schedule.CalculateNextDate(now)
			schedule.NextMaintenanceDate = &nextDate
			uc.repo.UpdateSchedule(ctx, schedule)
		}
	}

	return uc.GetWorkOrderByID(ctx, id)
}

func (uc *assetMaintenanceUsecase) DeleteWorkOrder(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("id is required")
	}

	wo, err := uc.repo.FindWorkOrderByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrWorkOrderNotFound
		}
		return err
	}

	if wo.Status == financeModels.WorkOrderStatusCompleted {
		return errors.New("cannot delete completed work order")
	}

	return uc.repo.DeleteWorkOrder(ctx, id)
}

func (uc *assetMaintenanceUsecase) GetWorkOrderByID(ctx context.Context, id string) (*dto.WorkOrderResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}

	wo, err := uc.repo.FindWorkOrderByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrWorkOrderNotFound
		}
		return nil, err
	}

	return uc.mapWorkOrderToResponse(wo), nil
}

func (uc *assetMaintenanceUsecase) ListWorkOrders(ctx context.Context, req *dto.ListWorkOrdersRequest) ([]dto.WorkOrderResponse, int64, error) {
	if req == nil {
		req = &dto.ListWorkOrdersRequest{}
	}

	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	var startDate, endDate *time.Time
	if req.StartDate != nil && *req.StartDate != "" {
		parsed, _ := parseMaintenanceDate(*req.StartDate)
		startDate = &parsed
	}
	if req.EndDate != nil && *req.EndDate != "" {
		parsed, _ := parseMaintenanceDate(*req.EndDate)
		endDate = &parsed
	}

	items, total, err := uc.repo.ListWorkOrders(ctx, repositories.WorkOrderListParams{
		AssetID:    req.AssetID,
		WOType:     req.WOType,
		Status:     req.Status,
		Priority:   req.Priority,
		AssignedTo: req.AssignedTo,
		StartDate:  startDate,
		EndDate:    endDate,
		Limit:      perPage,
		Offset:     (page - 1) * perPage,
		SortBy:     req.SortBy,
		SortDir:    req.SortDir,
	})
	if err != nil {
		return nil, 0, err
	}

	res := make([]dto.WorkOrderResponse, 0, len(items))
	for i := range items {
		res = append(res, *uc.mapWorkOrderToResponse(&items[i]))
	}
	return res, total, nil
}

func (uc *assetMaintenanceUsecase) AddSparePartToWorkOrder(ctx context.Context, workOrderID string, req *dto.WorkOrderSparePartRequest) (*dto.WorkOrderResponse, error) {
	workOrderID = strings.TrimSpace(workOrderID)
	if workOrderID == "" {
		return nil, errors.New("work order id is required")
	}

	wo, err := uc.repo.FindWorkOrderByID(ctx, workOrderID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrWorkOrderNotFound
		}
		return nil, err
	}

	if !wo.IsOpen() {
		return nil, errors.New("cannot add spare parts to work order that is not open")
	}

	sparePart, err := uc.repo.FindSparePartByID(ctx, req.SparePartID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSparePartNotFound
		}
		return nil, err
	}

	if !sparePart.CanFulfill(req.QuantityUsed) {
		return nil, ErrInsufficientStock
	}

	unitCost := req.UnitCost
	if unitCost == 0 {
		unitCost = sparePart.UnitCost
	}

	wsp := &financeModels.WorkOrderSparePart{
		WorkOrderID:  workOrderID,
		SparePartID:  req.SparePartID,
		QuantityUsed: req.QuantityUsed,
		UnitCost:     unitCost,
		TotalCost:    float64(req.QuantityUsed) * unitCost,
	}

	if err := uc.repo.AddWorkOrderSparePart(ctx, wsp); err != nil {
		return nil, err
	}

	return uc.GetWorkOrderByID(ctx, workOrderID)
}

func (uc *assetMaintenanceUsecase) RemoveSparePartFromWorkOrder(ctx context.Context, workOrderID string, sparePartUsageID string) (*dto.WorkOrderResponse, error) {
	workOrderID = strings.TrimSpace(workOrderID)
	if workOrderID == "" {
		return nil, errors.New("work order id is required")
	}

	wo, err := uc.repo.FindWorkOrderByID(ctx, workOrderID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrWorkOrderNotFound
		}
		return nil, err
	}

	if !wo.IsOpen() {
		return nil, errors.New("cannot remove spare parts from work order that is not open")
	}

	if err := uc.repo.RemoveWorkOrderSparePart(ctx, sparePartUsageID); err != nil {
		return nil, err
	}

	return uc.GetWorkOrderByID(ctx, workOrderID)
}

func (uc *assetMaintenanceUsecase) mapWorkOrderToResponse(wo *financeModels.AssetWorkOrder) *dto.WorkOrderResponse {
	resp := &dto.WorkOrderResponse{
		ID:            wo.ID,
		WONumber:      wo.WONumber,
		AssetID:       wo.AssetID,
		ScheduleID:    wo.ScheduleID,
		WOType:        wo.WOType,
		Status:        wo.Status,
		Priority:      wo.Priority,
		Description:   wo.Description,
		ActualCost:    wo.ActualCost,
		DowntimeHours: wo.DowntimeHours,
		Notes:         wo.Notes,
		CreatedAt:     wo.CreatedAt,
		UpdatedAt:     wo.UpdatedAt,
	}

	if wo.PlannedDate != nil {
		resp.PlannedDate = wo.PlannedDate
	}
	if wo.CompletedDate != nil {
		resp.CompletedDate = wo.CompletedDate
	}
	if wo.AssignedTo != nil {
		resp.AssignedTo = wo.AssignedTo
	}

	if wo.Asset != nil {
		resp.Asset = &dto.AssetMiniResponse{
			ID:   wo.Asset.ID,
			Code: wo.Asset.Code,
			Name: wo.Asset.Name,
		}
	}

	if wo.Employee != nil {
		resp.Employee = &dto.EmployeeMiniResponse{
			ID:           wo.Employee.ID,
			EmployeeCode: wo.Employee.EmployeeCode,
			Name:         wo.Employee.Name,
			Email:        wo.Employee.Email,
		}
	}

	resp.SpareParts = make([]dto.WorkOrderSparePartResponse, 0, len(wo.SpareParts))
	for _, sp := range wo.SpareParts {
		item := dto.WorkOrderSparePartResponse{
			ID:           sp.ID,
			SparePartID:  sp.SparePartID,
			QuantityUsed: sp.QuantityUsed,
			UnitCost:     sp.UnitCost,
			TotalCost:    sp.TotalCost,
			CreatedAt:    sp.CreatedAt,
		}
		if sp.SparePart != nil {
			item.SparePart = &dto.SparePartMiniResponse{
				ID:            sp.SparePart.ID,
				PartNumber:    sp.SparePart.PartNumber,
				PartName:      sp.SparePart.PartName,
				UnitOfMeasure: sp.SparePart.UnitOfMeasure,
				CurrentStock:  sp.SparePart.CurrentStock,
				UnitCost:      sp.SparePart.UnitCost,
			}
		}
		resp.SpareParts = append(resp.SpareParts, item)
	}

	resp.TotalCost = wo.CalculateTotalCost()

	// Status transition permissions
	resp.CanTransition = map[string]bool{
		string(financeModels.WorkOrderStatusOpen):       wo.CanTransitionTo(financeModels.WorkOrderStatusOpen),
		string(financeModels.WorkOrderStatusInProgress): wo.CanTransitionTo(financeModels.WorkOrderStatusInProgress),
		string(financeModels.WorkOrderStatusCompleted):  wo.CanTransitionTo(financeModels.WorkOrderStatusCompleted),
		string(financeModels.WorkOrderStatusCancelled):  wo.CanTransitionTo(financeModels.WorkOrderStatusCancelled),
	}

	return resp
}

// ==================== Spare Part Methods ====================

func (uc *assetMaintenanceUsecase) CreateSparePart(ctx context.Context, req *dto.CreateSparePartRequest) (*dto.SparePartResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	// Check if part number already exists
	existing, _ := uc.repo.FindSparePartByPartNumber(ctx, strings.TrimSpace(req.PartNumber))
	if existing != nil {
		return nil, ErrPartNumberExists
	}

	sp := &financeModels.AssetSparePart{
		PartNumber:    strings.TrimSpace(req.PartNumber),
		PartName:      strings.TrimSpace(req.PartName),
		Description:   strings.TrimSpace(req.Description),
		CategoryID:    req.CategoryID,
		UnitOfMeasure: strings.TrimSpace(req.UnitOfMeasure),
		MinStockLevel: req.MinStockLevel,
		MaxStockLevel: req.MaxStockLevel,
		ReorderPoint:  req.ReorderPoint,
		CurrentStock:  req.CurrentStock,
		UnitCost:      req.UnitCost,
		SupplierID:    req.SupplierID,
		Location:      strings.TrimSpace(req.Location),
		IsActive:      true,
	}

	if err := uc.repo.CreateSparePart(ctx, sp); err != nil {
		return nil, err
	}

	return uc.GetSparePartByID(ctx, sp.ID)
}

func (uc *assetMaintenanceUsecase) UpdateSparePart(ctx context.Context, id string, req *dto.UpdateSparePartRequest) (*dto.SparePartResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	sp, err := uc.repo.FindSparePartByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSparePartNotFound
		}
		return nil, err
	}

	sp.PartName = strings.TrimSpace(req.PartName)
	sp.Description = strings.TrimSpace(req.Description)
	sp.CategoryID = req.CategoryID
	sp.UnitOfMeasure = strings.TrimSpace(req.UnitOfMeasure)
	sp.MinStockLevel = req.MinStockLevel
	sp.MaxStockLevel = req.MaxStockLevel
	sp.ReorderPoint = req.ReorderPoint
	sp.UnitCost = req.UnitCost
	sp.SupplierID = req.SupplierID
	sp.Location = strings.TrimSpace(req.Location)
	sp.IsActive = req.IsActive

	if err := uc.repo.UpdateSparePart(ctx, sp); err != nil {
		return nil, err
	}

	return uc.GetSparePartByID(ctx, id)
}

func (uc *assetMaintenanceUsecase) UpdateSparePartStock(ctx context.Context, id string, req *dto.UpdateSparePartStockRequest) (*dto.SparePartResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	sp, err := uc.repo.FindSparePartByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSparePartNotFound
		}
		return nil, err
	}

	if err := uc.repo.UpdateSparePartStock(ctx, id, req.CurrentStock); err != nil {
		return nil, err
	}

	sp.CurrentStock = req.CurrentStock
	return uc.mapSparePartToResponse(sp), nil
}

func (uc *assetMaintenanceUsecase) DeleteSparePart(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("id is required")
	}

	_, err := uc.repo.FindSparePartByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrSparePartNotFound
		}
		return err
	}

	return uc.repo.DeleteSparePart(ctx, id)
}

func (uc *assetMaintenanceUsecase) GetSparePartByID(ctx context.Context, id string) (*dto.SparePartResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}

	sp, err := uc.repo.FindSparePartByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSparePartNotFound
		}
		return nil, err
	}

	return uc.mapSparePartToResponse(sp), nil
}

func (uc *assetMaintenanceUsecase) ListSpareParts(ctx context.Context, req *dto.ListSparePartsRequest) ([]dto.SparePartResponse, int64, error) {
	if req == nil {
		req = &dto.ListSparePartsRequest{}
	}

	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	items, total, err := uc.repo.ListSpareParts(ctx, repositories.SparePartListParams{
		Search:     req.Search,
		CategoryID: req.CategoryID,
		IsActive:   req.IsActive,
		LowStock:   req.LowStock,
		AssetID:    req.AssetID,
		Limit:      perPage,
		Offset:     (page - 1) * perPage,
		SortBy:     req.SortBy,
		SortDir:    req.SortDir,
	})
	if err != nil {
		return nil, 0, err
	}

	res := make([]dto.SparePartResponse, 0, len(items))
	for i := range items {
		res = append(res, *uc.mapSparePartToResponse(&items[i]))
	}
	return res, total, nil
}

func (uc *assetMaintenanceUsecase) mapSparePartToResponse(sp *financeModels.AssetSparePart) *dto.SparePartResponse {
	resp := &dto.SparePartResponse{
		ID:            sp.ID,
		PartNumber:    sp.PartNumber,
		PartName:      sp.PartName,
		Description:   sp.Description,
		CategoryID:    sp.CategoryID,
		UnitOfMeasure: sp.UnitOfMeasure,
		MinStockLevel: sp.MinStockLevel,
		MaxStockLevel: sp.MaxStockLevel,
		ReorderPoint:  sp.ReorderPoint,
		CurrentStock:  sp.CurrentStock,
		UnitCost:      sp.UnitCost,
		StockValue:    sp.StockValue(),
		SupplierID:    sp.SupplierID,
		Location:      sp.Location,
		IsActive:      sp.IsActive,
		IsLowStock:    sp.IsLowStock(),
		IsOutOfStock:  sp.IsOutOfStock(),
		CreatedAt:     sp.CreatedAt,
		UpdatedAt:     sp.UpdatedAt,
	}

	if sp.AssetLinks != nil {
		resp.LinkedAssets = make([]dto.AssetMiniResponse, 0, len(sp.AssetLinks))
		for _, link := range sp.AssetLinks {
			if link.Asset != nil {
				resp.LinkedAssets = append(resp.LinkedAssets, dto.AssetMiniResponse{
					ID:   link.Asset.ID,
					Code: link.Asset.Code,
					Name: link.Asset.Name,
				})
			}
		}
	}

	return resp
}

// ==================== Asset-Spare Part Link Methods ====================

func (uc *assetMaintenanceUsecase) LinkAssetToSparePart(ctx context.Context, req *dto.CreateAssetSparePartLinkRequest) error {
	if req == nil {
		return errors.New("request is required")
	}

	link := &financeModels.AssetSparePartLink{
		AssetID:          strings.TrimSpace(req.AssetID),
		SparePartID:      strings.TrimSpace(req.SparePartID),
		QuantityPerAsset: req.QuantityPerAsset,
		Notes:            strings.TrimSpace(req.Notes),
	}

	return uc.repo.LinkAssetToSparePart(ctx, link)
}

func (uc *assetMaintenanceUsecase) UnlinkAssetFromSparePart(ctx context.Context, assetID, sparePartID string) error {
	assetID = strings.TrimSpace(assetID)
	if assetID == "" {
		return errors.New("asset id is required")
	}
	sparePartID = strings.TrimSpace(sparePartID)
	if sparePartID == "" {
		return errors.New("spare part id is required")
	}

	return uc.repo.UnlinkAssetFromSparePart(ctx, assetID, sparePartID)
}

// ==================== Dashboard & Alerts Methods ====================

func (uc *assetMaintenanceUsecase) GetDashboard(ctx context.Context) (*dto.MaintenanceDashboardResponse, error) {
	stats, err := uc.repo.GetDashboardStats(ctx)
	if err != nil {
		return nil, err
	}

	return &dto.MaintenanceDashboardResponse{
		TotalSchedules:         int(stats.TotalSchedules),
		ActiveSchedules:        int(stats.ActiveSchedules),
		OverdueMaintenance:     int(stats.OverdueMaintenance),
		UpcomingMaintenance:    int(stats.UpcomingMaintenance),
		OpenWorkOrders:         int(stats.OpenWorkOrders),
		InProgressWorkOrders:   int(stats.InProgressWorkOrders),
		CompletedThisMonth:     int(stats.CompletedThisMonth),
		TotalSpareParts:        int(stats.TotalSpareParts),
		LowStockItems:          int(stats.LowStockItems),
		TotalMaintenanceCost:   stats.TotalMaintenanceCost,
	}, nil
}

func (uc *assetMaintenanceUsecase) GetAlerts(ctx context.Context) ([]dto.MaintenanceAlertResponse, error) {
	var alerts []dto.MaintenanceAlertResponse

	// Get overdue schedules
	overdueSchedules, err := uc.repo.GetOverdueSchedules(ctx)
	if err == nil {
		for _, schedule := range overdueSchedules {
			alert := dto.MaintenanceAlertResponse{
				Type:        "overdue",
				Title:       "Maintenance Overdue",
				Description: schedule.Description,
				AssetID:     schedule.AssetID,
				DueDate:     schedule.NextMaintenanceDate,
				DaysOverdue: int(time.Since(*schedule.NextMaintenanceDate).Hours() / 24),
				ScheduleID:  &schedule.ID,
			}
			if schedule.Asset != nil {
				alert.AssetCode = schedule.Asset.Code
				alert.AssetName = schedule.Asset.Name
			}
			alerts = append(alerts, alert)
		}
	}

	// Get upcoming schedules (next 7 days)
	upcomingSchedules, err := uc.repo.GetUpcomingSchedules(ctx, 7)
	if err == nil {
		for _, schedule := range upcomingSchedules {
			alert := dto.MaintenanceAlertResponse{
				Type:         "upcoming",
				Title:        "Maintenance Due Soon",
				Description:  schedule.Description,
				AssetID:      schedule.AssetID,
				DueDate:      schedule.NextMaintenanceDate,
				DaysUntilDue: int(schedule.NextMaintenanceDate.Sub(time.Now()).Hours() / 24),
				ScheduleID:   &schedule.ID,
			}
			if schedule.Asset != nil {
				alert.AssetCode = schedule.Asset.Code
				alert.AssetName = schedule.Asset.Name
			}
			alerts = append(alerts, alert)
		}
	}

	// Get low stock spare parts
	lowStockParts, err := uc.repo.GetLowStockParts(ctx)
	if err == nil {
		for _, part := range lowStockParts {
			alert := dto.MaintenanceAlertResponse{
				Type:          "low_stock",
				Title:         "Low Spare Part Stock",
				Description:   part.PartName + " is running low on stock",
				SparePartID:   &part.ID,
				SparePartName: &part.PartName,
				CurrentStock:  part.CurrentStock,
				ReorderPoint:  part.ReorderPoint,
			}
			alerts = append(alerts, alert)
		}
	}

	return alerts, nil
}

// ==================== Form Data Method ====================

func (uc *assetMaintenanceUsecase) GetFormData(ctx context.Context) (*dto.MaintenanceFormDataResponse, error) {
	// Get all active assets
	assets, err := uc.repo.ListAssetsForForm(ctx)
	if err != nil {
		return nil, err
	}

	// Get all active employees
	employees, err := uc.repo.ListEmployeesForForm(ctx)
	if err != nil {
		return nil, err
	}

	// Get all active UOMs
	uoms, err := uc.repo.ListUOMsForForm(ctx)
	if err != nil {
		return nil, err
	}

	// Get all active warehouses
	warehouses, err := uc.repo.ListWarehousesForForm(ctx)
	if err != nil {
		return nil, err
	}

	return &dto.MaintenanceFormDataResponse{
		Assets:     assets,
		Employees:  employees,
		UOMs:       uoms,
		Warehouses: warehouses,
	}, nil
}
