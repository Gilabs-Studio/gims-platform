package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/referral/data/models"
	tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ReferralRepository interface {
	CreateAccount(ctx context.Context, account *models.SalesReferralAccount) error
	UpdateAccount(ctx context.Context, account *models.SalesReferralAccount) error
	FindAccountByID(ctx context.Context, id string) (*models.SalesReferralAccount, error)
	FindAccountByEmail(ctx context.Context, email string) (*models.SalesReferralAccount, error)
	ListAccounts(ctx context.Context, page, perPage int, search string) ([]*models.SalesReferralAccount, int64, error)
	DeleteAccount(ctx context.Context, id string) error

	CreateCode(ctx context.Context, code *models.SalesReferralCode) error
	UpdateCode(ctx context.Context, code *models.SalesReferralCode) error
	FindCodeByID(ctx context.Context, id string) (*models.SalesReferralCode, error)
	FindCodeByCode(ctx context.Context, code string) (*models.SalesReferralCode, error)
	ListCodes(ctx context.Context, page, perPage int, search string) ([]*models.SalesReferralCode, int64, error)
	DeleteCode(ctx context.Context, id string) error
	SetCodeActive(ctx context.Context, id string, active bool) error
	HasCodeUsage(ctx context.Context, codeID string) (bool, error)
	IsEmailUsedCode(ctx context.Context, codeID, email string) (bool, error)
	CreateLead(ctx context.Context, lead *models.SalesReferralLead) error
	CreateConversion(ctx context.Context, conversion *models.SalesReferralConversion) error
	HasConversion(ctx context.Context, codeID, tenantID string) (bool, error)
	IncrementCodeUsage(ctx context.Context, codeID string) error
	MarkLeadConverted(ctx context.Context, leadID string) error
	FindLatestLead(ctx context.Context, codeID, email string) (*models.SalesReferralLead, error)
	GetStats(ctx context.Context, dateFrom, dateTo *time.Time, accountID, codeID string) (totalLeads, totalConversions, trialConversions, paidConversions, grossRevenue, netRevenue int64, err error)
	CouponCodeExists(ctx context.Context, code string) (bool, error)
	CouponExistsUsable(ctx context.Context, couponID string) (*tenantModels.Coupon, error)
	GetActiveCommissionConfig(ctx context.Context) (*models.ReferralCommissionConfig, error)
	UpsertCommissionConfig(ctx context.Context, config *models.ReferralCommissionConfig) error
	FindConversionByTenantID(ctx context.Context, tenantID string) (*models.SalesReferralConversion, error)
	GetPaymentTransaction(ctx context.Context, id string) (*tenantModels.PaymentTransaction, error)
	CountPaidCommissionsByTenant(ctx context.Context, tenantID string) (int64, error)
	CreateCommissionIfNotExists(ctx context.Context, commission *models.ReferralCommission) error
	ListCommissions(ctx context.Context, page, perPage int, accountID, status, commissionType string) ([]*models.ReferralCommission, int64, error)
	FindCommissionByID(ctx context.Context, id string) (*models.ReferralCommission, error)
	UpdateCommission(ctx context.Context, id string, updates map[string]interface{}) error
	CreatePayoutWithItems(ctx context.Context, payout *models.ReferralCommissionPayout, commissionIDs []string) error
	ListPayouts(ctx context.Context, page, perPage int, accountID string) ([]*models.ReferralCommissionPayout, int64, error)
}

type referralRepository struct {
	db *gorm.DB
}

func NewReferralRepository(db *gorm.DB) ReferralRepository {
	return &referralRepository{db: db}
}

func normalizeCode(code string) string   { return strings.ToUpper(strings.TrimSpace(code)) }
func normalizeEmail(email string) string { return strings.ToLower(strings.TrimSpace(email)) }

func (r *referralRepository) getDB(ctx context.Context) *gorm.DB { return database.GetDB(ctx, r.db) }

func (r *referralRepository) CreateAccount(ctx context.Context, account *models.SalesReferralAccount) error {
	account.Email = normalizeEmail(account.Email)
	return r.getDB(ctx).Create(account).Error
}

func (r *referralRepository) UpdateAccount(ctx context.Context, account *models.SalesReferralAccount) error {
	account.Email = normalizeEmail(account.Email)
	return r.getDB(ctx).Save(account).Error
}

func (r *referralRepository) FindAccountByID(ctx context.Context, id string) (*models.SalesReferralAccount, error) {
	var account models.SalesReferralAccount
	err := r.getDB(ctx).Where("id = ? AND deleted_at IS NULL", id).First(&account).Error
	return &account, err
}

func (r *referralRepository) FindAccountByEmail(ctx context.Context, email string) (*models.SalesReferralAccount, error) {
	var account models.SalesReferralAccount
	err := r.getDB(ctx).Where("LOWER(email) = ? AND deleted_at IS NULL", normalizeEmail(email)).First(&account).Error
	return &account, err
}

