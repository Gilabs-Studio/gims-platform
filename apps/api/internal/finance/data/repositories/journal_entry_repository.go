package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type JournalEntryListParams struct {
	Search    string
	Status    *financeModels.JournalStatus
	StartDate *time.Time
	EndDate   *time.Time
	SortBy    string
	SortDir   string
	Limit     int
	Offset    int
}

type JournalEntryRepository interface {
	FindByID(ctx context.Context, id string, withLines bool) (*financeModels.JournalEntry, error)
	List(ctx context.Context, params JournalEntryListParams) ([]financeModels.JournalEntry, int64, error)
}

type journalEntryRepository struct {
	db *gorm.DB
}

func NewJournalEntryRepository(db *gorm.DB) JournalEntryRepository {
	return &journalEntryRepository{db: db}
}

func (r *journalEntryRepository) FindByID(ctx context.Context, id string, withLines bool) (*financeModels.JournalEntry, error) {
	var item financeModels.JournalEntry
	q := r.db.WithContext(ctx)
	if withLines {
		q = q.Preload("Lines").Preload("Lines.ChartOfAccount")
	}
	if err := q.First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

var journalAllowedSort = map[string]string{
	"created_at": "journal_entries.created_at",
	"updated_at": "journal_entries.updated_at",
	"entry_date": "journal_entries.entry_date",
	"status":     "journal_entries.status",
}

func (r *journalEntryRepository) List(ctx context.Context, params JournalEntryListParams) ([]financeModels.JournalEntry, int64, error) {
	var items []financeModels.JournalEntry
	var total int64

	q := r.db.WithContext(ctx).Model(&financeModels.JournalEntry{}).Preload("Lines")

	// Apply scope-based data filtering (OWN/DIVISION/AREA/ALL)
	q = security.ApplyScopeFilter(q, ctx, security.FinanceScopeQueryOptions())

	if s := strings.TrimSpace(params.Search); s != "" {
		like := "%" + s + "%"
		q = q.Where("journal_entries.description ILIKE ?", like)
	}
	if params.Status != nil {
		q = q.Where("journal_entries.status = ?", *params.Status)
	}
	if params.StartDate != nil {
		q = q.Where("journal_entries.entry_date >= ?", *params.StartDate)
	}
	if params.EndDate != nil {
		q = q.Where("journal_entries.entry_date <= ?", *params.EndDate)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := journalAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = journalAllowedSort["entry_date"]
	}
	sortDir := strings.ToLower(strings.TrimSpace(params.SortDir))
	if sortDir != "asc" {
		sortDir = "desc"
	}
	q = q.Order(sortCol + " " + sortDir)

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
