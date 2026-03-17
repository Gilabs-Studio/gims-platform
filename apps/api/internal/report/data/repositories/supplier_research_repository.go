package repositories

import (
	"context"
	"fmt"
	"math"
	"slices"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/utils"
	"gorm.io/gorm"
)

// SupplierResearchRepository defines data access for supplier research reports.
type SupplierResearchRepository interface {
	GetKpis(ctx context.Context, params SupplierResearchFilterParams) (*SupplierResearchKpisRow, error)
	ListPurchaseVolume(ctx context.Context, params SupplierResearchListParams) ([]SupplierAnalyticsRow, utils.PaginationResult, error)
	ListDeliveryTime(ctx context.Context, params SupplierResearchListParams) ([]SupplierAnalyticsRow, utils.PaginationResult, error)
	GetSpendTrend(ctx context.Context, params SupplierResearchFilterParams, interval string) ([]SupplierSpendTrendPointRow, error)
	ListSuppliers(ctx context.Context, params SupplierResearchListParams) ([]SupplierAnalyticsRow, utils.PaginationResult, error)
	GetSupplierDetail(ctx context.Context, supplierID string, params SupplierResearchFilterParams) (*SupplierAnalyticsRow, error)
}

type SupplierResearchFilterParams struct {
	Search           string
	StartDate        time.Time
	EndDate          time.Time
	CategoryIDs      []string
	MinPurchaseValue float64
	MaxPurchaseValue float64
}

type SupplierResearchListParams struct {
	SupplierResearchFilterParams
	Page    int
	PerPage int
	SortBy  string
	Order   string
	Tab     string
}

type SupplierResearchKpisRow struct {
	TotalSuppliers      int
	ActiveSuppliers     int
	TotalPurchaseValue  float64
	AverageLeadTimeDays float64
}

type SupplierAnalyticsRow struct {
	SupplierID          string
	SupplierCode        string
	SupplierName        string
	CategoryName        string
	TotalPurchaseValue  float64
	TotalPurchaseOrders int
	AverageLeadTimeDays float64
	SupplierOnTimeRate  float64
	LateDeliveryCount   int
	DependencyScore     float64
}

type SupplierSpendTrendPointRow struct {
	Period             string
	TotalPurchaseValue float64
}

type supplierResearchRepository struct {
	db *gorm.DB
}

func NewSupplierResearchRepository(db *gorm.DB) SupplierResearchRepository {
	return &supplierResearchRepository{db: db}
}

func (r *supplierResearchRepository) GetKpis(ctx context.Context, params SupplierResearchFilterParams) (*SupplierResearchKpisRow, error) {
	baseQuery, queryParams := buildSupplierAnalyticsBaseQuery(params)

	query := fmt.Sprintf(`
		SELECT
			COUNT(*) AS total_suppliers,
			COUNT(CASE WHEN base.total_purchase_orders > 0 THEN 1 END) AS active_suppliers,
			COALESCE(SUM(base.total_purchase_value), 0) AS total_purchase_value,
			COALESCE(AVG(CASE WHEN base.average_lead_time_days > 0 THEN base.average_lead_time_days END), 0) AS average_lead_time_days
		FROM (%s) base
	`, baseQuery)

	var row SupplierResearchKpisRow
	if err := r.db.WithContext(ctx).Raw(query, queryParams).Scan(&row).Error; err != nil {
		return nil, fmt.Errorf("failed to get supplier research KPIs: %w", err)
	}

	return &row, nil
}

func (r *supplierResearchRepository) ListPurchaseVolume(ctx context.Context, params SupplierResearchListParams) ([]SupplierAnalyticsRow, utils.PaginationResult, error) {
	if params.SortBy == "" {
		params.SortBy = "purchase_value"
	}
	return r.listAnalytics(ctx, params)
}

func (r *supplierResearchRepository) ListDeliveryTime(ctx context.Context, params SupplierResearchListParams) ([]SupplierAnalyticsRow, utils.PaginationResult, error) {
	if params.SortBy == "" {
		params.SortBy = "lead_time"
	}
	return r.listAnalytics(ctx, params)
}

