package usecase

import (
	"context"
	"testing"
	"time"

	generalModels "github.com/gilabs/gims/api/internal/general/data/models"
	"github.com/gilabs/gims/api/internal/general/data/repositories"
	"github.com/gilabs/gims/api/internal/general/domain/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type mockDashboardRepo struct {
	crmCalled bool
	hrCalled  bool
	kpiCalled bool
}

func (m *mockDashboardRepo) GetRevenueKPI(ctx context.Context, start, end time.Time) (dto.KPICard, error) {
	m.kpiCalled = true
	return dto.KPICard{Value: 1000000}, nil
}
func (m *mockDashboardRepo) GetOrdersKPI(ctx context.Context, start, end time.Time) (dto.KPICard, error) {
	return dto.KPICard{Value: 50}, nil
}
func (m *mockDashboardRepo) GetCustomersKPI(ctx context.Context) (dto.KPICard, error) {
	return dto.KPICard{Value: 20}, nil
}
func (m *mockDashboardRepo) GetProductsKPI(ctx context.Context) (dto.KPICard, error) {
	return dto.KPICard{Value: 15}, nil
}
func (m *mockDashboardRepo) GetEmployeeCountKPI(ctx context.Context) (dto.KPICard, error) {
	return dto.KPICard{Value: 10}, nil
}
func (m *mockDashboardRepo) GetRevenueChart(ctx context.Context, start, end time.Time) ([]dto.PeriodChartPoint, error) {
	return nil, nil
}
func (m *mockDashboardRepo) GetCostsChart(ctx context.Context, start, end time.Time) ([]dto.PeriodChartPoint, error) {
	return nil, nil
}
func (m *mockDashboardRepo) GetRevenueVsCosts(ctx context.Context, start, end time.Time) ([]dto.PeriodChartPoint, error) {
	return nil, nil
}
func (m *mockDashboardRepo) GetBalance(ctx context.Context, start, end time.Time) (dto.BalanceData, error) {
	return dto.BalanceData{}, nil
}
func (m *mockDashboardRepo) GetCostsByCategory(ctx context.Context, start, end time.Time) ([]dto.CostCategoryItem, error) {
	return nil, nil
}
func (m *mockDashboardRepo) GetInvoiceSummary(ctx context.Context, start, end time.Time) (dto.InvoiceSummaryData, error) {
	return dto.InvoiceSummaryData{}, nil
}
func (m *mockDashboardRepo) GetRecentInvoices(ctx context.Context, limit int) ([]dto.InvoiceRow, error) {
	return nil, nil
}
func (m *mockDashboardRepo) GetSalesPerformance(ctx context.Context, start, end time.Time, limit int) ([]dto.SalesPerformanceRow, error) {
	return nil, nil
}
func (m *mockDashboardRepo) GetTopProducts(ctx context.Context, start, end time.Time, limit int) ([]dto.TopProductRow, error) {
	return nil, nil
}
func (m *mockDashboardRepo) GetDeliveryStatus(ctx context.Context, start, end time.Time) (dto.DeliveryStatusData, error) {
	return dto.DeliveryStatusData{}, nil
}
func (m *mockDashboardRepo) GetGeoOverview(ctx context.Context, start, end time.Time) (dto.GeoOverviewData, error) {
	return dto.GeoOverviewData{}, nil
}
func (m *mockDashboardRepo) GetWarehouses(ctx context.Context) ([]dto.WarehouseItem, error) {
	return nil, nil
}
func (m *mockDashboardRepo) GetPOSSummary(ctx context.Context, userID, outletID string, start, end time.Time) (*dto.POSSummaryData, error) {
	return &dto.POSSummaryData{}, nil
}
func (m *mockDashboardRepo) GetHRSummary(ctx context.Context) (*dto.HRSummaryData, error) {
	m.hrCalled = true
	return &dto.HRSummaryData{
		PresentToday: 8,
		AbsentToday:  2,
	}, nil
}
func (m *mockDashboardRepo) GetCRMSummary(ctx context.Context) (*dto.CRMSummaryData, error) {
	m.crmCalled = true
	return &dto.CRMSummaryData{
		TotalContacts:   42,
		ActiveLeads:     12,
		DealsInProgress: 5,
	}, nil
}

