package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

// JournalLineListParams holds query parameters for listing journal lines.
type JournalLineListParams struct {
	ChartOfAccountID string
	AccountType      string
	ReferenceType    *string
	JournalStatus    string
	StartDate        *time.Time
	EndDate          *time.Time
	Search           string
	SortBy           string
	SortDir          string
	Limit            int
	Offset           int
}

// JournalLineWithEntry is a flat struct for JOIN result between journal_lines and journal_entries.
type JournalLineWithEntry struct {
	financeModels.JournalLine

	EntryDate          time.Time                   `gorm:"column:entry_date"`
	JournalDescription string                      `gorm:"column:journal_description"`
	JournalStatus      financeModels.JournalStatus `gorm:"column:journal_status"`
	ReferenceType      *string                     `gorm:"column:reference_type"`
	ReferenceID        *string                     `gorm:"column:reference_id"`
}

// JournalLineRepository defines data access for journal lines (sub-ledger view).
type JournalLineRepository interface {
	// List returns journal lines with their parent entry context, paginated and filtered.
	List(ctx context.Context, params JournalLineListParams) ([]JournalLineWithEntry, int64, error)

	// SumBeforeDate returns cumulative debit and credit for a specific COA before a given date.
	// Used for calculating the opening balance when computing running balance.
	SumBeforeDate(ctx context.Context, coaID string, beforeDate time.Time, journalStatus string) (debit float64, credit float64, err error)
}

type journalLineRepository struct {
	db *gorm.DB
}

// NewJournalLineRepository creates a new JournalLineRepository.
func NewJournalLineRepository(db *gorm.DB) JournalLineRepository {
	return &journalLineRepository{db: db}
}

var journalLineAllowedSort = map[string]string{
	"entry_date": "je.entry_date",
	"created_at": "jl.created_at",
	"debit":      "jl.debit",
	"credit":     "jl.credit",
	"coa_code":   "jl.chart_of_account_code_snapshot",
	"coa_name":   "jl.chart_of_account_name_snapshot",
}

func (r *journalLineRepository) List(ctx context.Context, params JournalLineListParams) ([]JournalLineWithEntry, int64, error) {
	baseQuery := r.db.WithContext(ctx).
		Table("journal_lines AS jl").
		Joins("JOIN journal_entries AS je ON je.id = jl.journal_entry_id AND je.deleted_at IS NULL").
		Where("jl.deleted_at IS NULL")

	// Apply scope-based data filtering
	baseQuery = security.ApplyScopeFilter(baseQuery, ctx, security.FinanceScopeQueryOptions())

	// Apply filters
	if s := strings.TrimSpace(params.Search); s != "" {
		like := s + "%"
		baseQuery = baseQuery.Where(
			"(jl.chart_of_account_code_snapshot ILIKE ? OR jl.chart_of_account_name_snapshot ILIKE ? OR jl.memo ILIKE ?)",
			like, like, "%"+s+"%",
		)
	}
	if id := strings.TrimSpace(params.ChartOfAccountID); id != "" {
		baseQuery = baseQuery.Where("jl.chart_of_account_id = ?", id)
	}
	if at := strings.TrimSpace(params.AccountType); at != "" {
		baseQuery = baseQuery.Where("jl.chart_of_account_type_snapshot = ?", at)
	}
	if params.ReferenceType != nil {
		if rt := strings.TrimSpace(*params.ReferenceType); rt != "" {
			baseQuery = baseQuery.Where("je.reference_type = ?", rt)
		}
	}
	if js := strings.TrimSpace(params.JournalStatus); js != "" {
		baseQuery = baseQuery.Where("je.status = ?", js)
	}
	if params.StartDate != nil {
		baseQuery = baseQuery.Where("je.entry_date >= ?", *params.StartDate)
	}
	if params.EndDate != nil {
		baseQuery = baseQuery.Where("je.entry_date <= ?", *params.EndDate)
	}

	// Count total
	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Sort — default is entry_date ASC for running balance correctness
	sortCol := journalLineAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = "je.entry_date"
	}
	sortDir := strings.ToLower(strings.TrimSpace(params.SortDir))
	if sortDir != "desc" {
		sortDir = "asc"
	}
	// Secondary sort by created_at for deterministic order within same entry_date
	orderClause := sortCol + " " + sortDir + ", je.created_at ASC, jl.id ASC"

	// Select fields
	selectFields := `
		jl.id, jl.journal_entry_id, jl.chart_of_account_id,
		jl.chart_of_account_code_snapshot, jl.chart_of_account_name_snapshot,
		jl.chart_of_account_type_snapshot,
		jl.debit, jl.credit, jl.memo, jl.created_at, jl.updated_at,
		je.entry_date, je.description AS journal_description,
		je.status AS journal_status, je.reference_type, je.reference_id
	`

	var items []JournalLineWithEntry
	q := baseQuery.Select(selectFields).Order(orderClause)

	if params.Limit > 0 {
		q = q.Limit(params.Limit)
	}
	if params.Offset > 0 {
		q = q.Offset(params.Offset)
	}

	if err := q.Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *journalLineRepository) SumBeforeDate(ctx context.Context, coaID string, beforeDate time.Time, journalStatus string) (float64, float64, error) {
	type result struct {
		DebitSum  float64
		CreditSum float64
	}
	var res result

	q := r.db.WithContext(ctx).
		Table("journal_lines AS jl").
		Select("COALESCE(SUM(jl.debit), 0) AS debit_sum, COALESCE(SUM(jl.credit), 0) AS credit_sum").
		Joins("JOIN journal_entries AS je ON je.id = jl.journal_entry_id AND je.deleted_at IS NULL").
		Where("jl.deleted_at IS NULL").
		Where("jl.chart_of_account_id = ?", coaID).
		Where("je.entry_date < ?", beforeDate)

	if js := strings.TrimSpace(journalStatus); js != "" {
		q = q.Where("je.status = ?", js)
	}

	if err := q.Scan(&res).Error; err != nil {
		return 0, 0, err
	}
	return res.DebitSum, res.CreditSum, nil
}
