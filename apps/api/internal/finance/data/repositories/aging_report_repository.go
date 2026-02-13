package repositories

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"gorm.io/gorm"
)

type ARAgingRow struct {
	InvoiceID       string
	Code            string
	InvoiceNumber   *string
	InvoiceDate     time.Time
	DueDate         time.Time
	Amount          float64
	RemainingAmount float64
}

type APAgingRow struct {
	InvoiceID       string
	Code            string
	InvoiceNumber   string
	InvoiceDate     time.Time
	DueDate         time.Time
	SupplierID      string
	SupplierName    string
	Amount          float64
	PaidAmount      float64
	RemainingAmount float64
}

type AgingListParams struct {
	Search   string
	AsOfDate time.Time
	Limit    int
	Offset   int
}

type AgingReportRepository interface {
	ListARAging(ctx context.Context, params AgingListParams) ([]ARAgingRow, int64, error)
	ListAPAging(ctx context.Context, params AgingListParams) ([]APAgingRow, int64, error)
}

type agingReportRepository struct {
	db *gorm.DB
}

func NewAgingReportRepository(db *gorm.DB) AgingReportRepository {
	return &agingReportRepository{db: db}
}

func (r *agingReportRepository) ListARAging(ctx context.Context, params AgingListParams) ([]ARAgingRow, int64, error) {
	var rows []ARAgingRow
	var total int64

	asOf := params.AsOfDate.Format("2006-01-02")
	search := strings.TrimSpace(params.Search)

	base := r.db.WithContext(ctx).Table("customer_invoices ci").
		Select("ci.id as invoice_id, ci.code, ci.invoice_number, ci.invoice_date, COALESCE(ci.due_date, ci.invoice_date) as due_date, ci.amount, ci.remaining_amount").
		Where("ci.deleted_at IS NULL").
		Where("ci.status IN ?", []string{"unpaid", "partial"}).
		Where("ci.remaining_amount > 0").
		Where("ci.invoice_date <= ?::date", asOf)

	if search != "" {
		like := "%" + search + "%"
		base = base.Where("ci.code ILIKE ? OR ci.invoice_number ILIKE ?", like, like)
	}

	countQ := base.Session(&gorm.Session{NewDB: true})
	if err := countQ.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	q := base.Order("ci.invoice_date desc")
	if params.Limit > 0 {
		q = q.Limit(params.Limit)
	}
	if params.Offset > 0 {
		q = q.Offset(params.Offset)
	}

	if err := q.Scan(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

type apAgingScanRow struct {
	InvoiceID     string          `gorm:"column:invoice_id"`
	Code          string          `gorm:"column:code"`
	InvoiceNumber string          `gorm:"column:invoice_number"`
	InvoiceDate   sql.NullString  `gorm:"column:invoice_date"`
	DueDate       sql.NullString  `gorm:"column:due_date"`
	SupplierID    string          `gorm:"column:supplier_id"`
	SupplierName  string          `gorm:"column:supplier_name"`
	Amount        float64         `gorm:"column:amount"`
	PaidAmount    float64         `gorm:"column:paid_amount"`
	Remaining     float64         `gorm:"column:remaining_amount"`
}

func (r *agingReportRepository) ListAPAging(ctx context.Context, params AgingListParams) ([]APAgingRow, int64, error) {
	var total int64
	var scanRows []apAgingScanRow

	asOf := params.AsOfDate.Format("2006-01-02")
	search := strings.TrimSpace(params.Search)

	// SupplierInvoice invoice_date and due_date are stored as varchar in this codebase.
	// We still filter by as_of_date using to_date; invalid formats will be excluded by the condition.
	countSQL := `
		SELECT COUNT(*)
		FROM (
			SELECT si.id
			FROM supplier_invoices si
			LEFT JOIN purchase_payments pp
				ON pp.invoice_id = si.id
				AND pp.status = 'CONFIRMED'
				AND pp.deleted_at IS NULL
			WHERE si.deleted_at IS NULL
				AND si.status IN ('UNPAID','PARTIAL')
				AND to_date(si.invoice_date, 'YYYY-MM-DD') <= to_date(?, 'YYYY-MM-DD')
				AND (
					? = ''
					OR si.code ILIKE ?
					OR si.invoice_number ILIKE ?
				)
			GROUP BY si.id, si.code, si.invoice_number, si.invoice_date, si.due_date, si.supplier_id, si.amount
			HAVING GREATEST(si.amount - COALESCE(SUM(pp.amount), 0), 0) > 0
		) x
	`
	like := "%" + search + "%"
	if err := r.db.WithContext(ctx).Raw(countSQL, asOf, search, like, like).Scan(&total).Error; err != nil {
		return nil, 0, err
	}

	listSQL := `
		SELECT
			si.id as invoice_id,
			si.code,
			si.invoice_number,
			si.invoice_date,
			si.due_date,
			si.supplier_id,
			COALESCE(s.name, '') as supplier_name,
			si.amount,
			COALESCE(SUM(pp.amount), 0) as paid_amount,
			GREATEST(si.amount - COALESCE(SUM(pp.amount), 0), 0) as remaining_amount
		FROM supplier_invoices si
		LEFT JOIN suppliers s ON s.id = si.supplier_id AND s.deleted_at IS NULL
		LEFT JOIN purchase_payments pp
			ON pp.invoice_id = si.id
			AND pp.status = 'CONFIRMED'
			AND pp.deleted_at IS NULL
		WHERE si.deleted_at IS NULL
			AND si.status IN ('UNPAID','PARTIAL')
			AND to_date(si.invoice_date, 'YYYY-MM-DD') <= to_date(?, 'YYYY-MM-DD')
			AND (
				? = ''
				OR si.code ILIKE ?
				OR si.invoice_number ILIKE ?
				OR s.name ILIKE ?
			)
		GROUP BY si.id, si.code, si.invoice_number, si.invoice_date, si.due_date, si.supplier_id, s.name, si.amount
		HAVING GREATEST(si.amount - COALESCE(SUM(pp.amount), 0), 0) > 0
		ORDER BY to_date(si.invoice_date, 'YYYY-MM-DD') DESC
		LIMIT ? OFFSET ?
	`
	if params.Limit <= 0 {
		params.Limit = 10
	}
	if params.Offset < 0 {
		params.Offset = 0
	}
	if err := r.db.WithContext(ctx).Raw(listSQL, asOf, search, like, like, like, params.Limit, params.Offset).Scan(&scanRows).Error; err != nil {
		return nil, 0, err
	}

	rows := make([]APAgingRow, 0, len(scanRows))
	for _, sr := range scanRows {
		invDate, err := time.Parse("2006-01-02", strings.TrimSpace(sr.InvoiceDate.String))
		if err != nil {
			continue
		}
		dueDateStr := strings.TrimSpace(sr.DueDate.String)
		if dueDateStr == "" {
			dueDateStr = strings.TrimSpace(sr.InvoiceDate.String)
		}
		dueDate, err := time.Parse("2006-01-02", dueDateStr)
		if err != nil {
			continue
		}
		rows = append(rows, APAgingRow{
			InvoiceID:       sr.InvoiceID,
			Code:            sr.Code,
			InvoiceNumber:   sr.InvoiceNumber,
			InvoiceDate:     invDate,
			DueDate:         dueDate,
			SupplierID:      sr.SupplierID,
			SupplierName:    sr.SupplierName,
			Amount:          sr.Amount,
			PaidAmount:      sr.PaidAmount,
			RemainingAmount: sr.Remaining,
		})
	}

	return rows, total, nil
}
