package repositories

import (
	"context"
	"time"

	"github.com/gilabs/gims/api/internal/general/domain/dto"
	"gorm.io/gorm"
)

// DashboardRepository defines the data access interface for all dashboard metrics.
type DashboardRepository interface {
	GetRevenueKPI(ctx context.Context, start, end time.Time) (dto.KPICard, error)
	GetOrdersKPI(ctx context.Context, start, end time.Time) (dto.KPICard, error)
	GetCustomersKPI(ctx context.Context) (dto.KPICard, error)
	GetProductsKPI(ctx context.Context) (dto.KPICard, error)
	GetEmployeeCountKPI(ctx context.Context) (dto.KPICard, error)
	GetRevenueChart(ctx context.Context, start, end time.Time) ([]dto.PeriodChartPoint, error)
	GetCostsChart(ctx context.Context, start, end time.Time) ([]dto.PeriodChartPoint, error)
	GetRevenueVsCosts(ctx context.Context, start, end time.Time) ([]dto.PeriodChartPoint, error)
	GetBalance(ctx context.Context, start, end time.Time) (dto.BalanceData, error)
	GetCostsByCategory(ctx context.Context, start, end time.Time) ([]dto.CostCategoryItem, error)
	GetInvoiceSummary(ctx context.Context, start, end time.Time) (dto.InvoiceSummaryData, error)
	GetRecentInvoices(ctx context.Context, limit int) ([]dto.InvoiceRow, error)
	GetSalesPerformance(ctx context.Context, start, end time.Time, limit int) ([]dto.SalesPerformRow, error)
	GetTopProducts(ctx context.Context, start, end time.Time, limit int) ([]dto.TopProductRow, error)
	GetDeliveryStatus(ctx context.Context, start, end time.Time) (dto.DeliveryStatusData, error)
	GetGeoOverview(ctx context.Context, start, end time.Time) (dto.GeoOverviewData, error)
	GetWarehouses(ctx context.Context) ([]dto.WarehouseItem, error)
}

type dashboardRepository struct {
	db *gorm.DB
}

// NewDashboardRepository creates a new DashboardRepository.
func NewDashboardRepository(db *gorm.DB) DashboardRepository {
	return &dashboardRepository{db: db}
}

const (
	approvedClosedWhere = "status IN (?) AND order_date BETWEEN ? AND ? AND deleted_at IS NULL"
	journalJoinEntries  = "JOIN journal_entries ON journal_entries.id = journal_lines.journal_entry_id"
	journalJoinAccounts = "JOIN chart_of_accounts ON chart_of_accounts.id = journal_lines.account_id"
	expenseWhere        = "chart_of_accounts.type = ? AND journal_entries.entry_date BETWEEN ? AND ? AND journal_entries.deleted_at IS NULL AND journal_entries.status = ?"
	salesOrderWhere     = "sales_orders.status IN (?) AND sales_orders.order_date BETWEEN ? AND ? AND sales_orders.deleted_at IS NULL"
)

var approvedStatuses = []string{"approved", "closed"}

func (r *dashboardRepository) GetRevenueKPI(ctx context.Context, start, end time.Time) (dto.KPICard, error) {
	var current float64
	if err := r.db.WithContext(ctx).Table("sales_orders").
		Where(approvedClosedWhere, approvedStatuses, start, end).
		Select("COALESCE(SUM(total_amount), 0)").Scan(&current).Error; err != nil {
		return dto.KPICard{}, err
	}
	duration := end.Sub(start)
	prevStart, prevEnd := start.Add(-duration), start.Add(-time.Second)
	var previous float64
	r.db.WithContext(ctx).Table("sales_orders").
		Where(approvedClosedWhere, approvedStatuses, prevStart, prevEnd).
		Select("COALESCE(SUM(total_amount), 0)").Scan(&previous)
	return dto.KPICard{Value: current, Change: calcChange(previous, current)}, nil
}

