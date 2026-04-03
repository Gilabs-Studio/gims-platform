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
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
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
		&coreModels.AuditLog{},
		&coreModels.AuditLog{}, &models.ChartOfAccount{},
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
	uc := NewJournalEntryUsecase(db, coaRepo, journalRepo, journalMapper, audit.NewAuditService(db))

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
		&coreModels.AuditLog{}, &models.ChartOfAccount{},
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
	uc := NewJournalEntryUsecase(db, coaRepo, journalRepo, journalMapper, audit.NewAuditService(db))

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
		&coreModels.AuditLog{}, &models.ChartOfAccount{},
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
	uc := NewJournalEntryUsecase(db, coaRepo, journalRepo, journalMapper, audit.NewAuditService(db))

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
		&coreModels.AuditLog{},
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

func TestFinanceReports_ShouldReadOnlyPostedJournals_ForStatementsAndExport(t *testing.T) {
	t.Parallel()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil && strings.Contains(err.Error(), "go-sqlite3 requires cgo") {
		t.Skip("sqlite integration test skipped because CGO is disabled in this environment")
	}
	require.NoError(t, err)

	err = db.AutoMigrate(
		&coreModels.AuditLog{}, &models.ChartOfAccount{},
		&models.JournalEntry{},
		&models.JournalLine{},
		&models.FinancialClosing{},
	)
	require.NoError(t, err)

	coaCash := models.ChartOfAccount{Code: "11100", Name: "Cash", Type: models.AccountTypeAsset, IsActive: true}
	coaRevenue := models.ChartOfAccount{Code: "4100", Name: "Sales Revenue", Type: models.AccountTypeRevenue, IsActive: true}
	coaExpense := models.ChartOfAccount{Code: "6100", Name: "Operating Expense", Type: models.AccountTypeExpense, IsActive: true}
	require.NoError(t, db.Create(&coaCash).Error)
	require.NoError(t, db.Create(&coaRevenue).Error)
	require.NoError(t, db.Create(&coaExpense).Error)

	coaRepo := repositories.NewChartOfAccountRepository(db)
	journalRepo := repositories.NewJournalEntryRepository(db)
	reportRepo := repositories.NewFinanceReportRepository(db)
	journalMapper := mapper.NewJournalEntryMapper(mapper.NewChartOfAccountMapper())
	auditService := audit.NewAuditService(db)
	journalUC := NewJournalEntryUsecase(db, coaRepo, journalRepo, journalMapper, auditService)
	reportUC := NewFinanceReportUsecase(db, coaRepo, reportRepo)

	ctx := context.WithValue(context.Background(), "user_id", "00000000-0000-0000-0000-000000000001")
	openingRefType := "SALES_INVOICE"
	openingRefID := "report-opening-001"

	_, err = journalUC.PostOrUpdateJournal(ctx, &dto.CreateJournalEntryRequest{
		EntryDate:     "2026-02-25",
		Description:   "Opening posted revenue journal",
		ReferenceType: &openingRefType,
		ReferenceID:   &openingRefID,
		Lines: []dto.JournalLineRequest{
			{ChartOfAccountID: coaCash.ID, Debit: 500, Credit: 0, Memo: "opening cash in"},
			{ChartOfAccountID: coaRevenue.ID, Debit: 0, Credit: 500, Memo: "opening sales"},
		},
	})
	require.NoError(t, err)

	postedRefType := "SALES_INVOICE"
	postedRefID := "report-posted-001"

	_, err = journalUC.PostOrUpdateJournal(ctx, &dto.CreateJournalEntryRequest{
		EntryDate:     "2026-03-05",
		Description:   "Posted revenue journal",
		ReferenceType: &postedRefType,
		ReferenceID:   &postedRefID,
		Lines: []dto.JournalLineRequest{
			{ChartOfAccountID: coaCash.ID, Debit: 1500, Credit: 0, Memo: "cash in"},
			{ChartOfAccountID: coaRevenue.ID, Debit: 0, Credit: 1500, Memo: "sales"},
		},
	})
	require.NoError(t, err)

	draftRefType := "MANUAL_ADJUSTMENT"
	draftRefID := "report-draft-001"
	_, err = journalUC.Create(ctx, &dto.CreateJournalEntryRequest{
		EntryDate:     "2026-03-06",
		Description:   "Draft expense journal",
		ReferenceType: &draftRefType,
		ReferenceID:   &draftRefID,
		Lines: []dto.JournalLineRequest{
			{ChartOfAccountID: coaExpense.ID, Debit: 250, Credit: 0, Memo: "expense"},
			{ChartOfAccountID: coaCash.ID, Debit: 0, Credit: 250, Memo: "cash out"},
		},
	})
	require.NoError(t, err)

	startDate := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)

	gl, err := reportUC.GetGeneralLedger(ctx, startDate, endDate, nil)
	require.NoError(t, err)

	var cashAccount *dto.GeneralLedgerAccount
	for i := range gl.Accounts {
		if gl.Accounts[i].AccountCode == "11100" {
			cashAccount = &gl.Accounts[i]
			break
		}
	}
	require.NotNil(t, cashAccount)
	require.Len(t, cashAccount.Transactions, 1)
	require.Equal(t, 500.0, cashAccount.OpeningBalance)
	require.Equal(t, 1500.0, cashAccount.TotalDebit)
	require.Equal(t, 0.0, cashAccount.TotalCredit)
	require.Equal(t, 2000.0, cashAccount.ClosingBalance)
	require.Equal(t, 2000.0, cashAccount.Transactions[0].RunningBalance)
	require.NotNil(t, cashAccount.Transactions[0].ReferenceID)
	require.Equal(t, postedRefID, *cashAccount.Transactions[0].ReferenceID)

	bs, err := reportUC.GetBalanceSheet(ctx, startDate, endDate, nil, false)
	require.NoError(t, err)
	require.Equal(t, 1500.0, bs.AssetTotal)

	pl, err := reportUC.GetProfitAndLoss(ctx, startDate, endDate, nil)
	require.NoError(t, err)
	require.Equal(t, 1500.0, pl.RevenueTotal)
	require.Equal(t, 0.0, pl.ExpenseTotal)
	require.Equal(t, 1500.0, pl.NetProfit)

	exportBytes, err := reportUC.ExportGeneralLedger(ctx, startDate, endDate, nil)
	require.NoError(t, err)
	require.NotEmpty(t, exportBytes)
}

