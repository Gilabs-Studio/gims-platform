package repositories

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/utils"
	"gorm.io/gorm"
)

// SalesOverviewRepository defines data access for sales overview reports.
// It queries existing tables (employees, sales_orders, delivery_orders, etc.)
// without creating new models — this domain is purely read-only / aggregation.
type SalesOverviewRepository interface {
	// ListSalesRepPerformance returns paginated sales rep performance data
	ListSalesRepPerformance(ctx context.Context, params ListPerformanceParams) ([]SalesRepPerformanceRow, utils.PaginationResult, error)

	// GetMonthlySalesOverview returns monthly aggregated data
	GetMonthlySalesOverview(ctx context.Context, startDate, endDate time.Time) ([]MonthlySalesRow, error)

	// GetSalesRepDetail returns a single sales rep's identity + statistics
	GetSalesRepDetail(ctx context.Context, employeeID string, startDate, endDate time.Time) (*SalesRepDetailRow, error)

	// GetSalesRepCheckInLocations returns paginated visit check-in locations
	GetSalesRepCheckInLocations(ctx context.Context, employeeID string, params CheckInParams) ([]CheckInLocationRow, int, error)

	// GetSalesRepProducts returns paginated product sales for a rep
	GetSalesRepProducts(ctx context.Context, employeeID string, params ProductParams) ([]ProductSalesRow, utils.PaginationResult, error)

	// GetSalesRepCustomers returns paginated customer data for a rep
	GetSalesRepCustomers(ctx context.Context, employeeID string, params CustomerParams) ([]CustomerSalesRow, utils.PaginationResult, error)

	// GetMonthlyTargets returns monthly target amounts within a date range
	GetMonthlyTargets(ctx context.Context, startDate, endDate time.Time) ([]MonthlyTargetRow, error)

	// GetSalesRepYearlyTarget returns the target amount for a sales rep's area for a given year
	GetSalesRepYearlyTarget(ctx context.Context, employeeID string, year int) (float64, error)
}

// --- Parameter structs ---

type ListPerformanceParams struct {
	Search    string
	StartDate time.Time
	EndDate   time.Time
	Page      int
	PerPage   int
	SortBy    string
	Order     string
}

type CheckInParams struct {
	StartDate time.Time
	EndDate   time.Time
	Page      int
	PerPage   int
}

type ProductParams struct {
	StartDate time.Time
	EndDate   time.Time
	Page      int
	PerPage   int
	SortBy    string
	Order     string
}

type CustomerParams struct {
	StartDate time.Time
	EndDate   time.Time
	Page      int
	PerPage   int
	SortBy    string
	Order     string
}

// --- Result row structs (raw query results) ---

type SalesRepPerformanceRow struct {
	EmployeeID      string
	EmployeeCode    string
	Name            string
	Email           string
	AvatarURL       string
	PositionName    string
	DivisionName    string
	TotalRevenue    float64
	TotalOrders     int
	TotalDeliveries int
	TotalInvoices   int
	VisitsCompleted int
	TasksCompleted  int
}

type MonthlySalesRow struct {
	Month           int
	Year            int
	TotalRevenue    float64
	TotalOrders     int
	TotalVisits     int
	TotalDeliveries int
}

type MonthlyTargetRow struct {
	Month        int
	Year         int
	TargetAmount float64
}

type SalesRepDetailRow struct {
	EmployeeID   string
	EmployeeCode string
	Name         string
	Email        string
	AvatarURL    string
	PositionName string
	DivisionName string
	// Stats
	TotalRevenue    float64
	TotalOrders     int
	VisitsCompleted int
	TasksCompleted  int
	// Previous period stats for comparison
	PrevRevenue float64
	PrevOrders  int
	PrevVisits  int
}