func (r *dashboardRepository) GetOrdersKPI(ctx context.Context, start, end time.Time) (dto.KPICard, error) {
	var current int64
	if err := r.db.WithContext(ctx).Table("sales_orders").
		Where("order_date BETWEEN ? AND ? AND deleted_at IS NULL", start, end).
		Count(&current).Error; err != nil {
		return dto.KPICard{}, err
	}
	duration := end.Sub(start)
	prevStart, prevEnd := start.Add(-duration), start.Add(-time.Second)
	var previous int64
	r.db.WithContext(ctx).Table("sales_orders").
		Where("order_date BETWEEN ? AND ? AND deleted_at IS NULL", prevStart, prevEnd).
		Count(&previous)
	return dto.KPICard{Value: float64(current), Change: calcChange(float64(previous), float64(current))}, nil
}

func (r *dashboardRepository) GetCustomersKPI(ctx context.Context) (dto.KPICard, error) {
	var count int64
	if err := r.db.WithContext(ctx).Table("customers").
		Where("is_active = ? AND deleted_at IS NULL", true).Count(&count).Error; err != nil {
		return dto.KPICard{}, err
	}
	return dto.KPICard{Value: float64(count)}, nil
}

func (r *dashboardRepository) GetProductsKPI(ctx context.Context) (dto.KPICard, error) {
	var count int64
	if err := r.db.WithContext(ctx).Table("products").
		Where("status = ? AND deleted_at IS NULL", "approved").Count(&count).Error; err != nil {
		return dto.KPICard{}, err
	}
	return dto.KPICard{Value: float64(count)}, nil
}

func (r *dashboardRepository) GetEmployeeCountKPI(ctx context.Context) (dto.KPICard, error) {
	var count int64
	if err := r.db.WithContext(ctx).Table("employees").
		Where("is_active = ? AND deleted_at IS NULL", true).Count(&count).Error; err != nil {
		return dto.KPICard{}, err
	}
	return dto.KPICard{Value: float64(count)}, nil
}

func (r *dashboardRepository) GetRevenueChart(ctx context.Context, start, end time.Time) ([]dto.PeriodChartPoint, error) {
	type row struct {
		Period string
		Amount float64
	}
	var rows []row
	if err := r.db.WithContext(ctx).Table("sales_orders").
		Select("TO_CHAR(order_date, 'YYYY-MM') as period, COALESCE(SUM(total_amount), 0) as amount").
		Where(approvedClosedWhere, approvedStatuses, start, end).
		Group("period").Order("period ASC").Scan(&rows).Error; err != nil {
		return nil, err
	}
	points := make([]dto.PeriodChartPoint, 0, len(rows))
	for _, row := range rows {
		points = append(points, dto.PeriodChartPoint{Period: row.Period, Revenue: row.Amount})
	}
	return points, nil
}

func (r *dashboardRepository) GetCostsChart(ctx context.Context, start, end time.Time) ([]dto.PeriodChartPoint, error) {
	type row struct {
		Period string
		Amount float64
	}
	var rows []row
	if err := r.db.WithContext(ctx).Table("journal_lines").
		Joins(journalJoinEntries).Joins(journalJoinAccounts).
		Select("TO_CHAR(journal_entries.entry_date, 'YYYY-MM') as period, COALESCE(SUM(journal_lines.debit_amount), 0) as amount").
		Where(expenseWhere, "EXPENSE", start, end, "posted").
		Group("period").Order("period ASC").Scan(&rows).Error; err != nil {
		return nil, err
	}
	points := make([]dto.PeriodChartPoint, 0, len(rows))
	for _, row := range rows {
		points = append(points, dto.PeriodChartPoint{Period: row.Period, Costs: row.Amount})
	}
	return points, nil
}

func (r *dashboardRepository) GetRevenueVsCosts(ctx context.Context, start, end time.Time) ([]dto.PeriodChartPoint, error) {
	revenue, err := r.GetRevenueChart(ctx, start, end)
	if err != nil {
		return nil, err
	}
	costs, err := r.GetCostsChart(ctx, start, end)
	if err != nil {
		return nil, err
	}
	merged := make(map[string]*dto.PeriodChartPoint)
	for i := range revenue {
		p := revenue[i]
		merged[p.Period] = &dto.PeriodChartPoint{Period: p.Period, Revenue: p.Revenue}
	}
	for i := range costs {
		p := costs[i]
		if existing, ok := merged[p.Period]; ok {
			existing.Costs = p.Costs
		} else {
			merged[p.Period] = &dto.PeriodChartPoint{Period: p.Period, Costs: p.Costs}
		}
	}
	result := make([]dto.PeriodChartPoint, 0, len(merged))
	for _, v := range merged {
		result = append(result, *v)
	}
	sortPeriodChartPoints(result)
	return result, nil
}

