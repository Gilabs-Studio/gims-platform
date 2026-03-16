package usecase

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/mapper"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestJournalEntry_ShouldCreatePostAndReverse_WithReversalMetadata(t *testing.T) {
	t.Parallel()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil && strings.Contains(err.Error(), "go-sqlite3 requires cgo") {
		t.Skip("sqlite integration test skipped because CGO is disabled in this environment")
	}
	require.NoError(t, err)

	err = db.AutoMigrate(
		&models.ChartOfAccount{},
		&models.JournalEntry{},
		&models.JournalLine{},
		&models.FinancialClosing{},
		&models.JournalReversal{},
	)
	require.NoError(t, err)

	coaCash := models.ChartOfAccount{Code: "11100", Name: "Cash", Type: models.AccountTypeAsset, IsActive: true}
	coaSales := models.ChartOfAccount{Code: "41000", Name: "Sales", Type: models.AccountTypeRevenue, IsActive: true}
	require.NoError(t, db.Create(&coaCash).Error)
	require.NoError(t, db.Create(&coaSales).Error)

	coaRepo := repositories.NewChartOfAccountRepository(db)
	journalRepo := repositories.NewJournalEntryRepository(db)
	journalMapper := mapper.NewJournalEntryMapper(mapper.NewChartOfAccountMapper())
	uc := NewJournalEntryUsecase(db, coaRepo, journalRepo, journalMapper)

	ctx := context.WithValue(context.Background(), "user_id", "00000000-0000-0000-0000-000000000001")
	refType := "GENERAL"
	refID := "10000000-0000-0000-0000-000000000001"
	createReq := &dto.CreateJournalEntryRequest{
		EntryDate:     "2026-01-15",
		Description:   "Manual test entry",
		ReferenceType: &refType,
		ReferenceID:   &refID,
		Lines: []dto.JournalLineRequest{
			{ChartOfAccountID: coaCash.ID, Debit: 1000, Credit: 0, Memo: "debit cash"},
			{ChartOfAccountID: coaSales.ID, Debit: 0, Credit: 1000, Memo: "credit sales"},
		},
	}

	created, err := uc.Create(ctx, createReq)
	require.NoError(t, err)

	posted, err := uc.Post(ctx, created.ID)
	require.NoError(t, err)
	require.Equal(t, models.JournalStatusPosted, posted.Status)

	reversal, err := uc.Reverse(ctx, created.ID)
	require.NoError(t, err)
	require.Equal(t, models.JournalStatusPosted, reversal.Status)

	var reversalMeta models.JournalReversal
	err = db.Where("original_journal_entry_id = ?", created.ID).First(&reversalMeta).Error
	require.NoError(t, err)
	require.Equal(t, reversal.ID, reversalMeta.ReversalJournalEntryID)
}

func TestJournalEntry_ShouldExposeSalesDomainAndTrialBalance_FromPostedSalesInvoiceJournal(t *testing.T) {
	t.Parallel()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil && strings.Contains(err.Error(), "go-sqlite3 requires cgo") {
		t.Skip("sqlite integration test skipped because CGO is disabled in this environment")
	}
	require.NoError(t, err)

	err = db.AutoMigrate(
		&models.ChartOfAccount{},
		&models.JournalEntry{},
		&models.JournalLine{},
		&models.FinancialClosing{},
	)
	require.NoError(t, err)

	coaAR := models.ChartOfAccount{Code: "11300", Name: "Trade Receivables", Type: models.AccountTypeAsset, IsActive: true}
	coaSales := models.ChartOfAccount{Code: "4100", Name: "Sales Revenue", Type: models.AccountTypeRevenue, IsActive: true}
	require.NoError(t, db.Create(&coaAR).Error)
	require.NoError(t, db.Create(&coaSales).Error)

	coaRepo := repositories.NewChartOfAccountRepository(db)
	journalRepo := repositories.NewJournalEntryRepository(db)
	journalMapper := mapper.NewJournalEntryMapper(mapper.NewChartOfAccountMapper())
	uc := NewJournalEntryUsecase(db, coaRepo, journalRepo, journalMapper)

	ctx := context.WithValue(context.Background(), "user_id", "00000000-0000-0000-0000-000000000001")
	refType := "SALES_INVOICE"
	refID := "sales-inv-001"

	_, err = uc.PostOrUpdateJournal(ctx, &dto.CreateJournalEntryRequest{
		EntryDate:     "2026-02-10",
		Description:   "Sales invoice posting",
		ReferenceType: &refType,
		ReferenceID:   &refID,
		Lines: []dto.JournalLineRequest{
			{ChartOfAccountID: coaAR.ID, Debit: 2200, Credit: 0, Memo: "AR"},
			{ChartOfAccountID: coaSales.ID, Debit: 0, Credit: 2200, Memo: "Revenue"},
		},
	})
	require.NoError(t, err)

	domain := "sales"
	entries, total, err := uc.List(ctx, &dto.ListJournalEntriesRequest{Domain: &domain, Page: 1, PerPage: 20})
	require.NoError(t, err)
	require.EqualValues(t, 1, total)
	require.Len(t, entries, 1)
	require.Equal(t, "SALES_INVOICE", *entries[0].ReferenceType)

	trial, err := uc.TrialBalance(ctx, nil, nil)
	require.NoError(t, err)
	require.NotEmpty(t, trial.Rows)

	var arFound bool
	for _, row := range trial.Rows {
		if row.Code == "11300" {
			arFound = true
			require.Equal(t, 2200.0, row.DebitTotal)
		}
	}
	require.True(t, arFound)
}

