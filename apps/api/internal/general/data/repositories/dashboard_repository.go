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
	GetSalesPerformance(ctx context.Context, start, end time.Time, limit int) ([]dto.SalesPerformanceRow, error)
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
	journalJoinAccounts = "JOIN chart_of_accounts ON chart_of_accounts.id = journal_lines.chart_of_account_id"
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
	return dto.KPICard{Value: current, ChangePercent: calcChange(previous, current)}, nil
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
	return dto.KPICard{Value: float64(current), ChangePercent: calcChange(float64(previous), float64(current))}, nil
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
		Select("TO_CHAR(journal_entries.entry_date, 'YYYY-MM') as period, COALESCE(SUM(journal_lines.debit), 0) as amount").
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
		Select("COALESCE(SUM(journal_lines.debit) - SUM(journal_lines.credit), 0)").
		Where("chart_of_accounts.type IN ? AND journal_entries.deleted_at IS NULL AND journal_entries.status = ?",
			[]string{"CASH_BANK", "ASSET", "CURRENT_ASSET"}, "posted").
		Scan(&current)

	type row struct {
		Period string
		Amount float64
	}
	var rows []row
	r.db.WithContext(ctx).Table("journal_lines").
		Joins(journalJoinEntries).Joins(journalJoinAccounts).
		Select("TO_CHAR(journal_entries.entry_date, 'YYYY-MM') as period, COALESCE(SUM(journal_lines.debit) - SUM(journal_lines.credit), 0) as amount").
		Where("chart_of_accounts.type IN ? AND journal_entries.entry_date BETWEEN ? AND ? AND journal_entries.deleted_at IS NULL AND journal_entries.status = ?",
			[]string{"CASH_BANK", "ASSET", "CURRENT_ASSET"}, start, end, "posted").
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
		Select("chart_of_accounts.name as category, COALESCE(SUM(journal_lines.debit), 0) as amount").
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
		Select("customer_invoices.id, customer_invoices.code, COALESCE(sales_orders.customer_name, '') as customer_name, customer_invoices.amount, customer_invoices.status, customer_invoices.due_date").
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
			ID:        row.ID,
			Company:   row.CustomerName,
			Contact:   row.Code,
			IssueDate: dueStr,
			Value:     row.Amount,
			Status:    normalizeInvoiceStatus(row.Status),
		})
	}
	return invoices, nil
}

func normalizeInvoiceStatus(status string) string {
	switch status {
	case "paid":
		return "paid"
	case "overdue":
		return "overdue"
	default:
		return "unpaid"
	}
}

func (r *dashboardRepository) GetSalesPerformance(ctx context.Context, start, end time.Time, limit int) ([]dto.SalesPerformanceRow, error) {
	type row struct {
		EmployeeID string
		Name       string
		Revenue    float64
		Orders     int64
	}
	var rows []row
	if err := r.db.WithContext(ctx).Table("sales_orders").
		Joins("JOIN employees ON employees.id = sales_orders.sales_rep_id").
		Select("employees.id::text as employee_id, employees.name as name, COALESCE(SUM(sales_orders.total_amount), 0) as revenue, COUNT(sales_orders.id) as orders").
		Where(salesOrderWhere, approvedStatuses, start, end).
		Group("employees.id, employees.name").Order("revenue DESC").Limit(limit).Scan(&rows).Error; err != nil {
		return nil, err
	}
	maxRevenue := float64(0)
	for _, row := range rows {
		if row.Revenue > maxRevenue {
			maxRevenue = row.Revenue
		}
	}
	perfs := make([]dto.SalesPerformanceRow, 0, len(rows))
	for _, row := range rows {
		targetPct := float64(0)
		if maxRevenue > 0 {
			targetPct = (row.Revenue / maxRevenue) * 100
		}
		perfs = append(perfs, dto.SalesPerformanceRow{
			ID:            row.EmployeeID,
			Name:          row.Name,
			Revenue:       row.Revenue,
			Orders:        int(row.Orders),
			TargetPercent: targetPct,
		})
	}
	return perfs, nil
}