func (r *dashboardRepository) GetBalance(ctx context.Context, start, end time.Time) (dto.BalanceData, error) {
	var current float64
	r.db.WithContext(ctx).Table("journal_lines").
		Joins(journalJoinEntries).Joins(journalJoinAccounts).
		Select("COALESCE(SUM(journal_lines.debit_amount) - SUM(journal_lines.credit_amount), 0)").
		Where("chart_of_accounts.type = ? AND journal_entries.deleted_at IS NULL AND journal_entries.status = ?", "CASH_BANK", "posted").
		Scan(&current)

	type row struct {
		Period string
		Amount float64
	}
	var rows []row
	r.db.WithContext(ctx).Table("journal_lines").
		Joins(journalJoinEntries).Joins(journalJoinAccounts).
		Select("TO_CHAR(journal_entries.entry_date, 'YYYY-MM') as period, COALESCE(SUM(journal_lines.debit_amount) - SUM(journal_lines.credit_amount), 0) as amount").
		Where("chart_of_accounts.type = ? AND journal_entries.entry_date BETWEEN ? AND ? AND journal_entries.deleted_at IS NULL AND journal_entries.status = ?",
			"CASH_BANK", start, end, "posted").
		Group("period").Order("period ASC").Scan(&rows)

	trend := make([]dto.PeriodChartPoint, 0, len(rows))
	for _, row := range rows {
		trend = append(trend, dto.PeriodChartPoint{Period: row.Period, Amount: row.Amount})
	}
	return dto.BalanceData{Current: current, Trend: trend}, nil
}

func (r *dashboardRepository) GetCostsByCategory(ctx context.Context, start, end time.Time) ([]dto.CostCategoryItem, error) {
	type row struct {
		Category string
		Amount   float64
	}
	var rows []row
	if err := r.db.WithContext(ctx).Table("journal_lines").
		Joins(journalJoinEntries).Joins(journalJoinAccounts).
		Select("chart_of_accounts.name as category, COALESCE(SUM(journal_lines.debit_amount), 0) as amount").
		Where(expenseWhere, "EXPENSE", start, end, "posted").
		Group("chart_of_accounts.name").Order("amount DESC").Limit(10).Scan(&rows).Error; err != nil {
		return nil, err
	}
	var total float64
	for _, row := range rows {
		total += row.Amount
	}
	items := make([]dto.CostCategoryItem, 0, len(rows))
	for _, row := range rows {
		pct := float64(0)
		if total > 0 {
			pct = (row.Amount / total) * 100
		}
		items = append(items, dto.CostCategoryItem{Category: row.Category, Amount: row.Amount, Percentage: pct})
	}
	return items, nil
}

func (r *dashboardRepository) GetInvoiceSummary(ctx context.Context, start, end time.Time) (dto.InvoiceSummaryData, error) {
	var summary dto.InvoiceSummaryData
	var total, paid, unpaid, overdue int64
	r.db.WithContext(ctx).Table("customer_invoices").
		Where("invoice_date BETWEEN ? AND ? AND deleted_at IS NULL", start, end).Count(&total)
	r.db.WithContext(ctx).Table("customer_invoices").
		Where("invoice_date BETWEEN ? AND ? AND deleted_at IS NULL AND status = ?", start, end, "paid").Count(&paid)
	r.db.WithContext(ctx).Table("customer_invoices").
		Where("invoice_date BETWEEN ? AND ? AND deleted_at IS NULL AND status IN (?)", start, end, []string{"unpaid", "draft", "sent", "approved"}).Count(&unpaid)
	r.db.WithContext(ctx).Table("customer_invoices").
		Where("invoice_date BETWEEN ? AND ? AND deleted_at IS NULL AND status NOT IN (?) AND due_date < NOW()",
			start, end, []string{"paid", "cancelled"}).Count(&overdue)
	summary.Total = int(total)
	summary.Paid = int(paid)
	summary.Unpaid = int(unpaid)
	summary.Overdue = int(overdue)
	return summary, nil
}