type CheckInLocationRow struct {
	VisitID   string
	VisitCode string
	VisitDate time.Time
	CheckInAt *time.Time
	Latitude  *float64
	Longitude *float64
	Address   string
	// Customer info (from sales visit's company)
	CompanyID   *string
	CompanyName string
	Purpose     string
}

type ProductSalesRow struct {
	ProductID    string
	ProductName  string
	ProductSKU   string
	ProductImage string
	CategoryName string
	TotalQty     float64
	TotalRevenue float64
	LastSoldDate *time.Time
}

type CustomerSalesRow struct {
	CustomerID   string
	CustomerName string
	CustomerCode string
	CustomerType string
	CityName     string
	TotalRevenue float64
	TotalOrders  int
	IsActive     bool
}

// --- Implementation ---

type salesOverviewRepository struct {
	db *gorm.DB
}

func NewSalesOverviewRepository(db *gorm.DB) SalesOverviewRepository {
	return &salesOverviewRepository{db: db}
}

func (r *salesOverviewRepository) ListSalesRepPerformance(ctx context.Context, params ListPerformanceParams) ([]SalesRepPerformanceRow, utils.PaginationResult, error) {
	// Enforce pagination limits
	if params.PerPage <= 0 || params.PerPage > 100 {
		params.PerPage = 20
	}
	if params.Page <= 0 {
		params.Page = 1
	}

	// Base query: employees with Sales Representative position
	baseQuery := `
		FROM employees e
		INNER JOIN job_positions jp ON jp.id = e.job_position_id AND jp.name = 'Sales Representative'
		LEFT JOIN divisions d ON d.id = e.division_id
		LEFT JOIN users u ON u.id = e.user_id
		LEFT JOIN (
			SELECT so.sales_rep_id,
				COALESCE(SUM(so.total_amount), 0) AS total_revenue,
				COUNT(so.id) AS total_orders
			FROM sales_orders so
			WHERE so.deleted_at IS NULL
				AND so.status NOT IN ('draft', 'cancelled')
				AND so.order_date BETWEEN @startDate AND @endDate
			GROUP BY so.sales_rep_id
		) so_agg ON so_agg.sales_rep_id = e.id
		LEFT JOIN (
			SELECT so2.sales_rep_id,
				COUNT(dord.id) AS total_deliveries
			FROM delivery_orders dord
			INNER JOIN sales_orders so2 ON so2.id = dord.sales_order_id AND so2.deleted_at IS NULL
			WHERE dord.deleted_at IS NULL
				AND dord.status IN ('delivered', 'shipped')
				AND dord.delivery_date BETWEEN @startDate AND @endDate
			GROUP BY so2.sales_rep_id
		) do_agg ON do_agg.sales_rep_id = e.id
		LEFT JOIN (
			SELECT so3.sales_rep_id,
				COUNT(ci.id) AS total_invoices
			FROM customer_invoices ci
			INNER JOIN sales_orders so3 ON so3.id = ci.sales_order_id AND so3.deleted_at IS NULL
			WHERE ci.deleted_at IS NULL
				AND ci.status NOT IN ('draft', 'cancelled')
				AND ci.invoice_date BETWEEN @startDate AND @endDate
			GROUP BY so3.sales_rep_id
		) ci_agg ON ci_agg.sales_rep_id = e.id
		LEFT JOIN (
			SELECT sv.employee_id,
				COUNT(CASE WHEN sv.status = 'completed' THEN 1 END) AS visits_completed,
				COUNT(sv.id) AS tasks_completed
			FROM sales_visits sv
			WHERE sv.deleted_at IS NULL
				AND sv.visit_date BETWEEN @startDate AND @endDate
			GROUP BY sv.employee_id
		) sv_agg ON sv_agg.employee_id = e.id
		WHERE e.deleted_at IS NULL
			AND e.is_active = true
	`

	queryParams := map[string]interface{}{
		"startDate": params.StartDate,
		"endDate":   params.EndDate,
	}

	// Add search filter (prefix search for index efficiency)
	if params.Search != "" {
		baseQuery += ` AND (e.name ILIKE @search OR e.employee_code ILIKE @search)`
		queryParams["search"] = params.Search + "%"
	}

	// Count total
	var total int64
	countSQL := "SELECT COUNT(*) " + baseQuery
	if err := r.db.WithContext(ctx).Raw(countSQL, queryParams).Scan(&total).Error; err != nil {
		return nil, utils.PaginationResult{}, fmt.Errorf("failed to count sales rep performance: %w", err)
	}

	// Sort mapping
	sortColumn := "COALESCE(so_agg.total_revenue, 0)"
	switch params.SortBy {
	case "name":
		sortColumn = "e.name"
	case "orders":
		sortColumn = "COALESCE(so_agg.total_orders, 0)"
	case "visits":
		sortColumn = "COALESCE(sv_agg.visits_completed, 0)"
	case "revenue":
		sortColumn = "COALESCE(so_agg.total_revenue, 0)"
	}
	sortOrder := "DESC"
	if strings.EqualFold(params.Order, "asc") {
		sortOrder = "ASC"
	}

	offset := (params.Page - 1) * params.PerPage

	selectSQL := fmt.Sprintf(`
		SELECT
			e.id AS employee_id,
			e.employee_code,
			e.name,
			COALESCE(e.email, '') AS email,
			COALESCE(u.avatar_url, '') AS avatar_url,
			COALESCE(jp.name, '') AS position_name,
			COALESCE(d.name, '') AS division_name,
			COALESCE(so_agg.total_revenue, 0) AS total_revenue,
			COALESCE(so_agg.total_orders, 0) AS total_orders,
			COALESCE(do_agg.total_deliveries, 0) AS total_deliveries,
			COALESCE(ci_agg.total_invoices, 0) AS total_invoices,
			COALESCE(sv_agg.visits_completed, 0) AS visits_completed,
			COALESCE(sv_agg.tasks_completed, 0) AS tasks_completed
		%s
		ORDER BY %s %s, e.name ASC
		LIMIT @limit OFFSET @offset
	`, baseQuery, sortColumn, sortOrder)

	queryParams["limit"] = params.PerPage
	queryParams["offset"] = offset

	var rows []SalesRepPerformanceRow
	if err := r.db.WithContext(ctx).Raw(selectSQL, queryParams).Scan(&rows).Error; err != nil {
		return nil, utils.PaginationResult{}, fmt.Errorf("failed to list sales rep performance: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(params.PerPage)))
	pagination := utils.PaginationResult{
		Page:       params.Page,
		PerPage:    params.PerPage,
		Total:      int(total),
		TotalPages: totalPages,
	}

	return rows, pagination, nil
}

func (r *salesOverviewRepository) GetMonthlySalesOverview(ctx context.Context, startDate, endDate time.Time) ([]MonthlySalesRow, error) {
	query := `
		SELECT
			EXTRACT(MONTH FROM so.order_date)::int AS month,
			EXTRACT(YEAR FROM so.order_date)::int AS year,
			COALESCE(SUM(so.total_amount), 0) AS total_revenue,
			COUNT(so.id) AS total_orders,
			COALESCE(visit_counts.total_visits, 0) AS total_visits,
			COALESCE(delivery_counts.total_deliveries, 0) AS total_deliveries
		FROM sales_orders so
		LEFT JOIN (
			SELECT
				EXTRACT(MONTH FROM sv.visit_date)::int AS month,
				EXTRACT(YEAR FROM sv.visit_date)::int AS year,
				COUNT(CASE WHEN sv.status = 'completed' THEN 1 END) AS total_visits
			FROM sales_visits sv
			WHERE sv.deleted_at IS NULL
				AND sv.visit_date BETWEEN @startDate AND @endDate
			GROUP BY EXTRACT(MONTH FROM sv.visit_date), EXTRACT(YEAR FROM sv.visit_date)
		) visit_counts ON visit_counts.month = EXTRACT(MONTH FROM so.order_date) AND visit_counts.year = EXTRACT(YEAR FROM so.order_date)
		LEFT JOIN (
			SELECT
				EXTRACT(MONTH FROM dord.delivery_date)::int AS month,
				EXTRACT(YEAR FROM dord.delivery_date)::int AS year,
				COUNT(dord.id) AS total_deliveries
			FROM delivery_orders dord
			WHERE dord.deleted_at IS NULL
				AND dord.status IN ('delivered', 'shipped')
				AND dord.delivery_date BETWEEN @startDate AND @endDate
			GROUP BY EXTRACT(MONTH FROM dord.delivery_date), EXTRACT(YEAR FROM dord.delivery_date)
		) delivery_counts ON delivery_counts.month = EXTRACT(MONTH FROM so.order_date) AND delivery_counts.year = EXTRACT(YEAR FROM so.order_date)
		WHERE so.deleted_at IS NULL
			AND so.status NOT IN ('draft', 'cancelled')
			AND so.order_date BETWEEN @startDate AND @endDate
		GROUP BY EXTRACT(MONTH FROM so.order_date), EXTRACT(YEAR FROM so.order_date),
			visit_counts.total_visits, delivery_counts.total_deliveries
		ORDER BY year, month
	`

	var rows []MonthlySalesRow
	if err := r.db.WithContext(ctx).Raw(query, map[string]interface{}{
		"startDate": startDate,
		"endDate":   endDate,
	}).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("failed to get monthly sales overview: %w", err)
	}

	return rows, nil
}

func (r *salesOverviewRepository) GetMonthlyTargets(ctx context.Context, startDate, endDate time.Time) ([]MonthlyTargetRow, error) {
	query := `
		SELECT
			mt.month,
			yt.year,
			COALESCE(SUM(mt.target_amount), 0) AS target_amount
		FROM monthly_targets mt
		INNER JOIN yearly_targets yt ON yt.id = mt.yearly_target_id
		WHERE yt.deleted_at IS NULL
			AND mt.deleted_at IS NULL
			AND yt.status = 'approved'
			AND yt.year BETWEEN EXTRACT(YEAR FROM @startDate::date) AND EXTRACT(YEAR FROM @endDate::date)
		GROUP BY mt.month, yt.year
		ORDER BY yt.year, mt.month
	`
	var rows []MonthlyTargetRow
	if err := r.db.WithContext(ctx).Raw(query, map[string]interface{}{
		"startDate": startDate,
		"endDate":   endDate,
	}).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("failed to get monthly targets: %w", err)
	}
	return rows, nil
}