func (r *dashboardRepository) GetTopProducts(ctx context.Context, start, end time.Time, limit int) ([]dto.TopProductRow, error) {
	type row struct {
		ProductID    string
		Name         string
		SKU          string
		QuantitySold float64
		Revenue      float64
	}
	var rows []row
	if err := r.db.WithContext(ctx).Table("sales_order_items").
		Joins("JOIN sales_orders ON sales_orders.id = sales_order_items.sales_order_id").
		Joins("JOIN products ON products.id = sales_order_items.product_id").
		Select("products.id::text as product_id, products.name as name, COALESCE(products.sku, '') as sku, COALESCE(SUM(sales_order_items.quantity), 0) as quantity_sold, COALESCE(SUM(sales_order_items.subtotal), 0) as revenue").
		Where(salesOrderWhere, approvedStatuses, start, end).
		Group("products.id, products.name, products.sku").Order("revenue DESC").Limit(limit).Scan(&rows).Error; err != nil {
		return nil, err
	}
	products := make([]dto.TopProductRow, 0, len(rows))
	for _, row := range rows {
		products = append(products, dto.TopProductRow{
			ID:           row.ProductID,
			Name:         row.Name,
			SKU:          row.SKU,
			QuantitySold: row.QuantitySold,
			Revenue:      row.Revenue,
		})
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
		Code         string
		Name         string
		Count        int
		Value        float64
	}
	var rows []row
	if err := r.db.WithContext(ctx).Table("sales_orders").
		Joins("JOIN customers ON customers.id = sales_orders.customer_id").
		Joins("LEFT JOIN provinces ON provinces.id = customers.province_id").
		Select("COALESCE(provinces.id::text, 'unknown') as code, COALESCE(provinces.name, 'Unknown') as name, COUNT(sales_orders.id) as count, COALESCE(SUM(sales_orders.total_amount), 0) as value").
		Where(salesOrderWhere, approvedStatuses, start, end).
		Group("provinces.id, provinces.name").Order("value DESC").Scan(&rows).Error; err != nil {
		return dto.GeoOverviewData{}, err
	}
	regions := make([]dto.GeoRegionData, 0, len(rows))
	var totalValue float64
	for _, row := range rows {
		totalValue += row.Value
		regions = append(regions, dto.GeoRegionData{
			Code:  row.Code,
			Name:  row.Name,
			Value: row.Value,
			Count: row.Count,
		})
	}
	return dto.GeoOverviewData{Regions: regions, TotalValue: totalValue}, nil
}

func (r *dashboardRepository) GetWarehouses(ctx context.Context) ([]dto.WarehouseItem, error) {
	type row struct {
		ID              string
		Name            string
		Address         string
		Capacity        float64
		ItemCount       int
		StockValue      float64
		InStockCount    int
		LowStockCount   int
		OutOfStockCount int
	}
	var rows []row
	// Use a CTE mirroring the inventory feature's stock-status logic:
	// out_of_stock: available <= 0
	// low_stock:    available > 0 AND available <= products.min_stock
	// in_stock:     available > products.min_stock (or min_stock = 0 and available > 0)
	if err := r.db.WithContext(ctx).Raw(`
		WITH stock_levels AS (
			SELECT
				ib.warehouse_id,
				ib.product_id,
				p.min_stock,
				COALESCE(SUM(ib.current_quantity) - SUM(ib.reserved_quantity), 0) AS available
			FROM inventory_batches ib
			JOIN products p ON p.id = ib.product_id
			WHERE ib.deleted_at IS NULL AND ib.is_active = true AND p.deleted_at IS NULL
			GROUP BY ib.warehouse_id, ib.product_id, p.min_stock
		),
		warehouse_stats AS (
			SELECT
				ib2.warehouse_id,
				COUNT(DISTINCT ib2.product_id)                         AS item_count,
				COALESCE(SUM(ib2.current_quantity * ib2.cost_price), 0) AS stock_value
			FROM inventory_batches ib2
			WHERE ib2.deleted_at IS NULL AND ib2.is_active = true
			GROUP BY ib2.warehouse_id
		)
		SELECT
			w.id,
			w.name,
			COALESCE(w.address, '')      AS address,
			COALESCE(w.capacity, 0)      AS capacity,
			COALESCE(ws.item_count, 0)   AS item_count,
			COALESCE(ws.stock_value, 0)  AS stock_value,
			COUNT(CASE WHEN sl.available > sl.min_stock OR (sl.min_stock = 0 AND sl.available > 0) THEN 1 END) AS in_stock_count,
			COUNT(CASE WHEN sl.available > 0 AND sl.available <= sl.min_stock AND sl.min_stock > 0 THEN 1 END)  AS low_stock_count,
			COUNT(CASE WHEN sl.available <= 0 THEN 1 END)                                                       AS out_of_stock_count
		FROM warehouses w
		LEFT JOIN warehouse_stats ws ON ws.warehouse_id = w.id
		LEFT JOIN stock_levels sl ON sl.warehouse_id = w.id
		WHERE w.is_active = true AND w.deleted_at IS NULL
		GROUP BY w.id, w.name, w.address, w.capacity, ws.item_count, ws.stock_value
		ORDER BY w.name ASC
	`).Scan(&rows).Error; err != nil {
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
			ID:                 row.ID,
			Name:               row.Name,
			Location:           row.Address,
			StockValue:         row.StockValue,
			ItemCount:          row.ItemCount,
			UtilizationPercent: utilization,
			InStockCount:       row.InStockCount,
			LowStockCount:      row.LowStockCount,
			OutOfStockCount:    row.OutOfStockCount,
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