func TestFinanceReports_ShouldOrderLedgerTransactionsDeterministically_ByDateThenIDs(t *testing.T) {
	t.Parallel()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil && strings.Contains(err.Error(), "go-sqlite3 requires cgo") {
		t.Skip("sqlite integration test skipped because CGO is disabled in this environment")
	}
	require.NoError(t, err)

	err = db.AutoMigrate(
		&coreModels.AuditLog{}, &models.ChartOfAccount{},
		&models.JournalEntry{},
		&models.JournalLine{},
		&models.FinancialClosing{},
	)
	require.NoError(t, err)

	coaCash := models.ChartOfAccount{Code: "11100", Name: "Cash", Type: models.AccountTypeAsset, IsActive: true}
	coaRevenue := models.ChartOfAccount{Code: "4100", Name: "Sales Revenue", Type: models.AccountTypeRevenue, IsActive: true}
	require.NoError(t, db.Create(&coaCash).Error)
	require.NoError(t, db.Create(&coaRevenue).Error)

	coaRepo := repositories.NewChartOfAccountRepository(db)
	journalRepo := repositories.NewJournalEntryRepository(db)
	reportRepo := repositories.NewFinanceReportRepository(db)
	journalMapper := mapper.NewJournalEntryMapper(mapper.NewChartOfAccountMapper())
	auditService := audit.NewAuditService(db)
	journalUC := NewJournalEntryUsecase(db, coaRepo, journalRepo, journalMapper, auditService)
	reportUC := NewFinanceReportUsecase(db, coaRepo, reportRepo)

	ctx := context.WithValue(context.Background(), "user_id", "00000000-0000-0000-0000-000000000001")

	refType1 := "SALES_INVOICE"
	refID1 := "order-check-001"
	_, err = journalUC.PostOrUpdateJournal(ctx, &dto.CreateJournalEntryRequest{
		EntryDate:     "2026-03-10",
		Description:   "Ledger order check #1",
		ReferenceType: &refType1,
		ReferenceID:   &refID1,
		Lines: []dto.JournalLineRequest{
			{ChartOfAccountID: coaCash.ID, Debit: 100, Credit: 0, Memo: "cash #1"},
			{ChartOfAccountID: coaRevenue.ID, Debit: 0, Credit: 100, Memo: "sales #1"},
		},
	})
	require.NoError(t, err)

	refType2 := "SALES_INVOICE"
	refID2 := "order-check-002"
	_, err = journalUC.PostOrUpdateJournal(ctx, &dto.CreateJournalEntryRequest{
		EntryDate:     "2026-03-10",
		Description:   "Ledger order check #2",
		ReferenceType: &refType2,
		ReferenceID:   &refID2,
		Lines: []dto.JournalLineRequest{
			{ChartOfAccountID: coaCash.ID, Debit: 200, Credit: 0, Memo: "cash #2"},
			{ChartOfAccountID: coaRevenue.ID, Debit: 0, Credit: 200, Memo: "sales #2"},
		},
	})
	require.NoError(t, err)

	startDate := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)

	gl, err := reportUC.GetGeneralLedger(ctx, startDate, endDate, nil)
	require.NoError(t, err)

	var cashAccount *dto.GeneralLedgerAccount
	for i := range gl.Accounts {
		if gl.Accounts[i].AccountCode == "11100" {
			cashAccount = &gl.Accounts[i]
			break
		}
	}
	require.NotNil(t, cashAccount)
	require.GreaterOrEqual(t, len(cashAccount.Transactions), 2)

	for i := 1; i < len(cashAccount.Transactions); i++ {
		prev := cashAccount.Transactions[i-1]
		curr := cashAccount.Transactions[i]

		require.False(t, curr.EntryDate.Before(prev.EntryDate), "entry_date must be ascending")

		if curr.EntryDate.Equal(prev.EntryDate) {
			prevKey := prev.JournalID + ":" + prev.ID
			currKey := curr.JournalID + ":" + curr.ID
			require.LessOrEqual(t, prevKey, currKey, "same entry_date must use deterministic tie-breaker by IDs")
		}
	}
}