func TestJournalEntry_ShouldExposeSalesDomainAndTrialBalance_FromPostedSalesInvoiceDPJournal(t *testing.T) {
	t.Parallel()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil && strings.Contains(err.Error(), "go-sqlite3 requires cgo") {
		t.Skip("sqlite integration test skipped because CGO is disabled in this environment")
	}
	require.NoError(t, err)

	err = db.AutoMigrate(
		&models.ChartOfAccount{},
		&models.JournalEntry{},
		&models.JournalLine{},
		&models.FinancialClosing{},
	)
	require.NoError(t, err)

	coaAR := models.ChartOfAccount{Code: "11300", Name: "Trade Receivables", Type: models.AccountTypeAsset, IsActive: true}
	coaAdvance := models.ChartOfAccount{Code: "21200", Name: "Sales Advances", Type: models.AccountTypeLiability, IsActive: true}
	require.NoError(t, db.Create(&coaAR).Error)
	require.NoError(t, db.Create(&coaAdvance).Error)

	coaRepo := repositories.NewChartOfAccountRepository(db)
	journalRepo := repositories.NewJournalEntryRepository(db)
	journalMapper := mapper.NewJournalEntryMapper(mapper.NewChartOfAccountMapper())
	uc := NewJournalEntryUsecase(db, coaRepo, journalRepo, journalMapper)

	ctx := context.WithValue(context.Background(), "user_id", "00000000-0000-0000-0000-000000000001")
	refType := "SALES_INVOICE_DP"
	refID := "sales-inv-dp-001"

	_, err = uc.PostOrUpdateJournal(ctx, &dto.CreateJournalEntryRequest{
		EntryDate:     "2026-02-11",
		Description:   "Sales down payment invoice posting",
		ReferenceType: &refType,
		ReferenceID:   &refID,
		Lines: []dto.JournalLineRequest{
			{ChartOfAccountID: coaAR.ID, Debit: 900, Credit: 0, Memo: "AR DP"},
			{ChartOfAccountID: coaAdvance.ID, Debit: 0, Credit: 900, Memo: "Sales Advance"},
		},
	})
	require.NoError(t, err)

	domain := "sales"
	entries, total, err := uc.List(ctx, &dto.ListJournalEntriesRequest{Domain: &domain, Page: 1, PerPage: 20})
	require.NoError(t, err)
	require.True(t, total >= 1)

	foundDP := false
	for _, entry := range entries {
		if entry.ReferenceType != nil && *entry.ReferenceType == "SALES_INVOICE_DP" {
			foundDP = true
			break
		}
	}
	require.True(t, foundDP)

	trial, err := uc.TrialBalance(ctx, nil, nil)
	require.NoError(t, err)
	require.NotEmpty(t, trial.Rows)

	var advanceFound bool
	for _, row := range trial.Rows {
		if row.Code == "21200" {
			advanceFound = true
			require.Equal(t, 900.0, row.CreditTotal)
		}
	}
	require.True(t, advanceFound)
}

func TestJournalEntryRepository_ShouldFilterByReferenceTypes(t *testing.T) {
	t.Parallel()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil && strings.Contains(err.Error(), "go-sqlite3 requires cgo") {
		t.Skip("sqlite integration test skipped because CGO is disabled in this environment")
	}
	require.NoError(t, err)

	err = db.AutoMigrate(
		&models.JournalEntry{},
		&models.JournalLine{},
	)
	require.NoError(t, err)

	entryDate := time.Date(2026, 1, 20, 0, 0, 0, 0, time.UTC)
	entries := []models.JournalEntry{
		{EntryDate: entryDate, Description: "Sales Inv", ReferenceType: financeStrPtr("SALES_INVOICE"), ReferenceID: financeStrPtr("ref-1"), Status: models.JournalStatusPosted},
		{EntryDate: entryDate, Description: "Purchase Inv", ReferenceType: financeStrPtr("SUPPLIER_INVOICE"), ReferenceID: financeStrPtr("ref-2"), Status: models.JournalStatusPosted},
	}
	for i := range entries {
		require.NoError(t, db.Create(&entries[i]).Error)
	}

	repo := repositories.NewJournalEntryRepository(db)
	items, total, err := repo.List(context.Background(), repositories.JournalEntryListParams{
		ReferenceTypes: []string{"SALES_INVOICE", "SALES_PAYMENT"},
		Limit:          20,
		Offset:         0,
	})

	require.NoError(t, err)
	require.EqualValues(t, 1, total)
	require.Len(t, items, 1)
	require.Equal(t, "Sales Inv", items[0].Description)
}

func financeStrPtr(v string) *string {
	return &v
}
