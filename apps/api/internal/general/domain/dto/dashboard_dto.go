package dto

// DashboardRequest holds the query parameters for filtering dashboard data.
type DashboardRequest struct {
	StartDate string `form:"start_date"`
	EndDate   string `form:"end_date"`
	Year      int    `form:"year"`
}

// DashboardOverviewResponse is the top-level dashboard API response.
// Field names exactly match the TypeScript DashboardOverviewData interface.
type DashboardOverviewResponse struct {
	KPI                KPIData               `json:"kpi"`
	RevenueChart       PeriodChartData       `json:"revenue_chart"`
	CostsChart         PeriodChartData       `json:"costs_chart"`
	RevenueVsCosts     PeriodChartData       `json:"revenue_vs_costs"`
	BalanceOverview    BalanceOverviewData   `json:"balance_overview"`
	CostsByCategory    []CostCategoryItem    `json:"costs_by_category"`
	InvoicesSummary    InvoiceSummaryData    `json:"invoices_summary"`
	RecentInvoices     []InvoiceRow          `json:"recent_invoices"`
	SalesPerformance   []SalesPerformanceRow `json:"sales_performance"`
	TopProducts        []TopProductRow       `json:"top_products"`
	DeliveryStatus     DeliveryStatusData    `json:"delivery_status"`
	GeographicOverview GeoOverviewData       `json:"geographic_overview"`
	WarehouseOverview  WarehouseOverviewData `json:"warehouse_overview"`
}

// KPIData contains the five main KPI summary cards.
type KPIData struct {
	TotalRevenue   KPICard `json:"total_revenue"`
	TotalOrders    KPICard `json:"total_orders"`
	TotalCustomers KPICard `json:"total_customers"`
	TotalProducts  KPICard `json:"total_products"`
	EmployeeCount  KPICard `json:"employee_count"`
}

// KPICard represents a single KPI metric.
// Formatted is computed by the usecase layer; repository only sets Value and ChangePercent.
type KPICard struct {
	Value         float64 `json:"value"`
	Formatted     string  `json:"formatted"`
	ChangePercent float64 `json:"change_percent"`
}

// ChartSeriesData is a named data series for a time-series chart widget.
type ChartSeriesData struct {
	Label     string    `json:"label"`
	Data      []float64 `json:"data"`
	Formatted []string  `json:"formatted"`
}

// PeriodChartData is the response format consumed by all chart widgets.
type PeriodChartData struct {
	Series []ChartSeriesData `json:"series"`
	Period []string          `json:"period"`
}

// PeriodChartPoint is an internal data point used only by the repository layer.
// It is not serialised to JSON directly.
type PeriodChartPoint struct {
	Period  string
	Revenue float64
	Costs   float64
	Amount  float64
}

// BalanceChartPoint is a single time-series entry for the balance trend chart.
type BalanceChartPoint struct {
	Period    string  `json:"period"`
	Value     float64 `json:"value"`
	Formatted string  `json:"formatted"`
}

// BalanceOverviewData is the response for the balance widget.
type BalanceOverviewData struct {
	Value         float64             `json:"value"`
	Formatted     string              `json:"formatted"`
	ChangePercent float64             `json:"change_percent"`
	ChartData     []BalanceChartPoint `json:"chart_data"`
}

// BalanceData is the raw balance data returned by the repository.
// It is transformed into BalanceOverviewData in the usecase layer.
type BalanceData struct {
	Current float64
	Change  float64
	Trend   []PeriodChartPoint
}

// CostCategoryItem represents a single cost breakdown entry.
type CostCategoryItem struct {
	Category        string  `json:"category"`
	Amount          float64 `json:"amount"`
	AmountFormatted string  `json:"amount_formatted"`
	Percentage      float64 `json:"percentage"`
}

// InvoiceSummaryData contains invoice status counts.
type InvoiceSummaryData struct {
	Total   int `json:"total"`
	Paid    int `json:"paid"`
	Unpaid  int `json:"unpaid"`
	Overdue int `json:"overdue"`
}

// InvoiceRow represents a single recent invoice entry.
// Field names match the TypeScript InvoiceRow interface.
type InvoiceRow struct {
	ID             string  `json:"id"`
	Company        string  `json:"company"`          // customer name
	Contact        string  `json:"contact"`           // invoice code
	IssueDate      string  `json:"issue_date"`        // due date
	Value          float64 `json:"value"`
	ValueFormatted string  `json:"value_formatted"`
	Status         string  `json:"status"` // "paid" | "unpaid" | "overdue"
}

// SalesPerformanceRow represents a sales representative performance entry.
type SalesPerformanceRow struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Revenue          float64 `json:"revenue"`
	RevenueFormatted string  `json:"revenue_formatted"`
	Orders           int     `json:"orders"`
	TargetPercent    float64 `json:"target_percent"`
}

// TopProductRow represents a top-selling product.
type TopProductRow struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	SKU              string  `json:"sku"`
	QuantitySold     float64 `json:"quantity_sold"`
	Revenue          float64 `json:"revenue"`
	RevenueFormatted string  `json:"revenue_formatted"`
}

// DeliveryStatusData contains delivery status breakdown.
type DeliveryStatusData struct {
	Total     int `json:"total"`
	Pending   int `json:"pending"`
	InTransit int `json:"in_transit"`
	Delivered int `json:"delivered"`
}

// GeoOverviewData contains geographic performance data.
// Field names match the TypeScript GeoOverviewData interface.
type GeoOverviewData struct {
	Regions        []GeoRegionData `json:"regions"`
	TotalValue     float64         `json:"total_value"`
	TotalFormatted string          `json:"total_formatted"`
}

// GeoRegionData represents performance data for a single province/region.
// Field names match the TypeScript GeoRegionData interface.
type GeoRegionData struct {
	Name      string  `json:"name"`      // province name
	Code      string  `json:"code"`      // province id
	Value     float64 `json:"value"`     // revenue
	Formatted string  `json:"formatted"` // formatted revenue
	Count     int     `json:"count"`     // total orders
}

// WarehouseItem represents a single warehouse in the overview widget.
// Field names match the TypeScript WarehouseItem interface.
type WarehouseItem struct {
	ID                 string  `json:"id"`
	Name               string  `json:"name"`
	Location           string  `json:"location"`
	StockValue         float64 `json:"stock_value"`
	StockFormatted     string  `json:"stock_formatted"`
	ItemCount          int     `json:"item_count"`
	UtilizationPercent float64 `json:"utilization_percent"`
	// Stock status breakdown — consistent with inventory feature status logic
	InStockCount    int `json:"in_stock_count"`
	LowStockCount   int `json:"low_stock_count"`
	OutOfStockCount int `json:"out_of_stock_count"`
}

// WarehouseOverviewData wraps the warehouse list with aggregate totals.
// Field names match the TypeScript WarehouseOverviewData interface.
type WarehouseOverviewData struct {
	Warehouses          []WarehouseItem `json:"warehouses"`
	TotalStockValue     float64         `json:"total_stock_value"`
	TotalStockFormatted string          `json:"total_stock_formatted"`
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
