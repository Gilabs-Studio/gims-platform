package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/middleware"
	financeDto "github.com/gilabs/gims/api/internal/finance/domain/dto"
	financeSettings "github.com/gilabs/gims/api/internal/finance/domain/financesettings"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	"gorm.io/gorm"
)

type cashAccountCOAResolver interface {
	GetByCode(ctx context.Context, code string) (*financeDto.ChartOfAccountResponse, error)
}

type CompanyFinanceBootstrapService interface {
	EnsureCompanyDefaults(ctx context.Context, company *orgModels.Company) error
}

type companyFinanceBootstrapService struct {
	db         *gorm.DB
	settingsUC financeSettings.SettingsService
	coaUC      cashAccountCOAResolver
}

func NewCompanyFinanceBootstrapService(
	db *gorm.DB,
	settingsUC financeSettings.SettingsService,
	coaUC cashAccountCOAResolver,
) CompanyFinanceBootstrapService {
	return &companyFinanceBootstrapService{
		db:         db,
		settingsUC: settingsUC,
		coaUC:      coaUC,
	}
}

func (s *companyFinanceBootstrapService) EnsureCompanyDefaults(ctx context.Context, company *orgModels.Company) error {
	if company == nil {
		return nil
	}

	_, err := EnsureDefaultCashBankAccount(ctx, s.db, company.ID, company.Name, s.settingsUC, s.coaUC)
	return err
}

func EnsureDefaultCashBankAccount(
	ctx context.Context,
	db *gorm.DB,
	companyID string,
	companyName string,
	settingsUC financeSettings.SettingsService,
	coaUC cashAccountCOAResolver,
) (*coreModels.BankAccount, error) {
	companyID = strings.TrimSpace(companyID)
	if companyID == "" {
		return nil, errors.New("company id is required")
	}
	if db == nil {
		return nil, errors.New("db is required")
	}
	if settingsUC == nil || coaUC == nil {
		return nil, errors.New("finance bootstrap dependency is incomplete")
	}

	coaCode, err := settingsUC.GetCOAByKey(ctx, "finance.cash_default")
	if err != nil || strings.TrimSpace(coaCode) == "" {
		coaCode, err = settingsUC.GetCOACode(ctx, "coa.cash")
		if err != nil {
			return nil, err
		}
	}

	coa, err := coaUC.GetByCode(ctx, strings.TrimSpace(coaCode))
	if err != nil {
		return nil, err
	}

	var existing coreModels.BankAccount
	if err := database.GetDB(ctx, db).
		Where("company_id = ? AND chart_of_account_id = ? AND is_active = ?", companyID, coa.ID, true).
		Order("updated_at DESC").
		Order("created_at DESC").
		First(&existing).Error; err == nil {
		return &existing, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if strings.TrimSpace(companyName) == "" {
		var row struct {
			Name string
		}
		if err := database.GetDB(ctx, db).
			Table("companies").
			Select("name").
			Where("id = ?", companyID).
			Limit(1).
			Scan(&row).Error; err != nil {
			return nil, err
		}
		companyName = strings.TrimSpace(row.Name)
	}

	if companyName == "" {
		companyName = "Company Cash"
	}

	accountNumber := fmt.Sprintf("CASH%s", strings.ToUpper(strings.ReplaceAll(companyID[:8], "-", "")))
	tenantID := strings.TrimSpace(middleware.TenantFromContext(ctx))

	updateSQL := `
		UPDATE bank_accounts
		SET
			tenant_id = CASE WHEN ? = '' THEN tenant_id ELSE ?::uuid END,
			name = CASE WHEN name = '' THEN ? ELSE name END,
			account_type = CASE WHEN account_type = '' THEN ? ELSE account_type END,
			account_number = CASE WHEN account_number = '' THEN ? ELSE account_number END,
			account_holder = CASE WHEN account_holder = '' THEN ? ELSE account_holder END,
			currency = CASE WHEN currency = '' THEN ? ELSE currency END,
			chart_of_account_id = ?,
			is_active = true,
			updated_at = NOW()
		WHERE company_id = ?
		  AND (
			code = ?
			OR account_number = ?
			OR chart_of_account_id = ?
		  )
		  AND deleted_at IS NULL
	`
	if err := database.GetDB(ctx, db).Exec(updateSQL, tenantID, tenantID, "Kas Utama", "operational", accountNumber, companyName, "IDR", coa.ID, companyID, "AUTOCASH", accountNumber, coa.ID).Error; err != nil {
		return nil, err
	}

	if err := database.GetDB(ctx, db).Exec(`
		INSERT INTO bank_accounts (
			id,
			tenant_id,
			company_id,
			code,
			name,
			account_type,
			account_number,
			account_holder,
			currency,
			chart_of_account_id,
			is_active,
			created_at,
			updated_at
		)
		SELECT
			gen_random_uuid(),
			NULLIF(?, '')::uuid,
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			?,
			true,
			NOW(),
			NOW()
		WHERE NOT EXISTS (
			SELECT 1
			FROM bank_accounts
			WHERE company_id = ?
			  AND (
				code = ?
				OR account_number = ?
				OR (chart_of_account_id = ? AND is_active = true)
			  )
			  AND deleted_at IS NULL
		)
	`, tenantID, companyID, "AUTOCASH", "Kas Utama", "operational", accountNumber, companyName, "IDR", coa.ID, companyID, "AUTOCASH", accountNumber, coa.ID).Error; err != nil {
		return nil, err
	}

	var created coreModels.BankAccount
	if err := database.GetDB(ctx, db).
		Where("company_id = ? AND chart_of_account_id = ? AND is_active = ?", companyID, coa.ID, true).
		Order("updated_at DESC").
		Order("created_at DESC").
		First(&created).Error; err != nil {
		return nil, err
	}

	return &created, nil
}
