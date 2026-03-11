package usecase

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/general/data/repositories"
	"github.com/gilabs/gims/api/internal/general/domain/dto"
	"gorm.io/gorm"
)

// DashboardUsecase defines the business logic interface for dashboard aggregation.
type DashboardUsecase interface {
	GetOverview(ctx context.Context, req dto.DashboardRequest) (*dto.DashboardOverviewResponse, error)
	GetLayout(ctx context.Context, userID, dashboardType string) (*dto.DashboardLayoutResponse, error)
	SaveLayout(ctx context.Context, userID string, req dto.DashboardLayoutSaveRequest) error
}

type dashboardUsecase struct {
	repo       repositories.DashboardRepository
	layoutRepo repositories.DashboardLayoutRepository
}

// NewDashboardUsecase creates a new DashboardUsecase.
func NewDashboardUsecase(repo repositories.DashboardRepository, layoutRepo repositories.DashboardLayoutRepository) DashboardUsecase {
	return &dashboardUsecase{repo: repo, layoutRepo: layoutRepo}
}

// GetOverview aggregates all dashboard data. Each section is fetched independently
// so that a failure in one section does not prevent other sections from loading.
func (u *dashboardUsecase) GetOverview(ctx context.Context, req dto.DashboardRequest) (*dto.DashboardOverviewResponse, error) {
	start, end := resolveDateRange(req)
	resp := &dto.DashboardOverviewResponse{}

	if kpi, err := u.repo.GetRevenueKPI(ctx, start, end); err != nil {
		log.Printf("[dashboard] revenue KPI error: %v", err)
	} else {
		resp.KPI.TotalRevenue = kpi
	}
	if kpi, err := u.repo.GetOrdersKPI(ctx, start, end); err != nil {
		log.Printf("[dashboard] orders KPI error: %v", err)
	} else {
		resp.KPI.TotalOrders = kpi
	}
	if kpi, err := u.repo.GetCustomersKPI(ctx); err != nil {
		log.Printf("[dashboard] customers KPI error: %v", err)
	} else {
		resp.KPI.TotalCustomers = kpi
	}
	if kpi, err := u.repo.GetProductsKPI(ctx); err != nil {
		log.Printf("[dashboard] products KPI error: %v", err)
	} else {
		resp.KPI.TotalProducts = kpi
	}
	if kpi, err := u.repo.GetEmployeeCountKPI(ctx); err != nil {
		log.Printf("[dashboard] employee count KPI error: %v", err)
	} else {
		resp.KPI.EmployeeCount = kpi
	}

	if data, err := u.repo.GetRevenueChart(ctx, start, end); err != nil {
		log.Printf("[dashboard] revenue chart error: %v", err)
		resp.RevenueChart = []dto.PeriodChartPoint{}
	} else {
		resp.RevenueChart = data
	}
	if data, err := u.repo.GetCostsChart(ctx, start, end); err != nil {
		log.Printf("[dashboard] costs chart error: %v", err)
		resp.CostsChart = []dto.PeriodChartPoint{}
	} else {
		resp.CostsChart = data
	}
	if data, err := u.repo.GetRevenueVsCosts(ctx, start, end); err != nil {
		log.Printf("[dashboard] revenue vs costs error: %v", err)
		resp.RevenueVsCosts = []dto.PeriodChartPoint{}
	} else {
		resp.RevenueVsCosts = data
	}

	if data, err := u.repo.GetBalance(ctx, start, end); err != nil {
		log.Printf("[dashboard] balance error: %v", err)
	} else {
		resp.Balance = data
	}
	if data, err := u.repo.GetCostsByCategory(ctx, start, end); err != nil {
		log.Printf("[dashboard] costs by category error: %v", err)
		resp.CostsByCategory = []dto.CostCategoryItem{}
	} else {
		resp.CostsByCategory = data
	}

	if data, err := u.repo.GetInvoiceSummary(ctx, start, end); err != nil {
		log.Printf("[dashboard] invoice summary error: %v", err)
	} else {
		resp.InvoicesSummary = data
	}
	if data, err := u.repo.GetRecentInvoices(ctx, 10); err != nil {
		log.Printf("[dashboard] recent invoices error: %v", err)
		resp.RecentInvoices = []dto.InvoiceRow{}
	} else {
		resp.RecentInvoices = data
	}

	if data, err := u.repo.GetSalesPerformance(ctx, start, end, 5); err != nil {
		log.Printf("[dashboard] sales performance error: %v", err)
		resp.SalesPerformance = []dto.SalesPerformRow{}
	} else {
		resp.SalesPerformance = data
	}
	if data, err := u.repo.GetTopProducts(ctx, start, end, 6); err != nil {
		log.Printf("[dashboard] top products error: %v", err)
		resp.TopProducts = []dto.TopProductRow{}
	} else {
		resp.TopProducts = data
	}

	if data, err := u.repo.GetDeliveryStatus(ctx, start, end); err != nil {
		log.Printf("[dashboard] delivery status error: %v", err)
	} else {
		resp.DeliveryStatus = data
	}
	if data, err := u.repo.GetGeoOverview(ctx, start, end); err != nil {
		log.Printf("[dashboard] geo overview error: %v", err)
		resp.GeoOverview = dto.GeoOverviewData{Regions: []dto.GeoRegionData{}}
	} else {
		resp.GeoOverview = data
	}
	if data, err := u.repo.GetWarehouses(ctx); err != nil {
		log.Printf("[dashboard] warehouses error: %v", err)
		resp.Warehouses = []dto.WarehouseItem{}
	} else {
		resp.Warehouses = data
	}

	return resp, nil
}

// resolveDateRange determines start/end dates from the request.
// Defaults to last 12 months when no range or year is specified.
func resolveDateRange(req dto.DashboardRequest) (time.Time, time.Time) {
	now := time.Now()
	if req.StartDate != "" && req.EndDate != "" {
		start, err1 := time.Parse("2006-01-02", req.StartDate)
		end, err2 := time.Parse("2006-01-02", req.EndDate)
		if err1 == nil && err2 == nil {
			return start, end.Add(24*time.Hour - time.Second)
		}
	}
	if req.Year > 0 {
		return time.Date(req.Year, 1, 1, 0, 0, 0, 0, time.UTC),
			time.Date(req.Year, 12, 31, 23, 59, 59, 0, time.UTC)
	}
	start := time.Date(now.Year()-1, now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	end := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, time.UTC)
	return start, end
}

// GetLayout fetches the saved dashboard layout for a user. Returns nil if no layout has been saved yet.
func (u *dashboardUsecase) GetLayout(ctx context.Context, userID, dashboardType string) (*dto.DashboardLayoutResponse, error) {
	layoutJSON, err := u.layoutRepo.GetLayout(ctx, userID, dashboardType)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &dto.DashboardLayoutResponse{
		DashboardType: dashboardType,
		LayoutJSON:    layoutJSON,
	}, nil
}

// SaveLayout persists the user's custom dashboard layout to the database.
func (u *dashboardUsecase) SaveLayout(ctx context.Context, userID string, req dto.DashboardLayoutSaveRequest) error {
	return u.layoutRepo.SaveLayout(ctx, userID, req.DashboardType, req.LayoutJSON)
}
