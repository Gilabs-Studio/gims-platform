package repositories

import (
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

// ReceivablesRecapRow is a single row of the recap query.
type ReceivablesRecapRow struct {
	CustomerID        string    `json:"customer_id"`
	CustomerName      string    `json:"customer_name"`
	TotalReceivable   float64   `json:"total_receivable"`
	ReturnAmount      float64   `json:"return_amount"`
	DownPayment       float64   `json:"down_payment"`
	PaidAmount        float64   `json:"paid_amount"`
	OutstandingAmount float64   `json:"outstanding_amount"`
	LastTransaction   time.Time `json:"last_transaction"`
	AgingDays         int       `json:"aging_days"`
	AgingCategory     string    `json:"aging_category"`
}

// ReceivablesSummary holds aggregate totals and bucket counts.
type ReceivablesSummary struct {
	TotalCustomers    int     `json:"total_customers"`
	TotalReceivable   float64 `json:"total_receivable"`
	TotalReturn       float64 `json:"total_return"`
	TotalPaid         float64 `json:"total_paid"`
	TotalOutstanding  float64 `json:"total_outstanding"`
	CurrentCount      int     `json:"current_count"`
	Overdue1_30Count  int     `json:"overdue_1_30_count"`
	Overdue31_60Count int     `json:"overdue_31_60_count"`
	Overdue61_90Count int     `json:"overdue_61_90_count"`
	BadDebtCount      int     `json:"bad_debt_count"`
}

type ReceivablesRecapListParams struct {
	Search  string
	SortBy  string
	SortDir string
	Limit   int
	Offset  int
}

type ReceivablesRecapRepository struct {
	db *gorm.DB
}

func NewReceivablesRecapRepository(db *gorm.DB) *ReceivablesRecapRepository {
	return &ReceivablesRecapRepository{db: db}
}

// baseCTE is the core CTE used by all methods.
// It adapts to our schema: sales_payments.customer_invoice_id / sales_payments.status
const baseCTE = `
WITH return_totals AS (
	SELECT
		sr.customer_id AS customer_id,
		COALESCE(SUM(sr.total_amount), 0) AS total_return,
		MAX(sr.created_at) AS last_return_at
	FROM sales_returns sr
	WHERE sr.deleted_at IS NULL
	  AND sr.status IN ('SUBMITTED', 'PROCESSED', 'COMPLETED')
	GROUP BY sr.customer_id
),
customer_receivables AS (
    SELECT 
        c.id                              AS customer_id,
        c.name                            AS customer_name,
        COALESCE(SUM(DISTINCT ci.amount), 0)       AS total_receivable,
		COALESCE(rt.total_return, 0)      AS return_amount,
        COALESCE(SUM(DISTINCT CASE WHEN ci.type = 'down_payment' THEN ci.amount ELSE NULL END), 0) AS down_payment,
        COALESCE(SUM(CASE WHEN sp.status = 'CONFIRMED' THEN sp.amount ELSE 0 END), 0)
                                           AS paid_amount,
        COALESCE(SUM(DISTINCT ci.amount), 0) -
			COALESCE(rt.total_return, 0) -
            COALESCE(SUM(CASE WHEN sp.status = 'CONFIRMED' THEN sp.amount ELSE 0 END), 0)
                                           AS outstanding_amount,
        GREATEST(
            COALESCE(MAX(ci.created_at), '1970-01-01'::timestamp),
			COALESCE(MAX(sp.payment_date::timestamp), '1970-01-01'::timestamp),
			COALESCE(MAX(rt.last_return_at), '1970-01-01'::timestamp)
        ) AS last_transaction,
        COALESCE(
            CASE
                WHEN MIN(
                    CASE WHEN ci.status IN ('PENDING','PARTIAL','OVERDUE')
                         AND ci.due_date IS NOT NULL
                    THEN ci.due_date END
                ) IS NOT NULL
                THEN CURRENT_DATE - MIN(
                    CASE WHEN ci.status IN ('PENDING','PARTIAL','OVERDUE')
                         AND ci.due_date IS NOT NULL
                    THEN ci.due_date::date END
                )
                ELSE 0
            END,
        0) AS aging_days
    FROM customers c
    LEFT JOIN sales_orders so ON c.id = so.customer_id AND so.deleted_at IS NULL
    LEFT JOIN customer_invoices ci ON so.id = ci.sales_order_id
        AND ci.status NOT IN ('DRAFT','NOT_CREATED')
        AND ci.deleted_at IS NULL
    LEFT JOIN sales_payments sp ON ci.id = sp.customer_invoice_id
        AND sp.deleted_at IS NULL
	LEFT JOIN return_totals rt ON c.id = rt.customer_id
    WHERE c.deleted_at IS NULL
	GROUP BY c.id, c.name, rt.total_return
	HAVING COALESCE(SUM(DISTINCT ci.amount), 0) > 0 OR COALESCE(rt.total_return, 0) > 0
)
SELECT
    customer_id,
    customer_name,
    total_receivable,
	return_amount,
    down_payment,
    paid_amount,
    outstanding_amount,
    last_transaction,
    aging_days,
    CASE
        WHEN outstanding_amount <= 0     THEN 'Paid'
        WHEN aging_days <= 30            THEN 'Current'
        WHEN aging_days <= 60            THEN 'Overdue 1-30'
        WHEN aging_days <= 90            THEN 'Overdue 31-60'
        WHEN aging_days <= 120           THEN 'Overdue 61-90'
        ELSE 'Bad Debt (>90)'
    END AS aging_category
FROM customer_receivables`

// allowedSortCols guards against SQL injection in ORDER BY.
var allowedSortCols = map[string]bool{
	"customer_name":      true,
	"total_receivable":   true,
	"return_amount":      true,
	"down_payment":       true,
	"paid_amount":        true,
	"outstanding_amount": true,
	"aging_days":         true,
	"last_transaction":   true,
}

func (r *ReceivablesRecapRepository) FindAll(params ReceivablesRecapListParams) ([]ReceivablesRecapRow, int64, error) {
	where := ""
	var args []interface{}

	if strings.TrimSpace(params.Search) != "" {
		where = " WHERE customer_name ILIKE $1"
		args = append(args, "%"+params.Search+"%")
	}

	// Count
	countQ := fmt.Sprintf("SELECT COUNT(*) FROM (%s%s) AS cnt", baseCTE, where)
	var total int64
	if err := r.db.Raw(countQ, args...).Scan(&total).Error; err != nil {
		return nil, 0, err
	}

	// Sort
	orderBy := " ORDER BY outstanding_amount DESC, aging_days DESC"
	if params.SortBy != "" && allowedSortCols[params.SortBy] {
		dir := "ASC"
		if strings.EqualFold(params.SortDir, "desc") {
			dir = "DESC"
		}
		orderBy = fmt.Sprintf(" ORDER BY %s %s", params.SortBy, dir)
	}

	finalQ := fmt.Sprintf("%s%s%s LIMIT %d OFFSET %d", baseCTE, where, orderBy, params.Limit, params.Offset)

	var rows []ReceivablesRecapRow
	if err := r.db.Raw(finalQ, args...).Scan(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *ReceivablesRecapRepository) GetSummary() (*ReceivablesSummary, error) {
	summaryQ := fmt.Sprintf(`
		SELECT
			COUNT(*)                                                           AS total_customers,
			COALESCE(SUM(total_receivable), 0)                                 AS total_receivable,
			COALESCE(SUM(return_amount), 0)                                    AS total_return,
			COALESCE(SUM(paid_amount), 0)                                      AS total_paid,
			COALESCE(SUM(outstanding_amount), 0)                               AS total_outstanding,
			COUNT(*) FILTER (WHERE aging_days <= 30 AND outstanding_amount > 0)  AS current_count,
			COUNT(*) FILTER (WHERE aging_days BETWEEN 31 AND 60 AND outstanding_amount > 0) AS overdue_1_30_count,
			COUNT(*) FILTER (WHERE aging_days BETWEEN 61 AND 90 AND outstanding_amount > 0) AS overdue_31_60_count,
			COUNT(*) FILTER (WHERE aging_days BETWEEN 91 AND 120 AND outstanding_amount > 0) AS overdue_61_90_count,
			COUNT(*) FILTER (WHERE aging_days > 120 AND outstanding_amount > 0) AS bad_debt_count
		FROM (%s) AS recap
	`, baseCTE)

	var s ReceivablesSummary
	if err := r.db.Raw(summaryQ).Scan(&s).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ReceivablesRecapRepository) FindAllForExport(params ReceivablesRecapListParams) ([]ReceivablesRecapRow, error) {
	where := ""
	var args []interface{}

	if strings.TrimSpace(params.Search) != "" {
		where = " WHERE customer_name ILIKE $1"
		args = append(args, "%"+params.Search+"%")
	}

	orderBy := " ORDER BY outstanding_amount DESC, aging_days DESC"
	if params.SortBy != "" && allowedSortCols[params.SortBy] {
		dir := "ASC"
		if strings.EqualFold(params.SortDir, "desc") {
			dir = "DESC"
		}
		orderBy = fmt.Sprintf(" ORDER BY %s %s", params.SortBy, dir)
	}

	limit := params.Limit
	if limit <= 0 || limit > 10000 {
		limit = 10000
	}
	finalQ := fmt.Sprintf("%s%s%s LIMIT %d", baseCTE, where, orderBy, limit)

	var rows []ReceivablesRecapRow
	if err := r.db.Raw(finalQ, args...).Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}