func (r *salesOverviewRepository) GetSalesRepDetail(ctx context.Context, employeeID string, startDate, endDate time.Time) (*SalesRepDetailRow, error) {
	// Calculate previous period (same duration, shifted back)
	duration := endDate.Sub(startDate)
	prevEnd := startDate.Add(-1 * 24 * time.Hour) // day before start
	prevStart := prevEnd.Add(-duration)

	query := `
		SELECT
			e.id AS employee_id,
			e.employee_code,
			e.name,
			COALESCE(e.email, '') AS email,
			COALESCE(u.avatar_url, '') AS avatar_url,
			COALESCE(jp.name, '') AS position_name,
			COALESCE(d.name, '') AS division_name,
			COALESCE(curr_orders.total_revenue, 0) AS total_revenue,
			COALESCE(curr_orders.total_orders, 0) AS total_orders,
			COALESCE(curr_visits.visits_completed, 0) AS visits_completed,
			COALESCE(curr_visits.tasks_completed, 0) AS tasks_completed,
			COALESCE(prev_orders.total_revenue, 0) AS prev_revenue,
			COALESCE(prev_orders.total_orders, 0) AS prev_orders,
			COALESCE(prev_visits.visits_completed, 0) AS prev_visits
		FROM employees e
		LEFT JOIN job_positions jp ON jp.id = e.job_position_id
		LEFT JOIN divisions d ON d.id = e.division_id
		LEFT JOIN users u ON u.id = e.user_id
		LEFT JOIN (
			SELECT so.sales_rep_id,
				SUM(so.total_amount) AS total_revenue,
				COUNT(so.id) AS total_orders
			FROM sales_orders so
			WHERE so.deleted_at IS NULL AND so.status NOT IN ('draft', 'cancelled')
				AND so.order_date BETWEEN @startDate AND @endDate
			GROUP BY so.sales_rep_id
		) curr_orders ON curr_orders.sales_rep_id = e.id
		LEFT JOIN (
			SELECT sv.employee_id,
				COUNT(CASE WHEN sv.status = 'completed' THEN 1 END) AS visits_completed,
				COUNT(sv.id) AS tasks_completed
			FROM sales_visits sv
			WHERE sv.deleted_at IS NULL AND sv.visit_date BETWEEN @startDate AND @endDate
			GROUP BY sv.employee_id
		) curr_visits ON curr_visits.employee_id = e.id
		LEFT JOIN (
			SELECT so.sales_rep_id,
				SUM(so.total_amount) AS total_revenue,
				COUNT(so.id) AS total_orders
			FROM sales_orders so
			WHERE so.deleted_at IS NULL AND so.status NOT IN ('draft', 'cancelled')
				AND so.order_date BETWEEN @prevStart AND @prevEnd
			GROUP BY so.sales_rep_id
		) prev_orders ON prev_orders.sales_rep_id = e.id
		LEFT JOIN (
			SELECT sv.employee_id,
				COUNT(CASE WHEN sv.status = 'completed' THEN 1 END) AS visits_completed
			FROM sales_visits sv
			WHERE sv.deleted_at IS NULL AND sv.visit_date BETWEEN @prevStart AND @prevEnd
			GROUP BY sv.employee_id
		) prev_visits ON prev_visits.employee_id = e.id
		WHERE e.id = @employeeID AND e.deleted_at IS NULL
	`

	var row SalesRepDetailRow
	if err := r.db.WithContext(ctx).Raw(query, map[string]interface{}{
		"employeeID": employeeID,
		"startDate":  startDate,
		"endDate":    endDate,
		"prevStart":  prevStart,
		"prevEnd":    prevEnd,
	}).Scan(&row).Error; err != nil {
		return nil, fmt.Errorf("failed to get sales rep detail: %w", err)
	}

	if row.EmployeeID == "" {
		return nil, nil
	}

	return &row, nil
}