func TestDashboardUsecase_GetOverviewByScope_CRM(t *testing.T) {
	t.Parallel()

	repo := &mockDashboardRepo{}
	uc := NewDashboardUsecase(repo, nil)

	resp, err := uc.GetOverviewByScope(context.Background(), dto.DashboardRequest{
		Scope: dto.DashboardOverviewScopeCRM,
	})
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.True(t, repo.crmCalled)
	require.NotNil(t, resp.CRMSummary)
	assert.Equal(t, 42, resp.CRMSummary.TotalContacts)
	assert.Equal(t, 12, resp.CRMSummary.ActiveLeads)
}

func TestDashboardUsecase_GetOverviewByScope_HR(t *testing.T) {
	t.Parallel()

	repo := &mockDashboardRepo{}
	uc := NewDashboardUsecase(repo, nil)

	resp, err := uc.GetOverviewByScope(context.Background(), dto.DashboardRequest{
		Scope: dto.DashboardOverviewScopeHR,
	})
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.True(t, repo.hrCalled)
	require.NotNil(t, resp.HRSummary)
	assert.Equal(t, 8, resp.HRSummary.PresentToday)
}

func TestDashboardUsecase_GetOverviewByScope_KPI(t *testing.T) {
	t.Parallel()

	repo := &mockDashboardRepo{}
	uc := NewDashboardUsecase(repo, nil)

	resp, err := uc.GetOverviewByScope(context.Background(), dto.DashboardRequest{
		Scope: dto.DashboardOverviewScopeKPI,
		Year:  2026,
	})
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.True(t, repo.kpiCalled)
	require.NotNil(t, resp.KPI)
	assert.Equal(t, 1000000.0, resp.KPI.TotalRevenue.Value)
}

type mockLayoutRepo struct {
	layoutJSON string
	err        error
}

func (m *mockLayoutRepo) GetLayout(ctx context.Context, userID, dashboardType string) (string, error) {
	return m.layoutJSON, m.err
}

func (m *mockLayoutRepo) SaveLayout(ctx context.Context, userID, dashboardType, layoutJSON string) error {
	m.layoutJSON = layoutJSON
	return m.err
}

type mockOnboardingRepo struct {
	businessType string
	err          error
}

func (m *mockOnboardingRepo) Get(ctx context.Context) (*generalModels.TenantOnboarding, error) {
	if m.err != nil {
		return nil, m.err
	}
	return &generalModels.TenantOnboarding{BusinessType: m.businessType}, nil
}

func (m *mockOnboardingRepo) Save(ctx context.Context, state *generalModels.TenantOnboarding) error {
	return m.err
}

func (m *mockOnboardingRepo) CheckSteps(ctx context.Context) (*repositories.OnboardingStepsData, error) {
	return nil, m.err
}

func TestDashboardUsecase_GetLayout_DefaultERP(t *testing.T) {
	t.Parallel()

	layoutRepo := &mockLayoutRepo{err: gorm.ErrRecordNotFound}
	onboardingRepo := &mockOnboardingRepo{businessType: "other"}
	uc := NewDashboardUsecase(nil, layoutRepo, onboardingRepo)

	resp, err := uc.GetLayout(context.Background(), "user-1", "general")
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.Equal(t, "general", resp.DashboardType)
	assert.Contains(t, resp.LayoutJSON, "revenue_bar_chart")
	assert.NotContains(t, resp.LayoutJSON, "pos_live_table_overview")
}

func TestDashboardUsecase_GetLayout_DefaultFNB(t *testing.T) {
	t.Parallel()

	layoutRepo := &mockLayoutRepo{err: gorm.ErrRecordNotFound}
	onboardingRepo := &mockOnboardingRepo{businessType: "fnb"}
	uc := NewDashboardUsecase(nil, layoutRepo, onboardingRepo)

	resp, err := uc.GetLayout(context.Background(), "user-1", "general")
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.Equal(t, "general", resp.DashboardType)
	assert.Contains(t, resp.LayoutJSON, "revenue_bar_chart")
	assert.Contains(t, resp.LayoutJSON, "pos_outlet_sales")
	assert.Contains(t, resp.LayoutJSON, "pos_live_table_overview")
	assert.Contains(t, resp.LayoutJSON, "best_selling")
	assert.NotContains(t, resp.LayoutJSON, "track_orders")
}

func TestDashboardUsecase_GetLayout_Custom(t *testing.T) {
	t.Parallel()

	customJSON := `{"widgets":[{"id":"custom-1","type":"total_revenue"}]}`
	layoutRepo := &mockLayoutRepo{layoutJSON: customJSON}
	uc := NewDashboardUsecase(nil, layoutRepo)

	resp, err := uc.GetLayout(context.Background(), "user-1", "general")
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.Equal(t, customJSON, resp.LayoutJSON)
}