func (r *referralRepository) ListAccounts(ctx context.Context, page, perPage int, search string) ([]*models.SalesReferralAccount, int64, error) {
	var accounts []*models.SalesReferralAccount
	var total int64
	q := r.getDB(ctx).Model(&models.SalesReferralAccount{}).Where("deleted_at IS NULL")
	if s := strings.TrimSpace(search); s != "" {
		like := "%" + strings.ToLower(s) + "%"
		q = q.Where("LOWER(email) LIKE ? OR LOWER(COALESCE(name, '')) LIKE ?", like, like)
	}
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	if err := q.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&accounts).Error; err != nil {
		return nil, 0, err
	}
	return accounts, total, nil
}

func (r *referralRepository) DeleteAccount(ctx context.Context, id string) error {
	return r.getDB(ctx).Delete(&models.SalesReferralAccount{}, "id = ?", id).Error
}

func (r *referralRepository) CreateCode(ctx context.Context, code *models.SalesReferralCode) error {
	code.Code = normalizeCode(code.Code)
	return r.getDB(ctx).Create(code).Error
}

func (r *referralRepository) UpdateCode(ctx context.Context, code *models.SalesReferralCode) error {
	code.Code = normalizeCode(code.Code)
	return r.getDB(ctx).Save(code).Error
}

func (r *referralRepository) FindCodeByID(ctx context.Context, id string) (*models.SalesReferralCode, error) {
	var code models.SalesReferralCode
	err := r.getDB(ctx).Preload("SalesReferralAccount").Where("id = ? AND deleted_at IS NULL", id).First(&code).Error
	return &code, err
}

func (r *referralRepository) FindCodeByCode(ctx context.Context, code string) (*models.SalesReferralCode, error) {
	var refCode models.SalesReferralCode
	err := r.getDB(ctx).Preload("SalesReferralAccount").Where("code = ? AND deleted_at IS NULL", normalizeCode(code)).First(&refCode).Error
	return &refCode, err
}

func (r *referralRepository) ListCodes(ctx context.Context, page, perPage int, search string) ([]*models.SalesReferralCode, int64, error) {
	var codes []*models.SalesReferralCode
	var total int64
	q := r.getDB(ctx).Model(&models.SalesReferralCode{}).Preload("SalesReferralAccount").Where("sales_referral_codes.deleted_at IS NULL")
	if s := strings.TrimSpace(search); s != "" {
		like := "%" + strings.ToLower(s) + "%"
		q = q.Where("LOWER(code) LIKE ? OR LOWER(COALESCE(campaign_name, '')) LIKE ?", like, like)
	}
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	if err := q.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&codes).Error; err != nil {
		return nil, 0, err
	}
	return codes, total, nil
}

func (r *referralRepository) DeleteCode(ctx context.Context, id string) error {
	return r.getDB(ctx).Delete(&models.SalesReferralCode{}, "id = ?", id).Error
}

func (r *referralRepository) SetCodeActive(ctx context.Context, id string, active bool) error {
	return r.getDB(ctx).Model(&models.SalesReferralCode{}).Where("id = ? AND deleted_at IS NULL", id).Update("is_active", active).Error
}

func (r *referralRepository) HasCodeUsage(ctx context.Context, codeID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.SalesReferralLead{}).Where("sales_referral_code_id = ? AND deleted_at IS NULL", codeID).Count(&count).Error
	return count > 0, err
}

func (r *referralRepository) IsEmailUsedCode(ctx context.Context, codeID, email string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.SalesReferralLead{}).
		Where("sales_referral_code_id = ? AND email_normalized = ? AND status <> ? AND deleted_at IS NULL", codeID, normalizeEmail(email), models.LeadStatusSuperseded).
		Count(&count).Error
	return count > 0, err
}

func (r *referralRepository) CreateLead(ctx context.Context, lead *models.SalesReferralLead) error {
	lead.EmailNormalized = normalizeEmail(lead.EmailNormalized)
	lead.RegistrationCode = normalizeCode(lead.RegistrationCode)
	return r.getDB(ctx).Create(lead).Error
}

func (r *referralRepository) CreateConversion(ctx context.Context, conversion *models.SalesReferralConversion) error {
	return r.getDB(ctx).Create(conversion).Error
}

func (r *referralRepository) HasConversion(ctx context.Context, codeID, tenantID string) (bool, error) {
	var count int64
	err := r.getDB(ctx).Model(&models.SalesReferralConversion{}).
		Where("sales_referral_code_id = ? AND tenant_id = ? AND deleted_at IS NULL", codeID, tenantID).
		Count(&count).Error
	return count > 0, err
}

