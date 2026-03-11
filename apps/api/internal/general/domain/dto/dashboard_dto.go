package dto

// DashboardRequest holds the query parameters for filtering dashboard data.
type DashboardRequest struct {
	StartDate string `form:"start_date"`
	EndDate   string `form:"end_date"`
	Year      int    `form:"year"`
}

// DashboardOverviewResponse is the top-level dashboard API response.
type DashboardOverviewResponse struct {
	KPI              KPIData            `json:"kpi"`
	RevenueChart     []PeriodChartPoint `json:"revenue_chart"`
	CostsChart       []PeriodChartPoint `json:"costs_chart"`
	RevenueVsCosts   []PeriodChartPoint `json:"revenue_vs_costs"`
	Balance          BalanceData        `json:"balance"`
	CostsByCategory  []CostCategoryItem `json:"costs_by_category"`
	InvoicesSummary  InvoiceSummaryData `json:"invoices_summary"`
	RecentInvoices   []InvoiceRow       `json:"recent_invoices"`
	SalesPerformance []SalesPerformRow  `json:"sales_performance"`
	TopProducts      []TopProductRow    `json:"top_products"`
	DeliveryStatus   DeliveryStatusData `json:"delivery_status"`
	GeoOverview      GeoOverviewData    `json:"geo_overview"`
	Warehouses       []WarehouseItem    `json:"warehouses"`
}

// KPIData contains the five main KPI summary cards.
type KPIData struct {
	TotalRevenue   KPICard `json:"total_revenue"`
	TotalOrders    KPICard `json:"total_orders"`
	TotalCustomers KPICard `json:"total_customers"`
	TotalProducts  KPICard `json:"total_products"`
	EmployeeCount  KPICard `json:"employee_count"`
}

// KPICard represents a single KPI metric with period-over-period change.
type KPICard struct {
	Value  float64 `json:"value"`
	Change float64 `json:"change"`
}

// PeriodChartPoint is a data point for time-series charts.
type PeriodChartPoint struct {
	Period  string  `json:"period"`
	Revenue float64 `json:"revenue,omitempty"`
	Costs   float64 `json:"costs,omitempty"`
	Amount  float64 `json:"amount,omitempty"`
}

// BalanceData represents the balance widget data.
type BalanceData struct {
	Current float64            `json:"current"`
	Change  float64            `json:"change"`
	Trend   []PeriodChartPoint `json:"trend"`
}

// CostCategoryItem represents a single cost breakdown entry.
type CostCategoryItem struct {
	Category   string  `json:"category"`
	Amount     float64 `json:"amount"`
	Percentage float64 `json:"percentage"`
}

// InvoiceSummaryData contains invoice status counts.
type InvoiceSummaryData struct {
	Total   int `json:"total"`
	Paid    int `json:"paid"`
	Unpaid  int `json:"unpaid"`
	Overdue int `json:"overdue"`
}

// InvoiceRow represents a single recent invoice entry.
type InvoiceRow struct {
	ID           string  `json:"id"`
	InvoiceCode  string  `json:"invoice_code"`
	CustomerName string  `json:"customer_name"`
	Amount       float64 `json:"amount"`
	Status       string  `json:"status"`
	DueDate      string  `json:"due_date"`
}

// SalesPerformRow represents a sales representative performance entry.
type SalesPerformRow struct {
	Name    string  `json:"name"`
	Revenue float64 `json:"revenue"`
	Target  float64 `json:"target"`
}

// TopProductRow represents a top-selling product.
type TopProductRow struct {
	Name         string  `json:"name"`
	QuantitySold float64 `json:"quantity_sold"`
	Revenue      float64 `json:"revenue"`
}

// DeliveryStatusData contains delivery status breakdown.
type DeliveryStatusData struct {
	Total     int `json:"total"`
	Pending   int `json:"pending"`
	InTransit int `json:"in_transit"`
	Delivered int `json:"delivered"`
}

// GeoOverviewData contains geographic performance data.
type GeoOverviewData struct {
	Regions []GeoRegionData `json:"regions"`
}

// GeoRegionData represents performance data for a province/region.
type GeoRegionData struct {
	ProvinceID   string  `json:"province_id"`
	ProvinceName string  `json:"province_name"`
	TotalOrders  int     `json:"total_orders"`
	Revenue      float64 `json:"revenue"`
}

// WarehouseItem represents a warehouse utilization overview.
type WarehouseItem struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	ItemCount   int     `json:"item_count"`
	Capacity    float64 `json:"capacity"`
	Utilization float64 `json:"utilization"`
}

// ---- Dashboard Layout DTOs ----

// DashboardLayoutSaveRequest is the request body for saving a user's layout.
type DashboardLayoutSaveRequest struct {
DashboardType string `json:"dashboard_type" binding:"required"`
LayoutJSON    string `json:"layout_json" binding:"required"`
}

// DashboardLayoutResponse is the API response for a user's saved layout.
type DashboardLayoutResponse struct {
DashboardType string `json:"dashboard_type"`
LayoutJSON    string `json:"layout_json"`
}