func (r *salesOverviewRepository) GetSalesRepCheckInLocations(ctx context.Context, employeeID string, params CheckInParams) ([]CheckInLocationRow, int, error) {
	if params.PerPage <= 0 || params.PerPage > 100 {
		params.PerPage = 20
	}
	if params.Page <= 0 {
		params.Page = 1
	}

	baseWhere := `
		WHERE sv.employee_id = @employeeID
			AND sv.deleted_at IS NULL
			AND sv.check_in_at IS NOT NULL
			AND sv.visit_date BETWEEN @startDate AND @endDate
	`

	queryParams := map[string]interface{}{
		"employeeID": employeeID,
		"startDate":  params.StartDate,
		"endDate":    params.EndDate,
	}

	// Count total
	var total int64
	countSQL := `SELECT COUNT(*) FROM sales_visits sv ` + baseWhere
	if err := r.db.WithContext(ctx).Raw(countSQL, queryParams).Scan(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count check-in locations: %w", err)
	}

	offset := (params.Page - 1) * params.PerPage

	selectSQL := `
		SELECT
			sv.id AS visit_id,
			sv.code AS visit_code,
			sv.visit_date,
			sv.check_in_at,
			sv.latitude,
			sv.longitude,
			COALESCE(sv.address, '') AS address,
			sv.company_id,
			COALESCE(c.name, '') AS company_name,
			COALESCE(sv.purpose, '') AS purpose
		FROM sales_visits sv
		LEFT JOIN companies c ON c.id = sv.company_id
	` + baseWhere + `
		ORDER BY sv.visit_date DESC, sv.check_in_at DESC
		LIMIT @limit OFFSET @offset
	`
	queryParams["limit"] = params.PerPage
	queryParams["offset"] = offset

	var rows []CheckInLocationRow
	if err := r.db.WithContext(ctx).Raw(selectSQL, queryParams).Scan(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to get check-in locations: %w", err)
	}

	return rows, int(total), nil
}