func (r *referralRepository) IncrementCodeUsage(ctx context.Context, codeID string) error {
	return r.getDB(ctx).Model(&models.SalesReferralCode{}).
		Where("id = ? AND deleted_at IS NULL AND used_count < max_uses", codeID).
		UpdateColumn("used_count", gorm.Expr("used_count + 1")).Error
}

func (r *referralRepository) MarkLeadConverted(ctx context.Context, leadID string) error {
	return r.getDB(ctx).Model(&models.SalesReferralLead{}).
		Where("id = ? AND deleted_at IS NULL", leadID).
		Update("status", models.LeadStatusConverted).Error
}

func (r *referralRepository) FindLatestLead(ctx context.Context, codeID, email string) (*models.SalesReferralLead, error) {
	var lead models.SalesReferralLead
	err := r.getDB(ctx).Where("sales_referral_code_id = ? AND email_normalized = ? AND deleted_at IS NULL", codeID, normalizeEmail(email)).
		Order("created_at DESC").
		First(&lead).Error
	return &lead, err
}

func (r *referralRepository) GetStats(ctx context.Context, dateFrom, dateTo *time.Time, accountID, codeID string) (int64, int64, int64, int64, int64, int64, error) {
	db := r.getDB(ctx)
	leadQ := db.Model(&models.SalesReferralLead{}).Where("deleted_at IS NULL")
	convQ := db.Model(&models.SalesReferralConversion{}).Where("deleted_at IS NULL")
	if dateFrom != nil {
		leadQ = leadQ.Where("created_at >= ?", *dateFrom)
		convQ = convQ.Where("created_at >= ?", *dateFrom)
	}
	if dateTo != nil {
		leadQ = leadQ.Where("created_at <= ?", *dateTo)
		convQ = convQ.Where("created_at <= ?", *dateTo)
	}
	if strings.TrimSpace(accountID) != "" {
		leadQ = leadQ.Where("sales_referral_account_id = ?", accountID)
		convQ = convQ.Where("sales_referral_account_id = ?", accountID)
	}
	if strings.TrimSpace(codeID) != "" {
		leadQ = leadQ.Where("sales_referral_code_id = ?", codeID)
		convQ = convQ.Where("sales_referral_code_id = ?", codeID)
	}

	var totalLeads, totalConversions, trialConversions, paidConversions int64
	if err := leadQ.Count(&totalLeads).Error; err != nil {
		return 0, 0, 0, 0, 0, 0, err
	}
	if err := convQ.Count(&totalConversions).Error; err != nil {
		return 0, 0, 0, 0, 0, 0, err
	}
	if err := convQ.Session(&gorm.Session{}).Where("conversion_type = ?", models.ConversionTypeTrial).Count(&trialConversions).Error; err != nil {
		return 0, 0, 0, 0, 0, 0, err
	}
	if err := convQ.Session(&gorm.Session{}).Where("conversion_type IN ?", []models.SalesReferralConversionType{models.ConversionTypePaid, models.ConversionTypeFirstPaidUpgrade}).Count(&paidConversions).Error; err != nil {
		return 0, 0, 0, 0, 0, 0, err
	}
	var sums struct{ GrossRevenueIDR, NetRevenueIDR int64 }
	if err := convQ.Select("COALESCE(SUM(gross_amount_id_r), 0) AS gross_revenue_idr, COALESCE(SUM(net_amount_id_r), 0) AS net_revenue_idr").Scan(&sums).Error; err != nil {
		return 0, 0, 0, 0, 0, 0, err
	}
	return totalLeads, totalConversions, trialConversions, paidConversions, sums.GrossRevenueIDR, sums.NetRevenueIDR, nil
}

func (r *referralRepository) CouponCodeExists(ctx context.Context, code string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&tenantModels.Coupon{}).Where("code = ? AND deleted_at IS NULL", normalizeCode(code)).Count(&count).Error
	return count > 0, err
}

func (r *referralRepository) CouponExistsUsable(ctx context.Context, couponID string) (*tenantModels.Coupon, error) {
	var coupon tenantModels.Coupon
	err := r.db.WithContext(ctx).Where("id = ? AND deleted_at IS NULL", couponID).First(&coupon).Error
	return &coupon, err
}

func (r *referralRepository) GetActiveCommissionConfig(ctx context.Context) (*models.ReferralCommissionConfig, error) {
	var cfg models.ReferralCommissionConfig
	err := r.getDB(ctx).Where("is_active = ? AND deleted_at IS NULL", true).Order("created_at DESC").First(&cfg).Error
	return &cfg, err
}

func (r *referralRepository) UpsertCommissionConfig(ctx context.Context, cfg *models.ReferralCommissionConfig) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.ReferralCommissionConfig{}).Where("is_active = ? AND deleted_at IS NULL", true).Update("is_active", false).Error; err != nil {
			return err
		}
		cfg.IsActive = true
		return tx.Create(cfg).Error
	})
}

