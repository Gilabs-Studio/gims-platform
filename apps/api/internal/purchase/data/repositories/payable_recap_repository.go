package repositories

import (
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

// PayableRecapRow is a single row of the recap query.
type PayableRecapRow struct {
	SupplierID        string    `json:"supplier_id"`
	SupplierName      string    `json:"supplier_name"`
	TotalPayable      float64   `json:"total_payable"`
	DownPayment       float64   `json:"down_payment"`
	PaidAmount        float64   `json:"paid_amount"`
	OutstandingAmount float64   `json:"outstanding_amount"`
	LastTransaction   time.Time `json:"last_transaction"`
	AgingDays         int       `json:"aging_days"`
	AgingCategory     string    `json:"aging_category"`
}

// PayableSummary holds aggregate totals and bucket counts.
type PayableSummary struct {
	TotalSuppliers    int     `json:"total_suppliers"`
	TotalPayable      float64 `json:"total_payable"`
	TotalPaid         float64 `json:"total_paid"`
	TotalOutstanding  float64 `json:"total_outstanding"`
	CurrentCount      int     `json:"current_count"`
	Overdue1_30Count  int     `json:"overdue_1_30_count"`
	Overdue31_60Count int     `json:"overdue_31_60_count"`
	Overdue61_90Count int     `json:"overdue_61_90_count"`
	BadDebtCount      int     `json:"bad_debt_count"`
}

type PayableRecapListParams struct {
	Search  string
	SortBy  string
	SortDir string
	Limit   int
	Offset  int
}

type PayableRecapRepository struct {
	db *gorm.DB
}

func NewPayableRecapRepository(db *gorm.DB) *PayableRecapRepository {
	return &PayableRecapRepository{db: db}
}

// baseCTE is the core CTE used by all methods.
const baseCTE = `
WITH supplier_payables AS (
    SELECT 
        s.id                              AS supplier_id,
        s.name                            AS supplier_name,
        COALESCE(SUM(DISTINCT si.amount), 0)       AS total_payable,
        COALESCE(SUM(DISTINCT CASE WHEN si.type = 'DOWN_PAYMENT' THEN si.amount ELSE NULL END), 0) AS down_payment,
        COALESCE(SUM(CASE WHEN pp.status = 'CONFIRMED' THEN pp.amount ELSE 0 END), 0)
                                           AS paid_amount,
        COALESCE(SUM(DISTINCT si.amount), 0) -
            COALESCE(SUM(CASE WHEN pp.status = 'CONFIRMED' THEN pp.amount ELSE 0 END), 0)
                                           AS outstanding_amount,
        GREATEST(
            COALESCE(MAX(si.created_at), '1970-01-01'::timestamp),
            COALESCE(MAX(pp.payment_date::timestamp), '1970-01-01'::timestamp)
        ) AS last_transaction,
        COALESCE(
            CASE
                WHEN MIN(
                    CASE WHEN si.status IN ('SUBMITTED','APPROVED','UNPAID','WAITING_PAYMENT','PARTIAL')
                         AND si.due_date IS NOT NULL
                    THEN si.due_date END
                ) IS NOT NULL
                THEN CURRENT_DATE - MIN(
                    CASE WHEN si.status IN ('SUBMITTED','APPROVED','UNPAID','WAITING_PAYMENT','PARTIAL')
                         AND si.due_date IS NOT NULL
                    THEN si.due_date::date END
                )
                ELSE 0
            END,
        0) AS aging_days
    FROM suppliers s
    LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.deleted_at IS NULL
    LEFT JOIN supplier_invoices si ON po.id = si.purchase_order_id
        AND si.status NOT IN ('DRAFT','CANCELLED','REJECTED')
        AND si.deleted_at IS NULL
    LEFT JOIN purchase_payments pp ON si.id = pp.supplier_invoice_id
        AND pp.deleted_at IS NULL
    WHERE s.deleted_at IS NULL
    GROUP BY s.id, s.name
    HAVING COALESCE(SUM(DISTINCT si.amount), 0) > 0
)
SELECT
    supplier_id,
    supplier_name,
    total_payable,
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
FROM supplier_payables`

// allowedSortCols guards against SQL injection in ORDER BY.
var allowedSortCols = map[string]bool{
	"supplier_name":      true,
	"total_payable":      true,
	"down_payment":       true,
	"paid_amount":        true,
	"outstanding_amount": true,
	"aging_days":         true,
	"last_transaction":   true,
}

func (r *PayableRecapRepository) FindAll(params PayableRecapListParams) ([]PayableRecapRow, int64, error) {
	where := ""
	var args []interface{}

	if strings.TrimSpace(params.Search) != "" {
		where = " WHERE supplier_name ILIKE $1"
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

	var rows []PayableRecapRow
	if err := r.db.Raw(finalQ, args...).Scan(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *PayableRecapRepository) GetSummary() (*PayableSummary, error) {
	summaryQ := fmt.Sprintf(`
		SELECT
			COUNT(*)                                                           AS total_suppliers,
			COALESCE(SUM(total_payable), 0)                                    AS total_payable,
			COALESCE(SUM(paid_amount), 0)                                      AS total_paid,
			COALESCE(SUM(outstanding_amount), 0)                               AS total_outstanding,
			COUNT(*) FILTER (WHERE aging_days <= 30 AND outstanding_amount > 0)  AS current_count,
			COUNT(*) FILTER (WHERE aging_days BETWEEN 31 AND 60 AND outstanding_amount > 0) AS overdue_1_30_count,
			COUNT(*) FILTER (WHERE aging_days BETWEEN 61 AND 90 AND outstanding_amount > 0) AS overdue_31_60_count,
			COUNT(*) FILTER (WHERE aging_days BETWEEN 91 AND 120 AND outstanding_amount > 0) AS overdue_61_90_count,
			COUNT(*) FILTER (WHERE aging_days > 120 AND outstanding_amount > 0) AS bad_debt_count
		FROM (%s) AS recap
	`, baseCTE)

	var s PayableSummary
	if err := r.db.Raw(summaryQ).Scan(&s).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *PayableRecapRepository) FindAllForExport(params PayableRecapListParams) ([]PayableRecapRow, error) {
	where := ""
	var args []interface{}

	if strings.TrimSpace(params.Search) != "" {
		where = " WHERE supplier_name ILIKE $1"
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

	var rows []PayableRecapRow
	if err := r.db.Raw(finalQ, args...).Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}