func (r *dashboardRepository) GetRecentInvoices(ctx context.Context, limit int) ([]dto.InvoiceRow, error) {
	type row struct {
		ID           string
		Code         string
		CustomerName string
		Amount       float64
		Status       string
		DueDate      *time.Time
	}
	var rows []row
	if err := r.db.WithContext(ctx).Table("customer_invoices").
		Joins("LEFT JOIN sales_orders ON sales_orders.id = customer_invoices.sales_order_id").
		Select("customer_invoices.id, customer_invoices.code, sales_orders.customer_name, customer_invoices.amount, customer_invoices.status, customer_invoices.due_date").
		Where("customer_invoices.deleted_at IS NULL").
		Order("customer_invoices.created_at DESC").Limit(limit).Scan(&rows).Error; err != nil {
		return nil, err
	}
	invoices := make([]dto.InvoiceRow, 0, len(rows))
	for _, row := range rows {
		dueStr := ""
		if row.DueDate != nil {
			dueStr = row.DueDate.Format("2006-01-02")
		}
		invoices = append(invoices, dto.InvoiceRow{
			ID: row.ID, InvoiceCode: row.Code, CustomerName: row.CustomerName,
			Amount: row.Amount, Status: row.Status, DueDate: dueStr,
		})
	}
	return invoices, nil
}

func (r *dashboardRepository) GetSalesPerformance(ctx context.Context, start, end time.Time, limit int) ([]dto.SalesPerformRow, error) {
	type row struct {
		Name    string
		Revenue float64
	}
	var rows []row
	if err := r.db.WithContext(ctx).Table("sales_orders").
		Joins("JOIN employees ON employees.id = sales_orders.sales_rep_id").
		Select("employees.name as name, COALESCE(SUM(sales_orders.total_amount), 0) as revenue").
		Where(salesOrderWhere, approvedStatuses, start, end).
		Group("employees.name").Order("revenue DESC").Limit(limit).Scan(&rows).Error; err != nil {
		return nil, err
	}
	maxRevenue := float64(0)
	for _, row := range rows {
		if row.Revenue > maxRevenue {
			maxRevenue = row.Revenue
		}
	}
	perfs := make([]dto.SalesPerformRow, 0, len(rows))
	for _, row := range rows {
		perfs = append(perfs, dto.SalesPerformRow{Name: row.Name, Revenue: row.Revenue, Target: maxRevenue})
	}
	return perfs, nil
}

func (r *dashboardRepository) GetTopProducts(ctx context.Context, start, end time.Time, limit int) ([]dto.TopProductRow, error) {
	type row struct {
		Name         string
		QuantitySold float64
		Revenue      float64
	}
	var rows []row
	if err := r.db.WithContext(ctx).Table("sales_order_items").
		Joins("JOIN sales_orders ON sales_orders.id = sales_order_items.sales_order_id").
		Joins("JOIN products ON products.id = sales_order_items.product_id").
		Select("products.name as name, COALESCE(SUM(sales_order_items.quantity), 0) as quantity_sold, COALESCE(SUM(sales_order_items.subtotal), 0) as revenue").
		Where(salesOrderWhere, approvedStatuses, start, end).
		Group("products.name").Order("revenue DESC").Limit(limit).Scan(&rows).Error; err != nil {
		return nil, err
	}
	products := make([]dto.TopProductRow, 0, len(rows))
	for _, row := range rows {
		products = append(products, dto.TopProductRow{Name: row.Name, QuantitySold: row.QuantitySold, Revenue: row.Revenue})
	}
	return products, nil
}

