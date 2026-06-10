package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/referral/data/models"
	tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
	"gorm.io/gorm"
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