func (r *referralRepository) FindConversionByTenantID(ctx context.Context, tenantID string) (*models.SalesReferralConversion, error) {
	var conv models.SalesReferralConversion
	err := r.getDB(ctx).Where("tenant_id = ? AND deleted_at IS NULL", tenantID).Order("created_at ASC").First(&conv).Error
	return &conv, err
}

func (r *referralRepository) GetPaymentTransaction(ctx context.Context, id string) (*tenantModels.PaymentTransaction, error) {
	var txn tenantModels.PaymentTransaction
	err := r.getDB(ctx).Where("id = ? AND deleted_at IS NULL", id).First(&txn).Error
	return &txn, err
}

func (r *referralRepository) CountPaidCommissionsByTenant(ctx context.Context, tenantID string) (int64, error) {
	var count int64
	err := r.getDB(ctx).Model(&models.ReferralCommission{}).Where("tenant_id = ? AND commission_type IN ? AND deleted_at IS NULL", tenantID, []models.ReferralCommissionType{models.CommissionTypeClose, models.CommissionTypeRecurring}).Count(&count).Error
	return count, err
}

func (r *referralRepository) CreateCommissionIfNotExists(ctx context.Context, c *models.ReferralCommission) error {
	var count int64
	if err := r.getDB(ctx).Model(&models.ReferralCommission{}).Where("payment_transaction_id = ? AND commission_type = ? AND deleted_at IS NULL", c.PaymentTransactionID, c.CommissionType).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	return r.getDB(ctx).Create(c).Error
}

func (r *referralRepository) ListCommissions(ctx context.Context, page, perPage int, accountID, status, commissionType string) ([]*models.ReferralCommission, int64, error) {
	var items []*models.ReferralCommission
	var total int64
	q := r.getDB(ctx).Model(&models.ReferralCommission{}).Where("deleted_at IS NULL")
	if strings.TrimSpace(accountID) != "" {
		q = q.Where("sales_referral_account_id = ?", accountID)
	}
	if strings.TrimSpace(status) != "" {
		q = q.Where("status = ?", status)
	}
	if strings.TrimSpace(commissionType) != "" {
		q = q.Where("commission_type = ?", commissionType)
	}
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := q.Order("earned_at DESC").Offset((page - 1) * perPage).Limit(perPage).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *referralRepository) FindCommissionByID(ctx context.Context, id string) (*models.ReferralCommission, error) {
	var item models.ReferralCommission
	err := r.getDB(ctx).Where("id = ? AND deleted_at IS NULL", id).First(&item).Error
	return &item, err
}

func (r *referralRepository) UpdateCommission(ctx context.Context, id string, updates map[string]interface{}) error {
	return r.getDB(ctx).Model(&models.ReferralCommission{}).
		Where("id = ? AND deleted_at IS NULL AND status <> ?", id, models.CommissionStatusPaid).
		Updates(updates).Error
}

func (r *referralRepository) CreatePayoutWithItems(ctx context.Context, payout *models.ReferralCommissionPayout, commissionIDs []string) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		var commissions []models.ReferralCommission
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id IN ? AND deleted_at IS NULL", commissionIDs).Find(&commissions).Error; err != nil {
			return err
		}
		if len(commissions) != len(commissionIDs) {
			return gorm.ErrRecordNotFound
		}
		var total int64
		for _, c := range commissions {
			if c.Status != models.CommissionStatusApproved {
				return gorm.ErrInvalidData
			}
			if c.SalesReferralAccountID != payout.SalesReferralAccountID {
				return gorm.ErrInvalidData
			}
			total += c.CommissionAmountIDR
		}
		payout.TotalAmountIDR = total
		if err := tx.Create(payout).Error; err != nil {
			return err
		}
		for _, c := range commissions {
			item := &models.ReferralCommissionPayoutItem{PayoutID: payout.ID, ReferralCommissionID: c.ID, AmountIDR: c.CommissionAmountIDR}
			if err := tx.Create(item).Error; err != nil {
				return err
			}
			if err := tx.Model(&models.ReferralCommission{}).Where("id = ?", c.ID).Update("status", models.CommissionStatusPaid).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *referralRepository) ListPayouts(ctx context.Context, page, perPage int, accountID string) ([]*models.ReferralCommissionPayout, int64, error) {
	var items []*models.ReferralCommissionPayout
	var total int64
	q := r.getDB(ctx).Model(&models.ReferralCommissionPayout{}).Where("deleted_at IS NULL")
	if strings.TrimSpace(accountID) != "" {
		q = q.Where("sales_referral_account_id = ?", accountID)
	}
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := q.Order("paid_at DESC").Offset((page - 1) * perPage).Limit(perPage).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}