func (r *supplierResearchRepository) ListSuppliers(ctx context.Context, params SupplierResearchListParams) ([]SupplierAnalyticsRow, utils.PaginationResult, error) {
	if params.Tab == "" {
		params.Tab = "top_spenders"
	}

	if params.SortBy == "" {
		switch params.Tab {
		case "slow_delivery":
			params.SortBy = "lead_time"
		case "reliability":
			params.SortBy = "on_time_rate"
		default:
			params.SortBy = "purchase_value"
		}
	}

	return r.listAnalytics(ctx, params)
}

func (r *supplierResearchRepository) GetSupplierDetail(ctx context.Context, supplierID string, params SupplierResearchFilterParams) (*SupplierAnalyticsRow, error) {
	baseQuery, queryParams := buildSupplierAnalyticsBaseQuery(params)
	queryParams["supplierID"] = supplierID

	query := fmt.Sprintf(`
		SELECT
			base.supplier_id,
			base.supplier_code,
			base.supplier_name,
			base.category_name,
			base.total_purchase_value,
			base.total_purchase_orders,
			base.average_lead_time_days,
			base.supplier_on_time_rate,
			base.late_delivery_count,
			base.dependency_score
		FROM (%s) base
		WHERE base.supplier_id = @supplierID
		LIMIT 1
	`, baseQuery)

	var row SupplierAnalyticsRow
	if err := r.db.WithContext(ctx).Raw(query, queryParams).Scan(&row).Error; err != nil {
		return nil, fmt.Errorf("failed to get supplier detail analytics: %w", err)
	}
	if row.SupplierID == "" {
		return nil, nil
	}

	return &row, nil
}

func (r *supplierResearchRepository) GetSpendTrend(ctx context.Context, params SupplierResearchFilterParams, interval string) ([]SupplierSpendTrendPointRow, error) {
	dateColumn := "NULLIF(si.invoice_date, '')::date"
	switch strings.ToLower(interval) {
	case "daily":
		dateColumn = "NULLIF(si.invoice_date, '')::date"
	case "weekly":
		dateColumn = "DATE_TRUNC('week', NULLIF(si.invoice_date, '')::date)::date"
	default:
		dateColumn = "DATE_TRUNC('month', NULLIF(si.invoice_date, '')::date)::date"
	}

	query := fmt.Sprintf(`
		SELECT
			%s::text AS period,
			COALESCE(SUM(si.amount), 0) AS total_purchase_value
		FROM supplier_invoices si
		INNER JOIN suppliers s ON s.id = si.supplier_id AND s.deleted_at IS NULL
		LEFT JOIN supplier_types st ON st.id = s.supplier_type_id AND st.deleted_at IS NULL
		WHERE si.deleted_at IS NULL
			AND si.status NOT IN ('DRAFT', 'REJECTED', 'CANCELLED')
			AND NULLIF(si.invoice_date, '')::date BETWEEN CAST(@startDate AS date) AND CAST(@endDate AS date)
			AND (@search = '' OR s.name ILIKE @searchPrefix OR s.code ILIKE @searchPrefix)
			AND (@categoryFilter = false OR COALESCE(s.supplier_type_id::text, '') = ANY(string_to_array(@categoryIDsCSV, ',')))
		GROUP BY 1
		ORDER BY 1 ASC
	`, dateColumn)

	queryParams := map[string]interface{}{
		"startDate":      params.StartDate.Format("2006-01-02"),
		"endDate":        params.EndDate.Format("2006-01-02"),
		"search":         strings.TrimSpace(params.Search),
		"searchPrefix":   strings.TrimSpace(params.Search) + "%",
		"categoryFilter": len(params.CategoryIDs) > 0,
		"categoryIDsCSV": strings.Join(cleanCategoryIDs(params.CategoryIDs), ","),
	}

	var rows []SupplierSpendTrendPointRow
	if err := r.db.WithContext(ctx).Raw(query, queryParams).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("failed to get supplier spend trend: %w", err)
	}

	return rows, nil
}