func (r *salesOverviewRepository) GetSalesRepProducts(ctx context.Context, employeeID string, params ProductParams) ([]ProductSalesRow, utils.PaginationResult, error) {
	if params.PerPage <= 0 || params.PerPage > 100 {
		params.PerPage = 20
	}
	if params.Page <= 0 {
		params.Page = 1
	}

	baseQuery := `
		FROM sales_order_items soi
		INNER JOIN sales_orders so ON so.id = soi.sales_order_id
			AND so.deleted_at IS NULL
			AND so.status NOT IN ('draft', 'cancelled')
			AND so.sales_rep_id = @employeeID
			AND so.order_date BETWEEN @startDate AND @endDate
		INNER JOIN products p ON p.id = soi.product_id AND p.deleted_at IS NULL
		LEFT JOIN product_categories pc ON pc.id = p.category_id
		WHERE soi.deleted_at IS NULL
	`

	queryParams := map[string]interface{}{
		"employeeID": employeeID,
		"startDate":  params.StartDate,
		"endDate":    params.EndDate,
	}

	// Count distinct products
	var total int64
	countSQL := `SELECT COUNT(DISTINCT soi.product_id) ` + baseQuery
	if err := r.db.WithContext(ctx).Raw(countSQL, queryParams).Scan(&total).Error; err != nil {
		return nil, utils.PaginationResult{}, fmt.Errorf("failed to count products: %w", err)
	}

	// Sort mapping
	sortColumn := "SUM(soi.subtotal)"
	switch params.SortBy {
	case "total_quantity":
		sortColumn = "SUM(soi.quantity)"
	case "name":
		sortColumn = "p.name"
	case "revenue":
		sortColumn = "SUM(soi.subtotal)"
	}
	sortOrder := "DESC"
	if strings.EqualFold(params.Order, "asc") {
		sortOrder = "ASC"
	}

	offset := (params.Page - 1) * params.PerPage

	selectSQL := fmt.Sprintf(`
		SELECT
			soi.product_id,
			p.name AS product_name,
			COALESCE(p.sku, '') AS product_sku,
			COALESCE(p.image_url, '') AS product_image,
			COALESCE(pc.name, '') AS category_name,
			SUM(soi.quantity) AS total_qty,
			SUM(soi.subtotal) AS total_revenue,
			MAX(so.order_date) AS last_sold_date
		%s
		GROUP BY soi.product_id, p.name, p.sku, p.image_url, pc.name
		ORDER BY %s %s
		LIMIT @limit OFFSET @offset
	`, baseQuery, sortColumn, sortOrder)

	queryParams["limit"] = params.PerPage
	queryParams["offset"] = offset

	var rows []ProductSalesRow
	if err := r.db.WithContext(ctx).Raw(selectSQL, queryParams).Scan(&rows).Error; err != nil {
		return nil, utils.PaginationResult{}, fmt.Errorf("failed to get sales rep products: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(params.PerPage)))
	pagination := utils.PaginationResult{
		Page:       params.Page,
		PerPage:    params.PerPage,
		Total:      int(total),
		TotalPages: totalPages,
	}

	return rows, pagination, nil
}

func (r *salesOverviewRepository) GetSalesRepCustomers(ctx context.Context, employeeID string, params CustomerParams) ([]CustomerSalesRow, utils.PaginationResult, error) {
	if params.PerPage <= 0 || params.PerPage > 100 {
		params.PerPage = 20
	}
	if params.Page <= 0 {
		params.Page = 1
	}

	baseQuery := `
		FROM sales_orders so
		INNER JOIN customers cust ON cust.id = so.customer_id AND cust.deleted_at IS NULL
		LEFT JOIN customer_types ct ON ct.id = cust.customer_type_id
		LEFT JOIN cities city ON city.id = cust.city_id
		WHERE so.deleted_at IS NULL
			AND so.status NOT IN ('draft', 'cancelled')
			AND so.sales_rep_id = @employeeID
			AND so.order_date BETWEEN @startDate AND @endDate
	`

	queryParams := map[string]interface{}{
		"employeeID": employeeID,
		"startDate":  params.StartDate,
		"endDate":    params.EndDate,
	}

	// Count distinct customers
	var total int64
	countSQL := `SELECT COUNT(DISTINCT so.customer_id) ` + baseQuery
	if err := r.db.WithContext(ctx).Raw(countSQL, queryParams).Scan(&total).Error; err != nil {
		return nil, utils.PaginationResult{}, fmt.Errorf("failed to count customers: %w", err)
	}

	sortColumn := "SUM(so.total_amount)"
	switch params.SortBy {
	case "orders":
		sortColumn = "COUNT(so.id)"
	case "name":
		sortColumn = "cust.name"
	case "revenue":
		sortColumn = "SUM(so.total_amount)"
	}
	sortOrder := "DESC"
	if strings.EqualFold(params.Order, "asc") {
		sortOrder = "ASC"
	}

	offset := (params.Page - 1) * params.PerPage

	selectSQL := fmt.Sprintf(`
		SELECT
			cust.id AS customer_id,
			cust.name AS customer_name,
			COALESCE(cust.code, '') AS customer_code,
			COALESCE(ct.name, '') AS customer_type,
			COALESCE(city.name, '') AS city_name,
			SUM(so.total_amount) AS total_revenue,
			COUNT(so.id) AS total_orders,
			cust.is_active
		%s
		GROUP BY cust.id, cust.name, cust.code, ct.name, city.name, cust.is_active
		ORDER BY %s %s
		LIMIT @limit OFFSET @offset
	`, baseQuery, sortColumn, sortOrder)

	queryParams["limit"] = params.PerPage
	queryParams["offset"] = offset

	var rows []CustomerSalesRow
	if err := r.db.WithContext(ctx).Raw(selectSQL, queryParams).Scan(&rows).Error; err != nil {
		return nil, utils.PaginationResult{}, fmt.Errorf("failed to get sales rep customers: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(params.PerPage)))
	pagination := utils.PaginationResult{
		Page:       params.Page,
		PerPage:    params.PerPage,
		Total:      int(total),
		TotalPages: totalPages,
	}

	return rows, pagination, nil
}

func (r *salesOverviewRepository) GetSalesRepYearlyTarget(ctx context.Context, employeeID string, year int) (float64, error) {
	// Find target through employee's area assignments
	query := `
		SELECT COALESCE(SUM(yt.total_target), 0)
		FROM yearly_targets yt
		INNER JOIN employee_areas ea ON ea.area_id = yt.area_id
		WHERE ea.employee_id = @employeeID
			AND ea.deleted_at IS NULL
			AND yt.year = @year
			AND yt.status = 'approved'
			AND yt.deleted_at IS NULL
	`
	var target float64
	if err := r.db.WithContext(ctx).Raw(query, map[string]interface{}{
		"employeeID": employeeID,
		"year":       year,
	}).Scan(&target).Error; err != nil {
		return 0, fmt.Errorf("failed to get yearly target: %w", err)
	}
	return target, nil
}