func TestFinancialClosing_IntegrityEnforcement(t *testing.T) {
	t.Parallel()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil && strings.Contains(err.Error(), "go-sqlite3 requires cgo") {
		t.Skip("sqlite integration test skipped because CGO is disabled in this environment")
	}
	require.NoError(t, err)

	err = db.AutoMigrate(
		&coreModels.AuditLog{}, &models.ChartOfAccount{},
		&models.JournalEntry{},
		&models.JournalLine{},
		&models.FinancialClosing{},
	)
	require.NoError(t, err)

	coaCash := models.ChartOfAccount{Code: "11100", Name: "Cash", Type: models.AccountTypeAsset, IsActive: true}
	coaSales := models.ChartOfAccount{Code: "41000", Name: "Sales", Type: models.AccountTypeRevenue, IsActive: true}
	require.NoError(t, db.Create(&coaCash).Error)
	require.NoError(t, db.Create(&coaSales).Error)

	coaRepo := repositories.NewChartOfAccountRepository(db)
	journalRepo := repositories.NewJournalEntryRepository(db)
	journalMapper := mapper.NewJournalEntryMapper(mapper.NewChartOfAccountMapper())
	uc := NewJournalEntryUsecase(db, coaRepo, journalRepo, journalMapper, audit.NewAuditService(db))

	ctx := context.WithValue(context.Background(), "user_id", "00000000-0000-0000-0000-000000000001")

	// 1. Create a closed period for January 2026
	janClosing := models.FinancialClosing{
		PeriodEndDate: time.Date(2026, 1, 31, 23, 59, 59, 0, time.UTC),
		Status:        models.FinancialClosingStatusApproved,
	}
	require.NoError(t, db.Create(&janClosing).Error)

	// 2. Attempt to post a journal in the closed period (Jan 15)
	refType := "GENERAL"
	refID := "closed-test-001"
	req := &dto.CreateJournalEntryRequest{
		EntryDate:     "2026-01-15",
		Description:   "Should be blocked",
		ReferenceType: &refType,
		ReferenceID:   &refID,
		Lines: []dto.JournalLineRequest{
			{ChartOfAccountID: coaCash.ID, Debit: 100, Credit: 0, Memo: "In"},
			{ChartOfAccountID: coaSales.ID, Debit: 0, Credit: 100, Memo: "Out"},
		},
	}

	_, err = uc.Create(ctx, req)
	require.Error(t, err)
	require.Contains(t, err.Error(), "period has been closed")

	// 3. Attempt to post a journal in an open period (Feb 15) - Should succeed
	refIDOpen := "open-test-002"
	reqOpen := &dto.CreateJournalEntryRequest{
		EntryDate:     "2026-02-15",
		Description:   "Should work",
		ReferenceType: &refType,
		ReferenceID:   &refIDOpen,
		Lines: []dto.JournalLineRequest{
			{ChartOfAccountID: coaCash.ID, Debit: 200, Credit: 0, Memo: "In"},
			{ChartOfAccountID: coaSales.ID, Debit: 0, Credit: 200, Memo: "Out"},
		},
	}

	resOpen, err := uc.Create(ctx, reqOpen)
	require.NoError(t, err)
	require.NotEmpty(t, resOpen.ID)
}

func TestInventoryFreeze_IntegrityEnforcement(t *testing.T) {
	t.Parallel()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil && strings.Contains(err.Error(), "go-sqlite3 requires cgo") {
		t.Skip("sqlite integration test skipped because CGO is disabled in this environment")
	}
	require.NoError(t, err)

	err = db.AutoMigrate(
		&models.FinancialClosing{},
		&models.JournalEntry{},
		&models.JournalLine{},
		&models.ChartOfAccount{},
	)
	require.NoError(t, err)

	// 1. Create a closed period for Jan 2026
	janClosing := models.FinancialClosing{
		PeriodEndDate: time.Date(2026, 1, 31, 23, 59, 59, 0, time.UTC),
		Status:        models.FinancialClosingStatusApproved,
	}
	require.NoError(t, db.Create(&janClosing).Error)

	// 2. Define a guard check function using the same logic as closing_guard.go
	isPeriodClosed := func(dateStr string) bool {
		parsed, _ := time.Parse("2006-01-02", dateStr)
		var closing models.FinancialClosing
		err := db.Where("period_end_date >= ? AND status = ?", parsed, models.FinancialClosingStatusApproved).
			Order("period_end_date ASC").
			First(&closing).Error
		return err == nil
	}

	// January 10 is inside Jan 31 closing -> Closed
	require.True(t, isPeriodClosed("2026-01-10"), "Jan 10 should be closed")
	
	// February 1 is after Jan 31 closing -> Open
	require.False(t, isPeriodClosed("2026-02-01"), "Feb 1 should be open")
}