func (r *dashboardRepository) GetDeliveryStatus(ctx context.Context, start, end time.Time) (dto.DeliveryStatusData, error) {
	var data dto.DeliveryStatusData
	var total, pending, inTransit, delivered int64
	r.db.WithContext(ctx).Table("delivery_orders").
		Where("delivery_date BETWEEN ? AND ? AND deleted_at IS NULL", start, end).Count(&total)
	r.db.WithContext(ctx).Table("delivery_orders").
		Where("delivery_date BETWEEN ? AND ? AND deleted_at IS NULL AND status IN (?)",
			start, end, []string{"draft", "sent", "approved", "prepared"}).Count(&pending)
	r.db.WithContext(ctx).Table("delivery_orders").
		Where("delivery_date BETWEEN ? AND ? AND deleted_at IS NULL AND status = ?", start, end, "shipped").Count(&inTransit)
	r.db.WithContext(ctx).Table("delivery_orders").
		Where("delivery_date BETWEEN ? AND ? AND deleted_at IS NULL AND status = ?", start, end, "delivered").Count(&delivered)
	data.Total = int(total)
	data.Pending = int(pending)
	data.InTransit = int(inTransit)
	data.Delivered = int(delivered)
	return data, nil
}

func (r *dashboardRepository) GetGeoOverview(ctx context.Context, start, end time.Time) (dto.GeoOverviewData, error) {
	type row struct {
		ProvinceID   string
		ProvinceName string
		TotalOrders  int
		Revenue      float64
	}
	var rows []row
	if err := r.db.WithContext(ctx).Table("sales_orders").
		Joins("JOIN customers ON customers.id = sales_orders.customer_id").
		Joins("LEFT JOIN provinces ON provinces.id = customers.province_id").
		Select("COALESCE(provinces.id::text, 'unknown') as province_id, COALESCE(provinces.name, 'Unknown') as province_name, COUNT(sales_orders.id) as total_orders, COALESCE(SUM(sales_orders.total_amount), 0) as revenue").
		Where(salesOrderWhere, approvedStatuses, start, end).
		Group("provinces.id, provinces.name").Order("revenue DESC").Scan(&rows).Error; err != nil {
		return dto.GeoOverviewData{}, err
	}
	regions := make([]dto.GeoRegionData, 0, len(rows))
	for _, row := range rows {
		regions = append(regions, dto.GeoRegionData{
			ProvinceID: row.ProvinceID, ProvinceName: row.ProvinceName,
			TotalOrders: row.TotalOrders, Revenue: row.Revenue,
		})
	}
	return dto.GeoOverviewData{Regions: regions}, nil
}

func (r *dashboardRepository) GetWarehouses(ctx context.Context) ([]dto.WarehouseItem, error) {
	type row struct {
		ID        string
		Name      string
		Capacity  float64
		ItemCount int
	}
	var rows []row
	if err := r.db.WithContext(ctx).Table("warehouses").
		Select("warehouses.id, warehouses.name, warehouses.capacity, COALESCE(inv.item_count, 0) as item_count").
		Joins("LEFT JOIN (SELECT warehouse_id, COUNT(DISTINCT product_id) as item_count FROM inventories WHERE deleted_at IS NULL GROUP BY warehouse_id) inv ON inv.warehouse_id = warehouses.id").
		Where("warehouses.is_active = ? AND warehouses.deleted_at IS NULL", true).
		Order("warehouses.name ASC").Scan(&rows).Error; err != nil {
		return nil, err
	}
	items := make([]dto.WarehouseItem, 0, len(rows))
	for _, row := range rows {
		utilization := float64(0)
		if row.Capacity > 0 {
			utilization = (float64(row.ItemCount) / row.Capacity) * 100
			if utilization > 100 {
				utilization = 100
			}
		}
		items = append(items, dto.WarehouseItem{
			ID: row.ID, Name: row.Name, ItemCount: row.ItemCount,
			Capacity: row.Capacity, Utilization: utilization,
		})
	}
	return items, nil
}

func calcChange(previous, current float64) float64 {
	if previous == 0 {
		if current > 0 {
			return 100
		}
		return 0
	}
	return ((current - previous) / previous) * 100
}

func sortPeriodChartPoints(points []dto.PeriodChartPoint) {
	for i := 1; i < len(points); i++ {
		key := points[i]
		j := i - 1
		for j >= 0 && points[j].Period > key.Period {
			points[j+1] = points[j]
			j--
		}
		points[j+1] = key
	}
}