func (r *supplierResearchRepository) listAnalytics(ctx context.Context, params SupplierResearchListParams) ([]SupplierAnalyticsRow, utils.PaginationResult, error) {
	if params.PerPage <= 0 || params.PerPage > 100 {
		params.PerPage = 20
	}
	if params.Page <= 0 {
		params.Page = 1
	}

	baseQuery, queryParams := buildSupplierAnalyticsBaseQuery(params.SupplierResearchFilterParams)

	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM (%s) base", baseQuery)
	var total int64
	if err := r.db.WithContext(ctx).Raw(countSQL, queryParams).Scan(&total).Error; err != nil {
		return nil, utils.PaginationResult{}, fmt.Errorf("failed to count supplier analytics rows: %w", err)
	}

	sortColumn := "base.total_purchase_value"
	switch params.SortBy {
	case "name":
		sortColumn = "base.supplier_name"
	case "orders":
		sortColumn = "base.total_purchase_orders"
	case "lead_time":
		sortColumn = "base.average_lead_time_days"
	case "on_time_rate":
		sortColumn = "base.supplier_on_time_rate"
	case "late_count":
		sortColumn = "base.late_delivery_count"
	case "dependency":
		sortColumn = "base.dependency_score"
	case "purchase_value":
		sortColumn = "base.total_purchase_value"
	}

	sortOrder := "DESC"
	if strings.EqualFold(params.Order, "asc") {
		sortOrder = "ASC"
	}

	offset := (params.Page - 1) * params.PerPage
	queryParams["limit"] = params.PerPage
	queryParams["offset"] = offset

	selectSQL := fmt.Sprintf(`
		SELECT
			base.supplier_id,
			base.supplier_code,
			base.supplier_name,
			base.category_name,
			base.total_purchase_value,
			base.total_purchase_orders,
			base.average_lead_time_days,
			base.supplier_on_time_rate,
			base.late_delivery_count,
			base.dependency_score
		FROM (%s) base
		ORDER BY %s %s, base.supplier_name ASC
		LIMIT @limit OFFSET @offset
	`, baseQuery, sortColumn, sortOrder)

	var rows []SupplierAnalyticsRow
	if err := r.db.WithContext(ctx).Raw(selectSQL, queryParams).Scan(&rows).Error; err != nil {
		return nil, utils.PaginationResult{}, fmt.Errorf("failed to list supplier analytics rows: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(params.PerPage)))
	if totalPages == 0 {
		totalPages = 1
	}

	pagination := utils.PaginationResult{
		Page:       params.Page,
		PerPage:    params.PerPage,
		Total:      int(total),
		TotalPages: totalPages,
	}

	return rows, pagination, nil
}

func buildSupplierAnalyticsBaseQuery(params SupplierResearchFilterParams) (string, map[string]interface{}) {
	queryParams := map[string]interface{}{
		"startDate":      params.StartDate.Format("2006-01-02"),
		"endDate":        params.EndDate.Format("2006-01-02"),
		"search":         strings.TrimSpace(params.Search),
		"searchPrefix":   strings.TrimSpace(params.Search) + "%",
		"categoryFilter": len(params.CategoryIDs) > 0,
		"categoryIDsCSV": strings.Join(cleanCategoryIDs(params.CategoryIDs), ","),
		"minFilter":      params.MinPurchaseValue > 0,
		"minValue":       params.MinPurchaseValue,
		"maxFilter":      params.MaxPurchaseValue > 0,
		"maxValue":       params.MaxPurchaseValue,
	}

	query := `
		SELECT
			s.id AS supplier_id,
			COALESCE(s.code, '') AS supplier_code,
			COALESCE(s.name, '') AS supplier_name,
			COALESCE(st.name, '') AS category_name,
			COALESCE(inv.total_purchase_value, 0) AS total_purchase_value,
			COALESCE(inv.total_purchase_orders, 0) AS total_purchase_orders,
			COALESCE(gr.average_lead_time_days, 0) AS average_lead_time_days,
			COALESCE(gr.supplier_on_time_rate, 0) AS supplier_on_time_rate,
			COALESCE(gr.late_delivery_count, 0) AS late_delivery_count,
			CASE
				WHEN COALESCE(total_all.total_purchase_value_all, 0) > 0
				THEN (COALESCE(inv.total_purchase_value, 0) / total_all.total_purchase_value_all) * 100
				ELSE 0
			END AS dependency_score
		FROM suppliers s
		LEFT JOIN supplier_types st ON st.id = s.supplier_type_id AND st.deleted_at IS NULL
		LEFT JOIN (
			SELECT
				si.supplier_id,
				COALESCE(SUM(si.amount), 0) AS total_purchase_value,
				COUNT(si.id) AS total_purchase_orders
			FROM supplier_invoices si
			WHERE si.deleted_at IS NULL
				AND si.status NOT IN ('DRAFT', 'REJECTED', 'CANCELLED')
				AND NULLIF(si.invoice_date, '')::date BETWEEN CAST(@startDate AS date) AND CAST(@endDate AS date)
			GROUP BY si.supplier_id
		) inv ON inv.supplier_id = s.id
		LEFT JOIN (
			SELECT
				gr.supplier_id,
				COALESCE(AVG(EXTRACT(EPOCH FROM (gr.receipt_date - NULLIF(po.order_date, '')::date)) / 86400), 0) AS average_lead_time_days,
				COALESCE(AVG(CASE WHEN NULLIF(po.due_date, '')::date IS NOT NULL AND gr.receipt_date::date <= NULLIF(po.due_date, '')::date THEN 100 ELSE 0 END), 0) AS supplier_on_time_rate,
				COUNT(CASE WHEN NULLIF(po.due_date, '')::date IS NOT NULL AND gr.receipt_date::date > NULLIF(po.due_date, '')::date THEN 1 END) AS late_delivery_count
			FROM goods_receipts gr
			INNER JOIN purchase_orders po ON po.id = gr.purchase_order_id AND po.deleted_at IS NULL
			WHERE gr.deleted_at IS NULL
				AND gr.status IN ('APPROVED', 'PARTIAL', 'CLOSED', 'CONFIRMED')
				AND gr.receipt_date::date BETWEEN CAST(@startDate AS date) AND CAST(@endDate AS date)
			GROUP BY gr.supplier_id
		) gr ON gr.supplier_id = s.id
		CROSS JOIN (
			SELECT COALESCE(SUM(si2.amount), 0) AS total_purchase_value_all
			FROM supplier_invoices si2
			WHERE si2.deleted_at IS NULL
				AND si2.status NOT IN ('DRAFT', 'REJECTED', 'CANCELLED')
				AND NULLIF(si2.invoice_date, '')::date BETWEEN CAST(@startDate AS date) AND CAST(@endDate AS date)
		) total_all
		WHERE s.deleted_at IS NULL
			AND s.is_active = true
			AND (@search = '' OR s.name ILIKE @searchPrefix OR s.code ILIKE @searchPrefix)
			AND (@categoryFilter = false OR COALESCE(s.supplier_type_id::text, '') = ANY(string_to_array(@categoryIDsCSV, ',')))
			AND (@minFilter = false OR COALESCE(inv.total_purchase_value, 0) >= @minValue)
			AND (@maxFilter = false OR COALESCE(inv.total_purchase_value, 0) <= @maxValue)
	`

	return query, queryParams
}

func cleanCategoryIDs(categoryIDs []string) []string {
	if len(categoryIDs) == 0 {
		return nil
	}

	cleaned := make([]string, 0, len(categoryIDs))
	for _, id := range categoryIDs {
		trimmed := strings.TrimSpace(id)
		if trimmed != "" {
			cleaned = append(cleaned, trimmed)
		}
	}

	slices.Sort(cleaned)
	return slices.Compact(cleaned)
}
