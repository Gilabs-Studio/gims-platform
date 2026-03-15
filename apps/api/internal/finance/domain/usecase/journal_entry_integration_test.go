package usecase

import (
	"context"
	"strings"
	"testing"

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
