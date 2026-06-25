package usecase

import (
	"context"
	"strings"
	"testing"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	financeRepositories "github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type fiscalYearRepoStub struct {
	item *financeModels.FiscalYear
}

func (s fiscalYearRepoStub) Create(ctx context.Context, item *financeModels.FiscalYear) error {
	return nil
}

func (s fiscalYearRepoStub) Update(ctx context.Context, item *financeModels.FiscalYear) error {
	return nil
}

func (s fiscalYearRepoStub) Delete(ctx context.Context, id string) error {
	return nil
}

func (s fiscalYearRepoStub) FindByID(ctx context.Context, id string) (*financeModels.FiscalYear, error) {
	return s.item, nil
}

func (s fiscalYearRepoStub) List(ctx context.Context, params financeRepositories.FiscalYearListParams) ([]financeModels.FiscalYear, int64, error) {
	if s.item == nil {
		return nil, 0, nil
	}
	return []financeModels.FiscalYear{*s.item}, 1, nil
}

func (s fiscalYearRepoStub) FindActiveByCompany(ctx context.Context, companyID string) (*financeModels.FiscalYear, error) {
	if s.item == nil {
		return nil, gorm.ErrRecordNotFound
	}
	return s.item, nil
}

func (s fiscalYearRepoStub) HasPostedJournalInRange(ctx context.Context, companyID string, startDate, endDate time.Time) (bool, error) {
	return false, nil
}

func (s fiscalYearRepoStub) GetDB(ctx context.Context) *gorm.DB {
	return nil
}

func TestPurchaseFiscalYearResolverResolveCompanyIDFallsBackToTenantCompany(t *testing.T) {
	t.Parallel()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		if strings.Contains(err.Error(), "go-sqlite3 requires cgo") {
			t.Skip("sqlite integration test skipped because CGO is disabled")
		}
		require.NoError(t, err)
	}

	require.NoError(t, db.Exec(`CREATE TABLE employees (
		id TEXT PRIMARY KEY,
		tenant_id TEXT,
		user_id TEXT,
		company_id TEXT,
		deleted_at DATETIME
	);`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE companies (
		id TEXT PRIMARY KEY,
		tenant_id TEXT,
		name TEXT,
		created_at DATETIME,
		deleted_at DATETIME
	);`).Error)

	require.NoError(t, db.Exec(
		`INSERT INTO employees (id, tenant_id, user_id, company_id, deleted_at) VALUES (?, ?, ?, ?, NULL)`,
		"emp-1", "tenant-1", "user-1", "",
	).Error)
	require.NoError(t, db.Exec(
		`INSERT INTO companies (id, tenant_id, name, created_at, deleted_at) VALUES (?, ?, ?, ?, NULL)`,
		"company-1", "tenant-1", "Tenant Company", time.Now(),
	).Error)

	resolver := newPurchaseFiscalYearResolver(db, fiscalYearRepoStub{
		item: &financeModels.FiscalYear{ID: "fy-1"},
	})

	ctx := context.Background()
	ctx = context.WithValue(ctx, "user_id", "user-1")
	ctx = context.WithValue(ctx, "tenant_id", "tenant-1")

	companyID, err := resolver.resolveCompanyID(ctx)
	require.NoError(t, err)
	require.Equal(t, "company-1", companyID)
}
