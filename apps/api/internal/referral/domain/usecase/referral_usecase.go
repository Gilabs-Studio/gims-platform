package usecase

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/referral/data/models"
	"github.com/gilabs/gims/api/internal/referral/data/repositories"
	"github.com/gilabs/gims/api/internal/referral/domain/dto"
	tenantDTO "github.com/gilabs/gims/api/internal/tenant/domain/dto"
	tenantUC "github.com/gilabs/gims/api/internal/tenant/domain/usecase"
	"gorm.io/gorm"
)

var (
	ErrReferralNotFound        = errors.New("referral not found")
	ErrReferralDuplicate       = errors.New("referral code or email already exists")
	ErrReferralInvalidCode     = errors.New("referral code format is invalid")
	ErrReferralCouponCollision = errors.New("referral code collides with coupon code")
	ErrReferralImmutable       = errors.New("referral code has usage history and cannot change owner or coupon")
	ErrCommissionInvalidState  = errors.New("commission state transition is invalid")
)

var publicCodePattern = regexp.MustCompile(`^[A-Z0-9_-]+$`)

type ReferralUsecase interface {
	ResolveRegistrationCode(ctx context.Context, code, email string) (*dto.RegistrationCodeResponse, error)
	CreateLead(ctx context.Context, code, email string) error
	MarkConverted(ctx context.Context, code, email, tenantID, subscriptionID string, amountPaid int64) error
	CreateAccount(ctx context.Context, req *dto.CreateSalesReferralAccountRequest) (*dto.SalesReferralAccountResponse, error)
	UpdateAccount(ctx context.Context, id string, req *dto.UpdateSalesReferralAccountRequest) (*dto.SalesReferralAccountResponse, error)
	ListAccounts(ctx context.Context, params dto.ListParams) ([]*dto.SalesReferralAccountResponse, *response.PaginationMeta, error)
	DeleteAccount(ctx context.Context, id string) error
	CreateCode(ctx context.Context, req *dto.CreateSalesReferralCodeRequest) (*dto.SalesReferralCodeResponse, error)
	UpdateCode(ctx context.Context, id string, req *dto.UpdateSalesReferralCodeRequest) (*dto.SalesReferralCodeResponse, error)
	ListCodes(ctx context.Context, params dto.ListParams) ([]*dto.SalesReferralCodeResponse, *response.PaginationMeta, error)
	SetCodeActive(ctx context.Context, id string, active bool) error
	DeleteCode(ctx context.Context, id string) error
	GetStats(ctx context.Context, params dto.ReferralStatsParams) (*dto.ReferralStatsResponse, error)
	CreateCommissionForPayment(ctx context.Context, paymentTransactionID string) error
	GetCommissionConfig(ctx context.Context) (*dto.CommissionConfigResponse, error)
	UpdateCommissionConfig(ctx context.Context, req *dto.CommissionConfigRequest) (*dto.CommissionConfigResponse, error)
	ListCommissions(ctx context.Context, params dto.CommissionListParams) ([]*dto.CommissionResponse, *response.PaginationMeta, error)
	ApproveCommission(ctx context.Context, id, actorID string) error
	VoidCommission(ctx context.Context, id, actorID, reason string) error
	CreatePayout(ctx context.Context, req *dto.CreatePayoutRequest, actorID string) (*dto.PayoutResponse, error)
	ListPayouts(ctx context.Context, params dto.PayoutListParams) ([]*dto.PayoutResponse, *response.PaginationMeta, error)
}

type referralUsecase struct {
	repo     repositories.ReferralRepository
	couponUC tenantUC.CouponUsecase
}

func NewReferralUsecase(repo repositories.ReferralRepository, couponUC tenantUC.CouponUsecase) ReferralUsecase {
	return &referralUsecase{repo: repo, couponUC: couponUC}
}

func NormalizePublicCode(code string) string { return strings.ToUpper(strings.TrimSpace(code)) }
func normalizeEmail(email string) string     { return strings.ToLower(strings.TrimSpace(email)) }

func validatePublicCode(code string) error {
	if code == "" || len(code) < 4 || len(code) > 64 || !publicCodePattern.MatchString(code) {
		return ErrReferralInvalidCode
	}
	return nil
}

func (u *referralUsecase) ResolveRegistrationCode(ctx context.Context, code, email string) (*dto.RegistrationCodeResponse, error) {
	normalized := NormalizePublicCode(code)
	if err := validatePublicCode(normalized); err != nil {
		return &dto.RegistrationCodeResponse{Valid: false, Reason: "invalid_format"}, nil
	}

	refCode, err := u.repo.FindCodeByCode(ctx, normalized)
	if err == nil {
		return u.validateReferralCode(ctx, refCode, email, false)
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	couponResp, err := u.couponUC.ValidateForEmail(ctx, normalized, email)
	if err != nil {
		return nil, err
	}
	return fromCouponResponse(dto.RegistrationCodeTypeCoupon, normalized, normalized, couponResp), nil
}

func (u *referralUsecase) CreateLead(ctx context.Context, code, email string) error {
	resp, err := u.ResolveRegistrationCode(ctx, code, email)
	if err != nil || resp == nil || !resp.Valid || resp.Type != dto.RegistrationCodeTypeReferral {
		return err
	}
	return u.repo.CreateLead(ctx, &models.SalesReferralLead{
		SalesReferralCodeID:    resp.ReferralCodeID,
		SalesReferralAccountID: resp.SalesReferralAccountID,
		CouponID:               resp.CouponID,
		EmailNormalized:        normalizeEmail(email),
		RegistrationCode:       resp.Code,
		Status:                 models.LeadStatusPendingPayment,
	})
}

func (u *referralUsecase) MarkConverted(ctx context.Context, code, email, tenantID, subscriptionID string, amountPaid int64) error {
	normalized := NormalizePublicCode(code)
	if err := validatePublicCode(normalized); err != nil {
		return err
	}
	refCode, err := u.repo.FindCodeByCode(ctx, normalized)
	if err != nil {
		return err
	}
	// Conversion happens after CreateLead. Do not apply per-email lead usage guard here,
	// otherwise the just-created pending lead makes the referral look already used.
	resp, err := u.validateReferralCode(ctx, refCode, email, true)
	if err != nil || resp == nil || !resp.Valid || resp.Type != dto.RegistrationCodeTypeReferral {
		return err
	}
	lead, err := u.repo.FindLatestLead(ctx, resp.ReferralCodeID, email)
	if err != nil {
		return err
	}
	exists, err := u.repo.HasConversion(ctx, resp.ReferralCodeID, tenantID)
	if err != nil || exists {
		return err
	}
	if err := u.repo.MarkLeadConverted(ctx, lead.ID); err != nil {
		return err
	}
	if err := u.repo.IncrementCodeUsage(ctx, resp.ReferralCodeID); err != nil {
		return err
	}
	conversionType := models.ConversionTypePaid
	if amountPaid == 0 {
		conversionType = models.ConversionTypeTrial
	}
	return u.repo.CreateConversion(ctx, &models.SalesReferralConversion{
		SalesReferralLeadID:    lead.ID,
		SalesReferralCodeID:    resp.ReferralCodeID,
		SalesReferralAccountID: resp.SalesReferralAccountID,
		CouponID:               resp.CouponID,
		TenantID:               tenantID,
		SubscriptionID:         nullableString(subscriptionID),
		ConversionType:         conversionType,
		GrossAmountIDR:         amountPaid,
		NetAmountIDR:           amountPaid,
	})
}

func nullableString(v string) *string {
	v = strings.TrimSpace(v)
	if v == "" {
		return nil
	}
	return &v
}

func (u *referralUsecase) validateReferralCode(ctx context.Context, refCode *models.SalesReferralCode, email string, skipEmailUsageCheck bool) (*dto.RegistrationCodeResponse, error) {
	if refCode.SalesReferralAccount == nil || !refCode.SalesReferralAccount.IsActive {
		return &dto.RegistrationCodeResponse{Valid: false, Reason: "inactive_sales_account", Type: dto.RegistrationCodeTypeReferral}, nil
	}
	if !refCode.IsActive {
		return &dto.RegistrationCodeResponse{Valid: false, Reason: "inactive", Type: dto.RegistrationCodeTypeReferral}, nil
	}
	if refCode.ExpiresAt != nil && apptime.Now().After(*refCode.ExpiresAt) {
		return &dto.RegistrationCodeResponse{Valid: false, Reason: "expired", Type: dto.RegistrationCodeTypeReferral}, nil
	}
	if refCode.UsedCount >= refCode.MaxUses {
		return &dto.RegistrationCodeResponse{Valid: false, Reason: "exhausted", Type: dto.RegistrationCodeTypeReferral}, nil
	}
	if !skipEmailUsageCheck && email != "" && refCode.MaxUsesPerEmail > 0 {
		used, err := u.repo.IsEmailUsedCode(ctx, refCode.ID, email)
		if err != nil {
			return nil, err
		}
		if used {
			return &dto.RegistrationCodeResponse{Valid: false, Reason: "already_used_by_email", Type: dto.RegistrationCodeTypeReferral}, nil
		}
	}

	// Ref code wraps coupon by ID. Existing coupon usecase validates by code, so load coupon and validate its public code.
	coupon, err := u.repo.CouponExistsUsable(ctx, refCode.CouponID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &dto.RegistrationCodeResponse{Valid: false, Reason: "coupon_not_found", Type: dto.RegistrationCodeTypeReferral}, nil
		}
		return nil, err
	}
	couponEmail := email
	if skipEmailUsageCheck {
		couponEmail = ""
	}
	couponResp, err := u.couponUC.ValidateForEmail(ctx, coupon.Code, couponEmail)
	if err != nil {
		return nil, err
	}
	resp := fromCouponResponse(dto.RegistrationCodeTypeReferral, refCode.Code, coupon.Code, couponResp)
	resp.ReferralCodeID = refCode.ID
	resp.SalesReferralAccountID = refCode.SalesReferralAccountID
	resp.CouponID = refCode.CouponID
	return resp, nil
}

func fromCouponResponse(kind dto.RegistrationCodeType, code, couponCode string, couponResp *tenantDTO.ValidateCouponResponse) *dto.RegistrationCodeResponse {
	if couponResp == nil {
		return &dto.RegistrationCodeResponse{Valid: false, Type: kind, Code: code, CouponCode: couponCode}
	}
	return &dto.RegistrationCodeResponse{
		Valid:                  couponResp.Valid,
		Type:                   kind,
		Reason:                 couponResp.Reason,
		Code:                   code,
		CouponCode:             couponCode,
		Description:            couponResp.Description,
		CouponType:             couponResp.CouponType,
		DiscountType:           couponResp.DiscountType,
		DiscountValue:          couponResp.DiscountValue,
		MaxUserCount:           couponResp.MaxUserCount,
		LockUserCount:          couponResp.LockUserCount,
		PackagePriceMonthlyIDR: couponResp.PackagePriceMonthlyIDR,
		PackagePriceYearlyIDR:  couponResp.PackagePriceYearlyIDR,
		Scope:                  couponResp.Scope,
		TargetPlanSlug:         couponResp.TargetPlanSlug,
		DurationDays:           couponResp.DurationDays,
	}
}

func (u *referralUsecase) CreateAccount(ctx context.Context, req *dto.CreateSalesReferralAccountRequest) (*dto.SalesReferralAccountResponse, error) {
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	account := &models.SalesReferralAccount{Email: normalizeEmail(req.Email), Name: req.Name, IsActive: active, CloseCommissionBps: req.CloseCommissionBps, RecurringCommissionBps: req.RecurringCommissionBps}
	if err := u.repo.CreateAccount(ctx, account); err != nil {
		return nil, err
	}
	return toAccountResponse(account), nil
}

func (u *referralUsecase) UpdateAccount(ctx context.Context, id string, req *dto.UpdateSalesReferralAccountRequest) (*dto.SalesReferralAccountResponse, error) {
	account, err := u.repo.FindAccountByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrReferralNotFound
		}
		return nil, err
	}
	account.Email = normalizeEmail(req.Email)
	account.Name = req.Name
	account.IsActive = *req.IsActive
	account.CloseCommissionBps = req.CloseCommissionBps
	account.RecurringCommissionBps = req.RecurringCommissionBps
	if err := u.repo.UpdateAccount(ctx, account); err != nil {
		return nil, err
	}
	return toAccountResponse(account), nil
}

func (u *referralUsecase) ListAccounts(ctx context.Context, params dto.ListParams) ([]*dto.SalesReferralAccountResponse, *response.PaginationMeta, error) {
	page, perPage := normalizePagination(params.Page, params.PerPage)
	items, total, err := u.repo.ListAccounts(ctx, page, perPage, params.Search)
	if err != nil {
		return nil, nil, err
	}
	out := make([]*dto.SalesReferralAccountResponse, 0, len(items))
	for _, item := range items {
		out = append(out, toAccountResponse(item))
	}
	return out, response.NewPaginationMeta(page, perPage, int(total)), nil
}

func (u *referralUsecase) DeleteAccount(ctx context.Context, id string) error {
	return u.repo.DeleteAccount(ctx, id)
}

func (u *referralUsecase) CreateCode(ctx context.Context, req *dto.CreateSalesReferralCodeRequest) (*dto.SalesReferralCodeResponse, error) {
	code, err := u.buildCode(ctx, req.SalesReferralAccountID, req.CouponID, req.Code, req.CampaignName, req.Description, req.IsActive, req.MaxUses, req.MaxUsesPerEmail, req.ExpiresAt)
	if err != nil {
		return nil, err
	}
	if err := u.repo.CreateCode(ctx, code); err != nil {
		return nil, err
	}
	return toCodeResponse(code), nil
}

func (u *referralUsecase) UpdateCode(ctx context.Context, id string, req *dto.UpdateSalesReferralCodeRequest) (*dto.SalesReferralCodeResponse, error) {
	code, err := u.repo.FindCodeByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrReferralNotFound
		}
		return nil, err
	}
	hasUsage, err := u.repo.HasCodeUsage(ctx, id)
	if err != nil {
		return nil, err
	}
	if hasUsage && (code.SalesReferralAccountID != req.SalesReferralAccountID || code.CouponID != req.CouponID) {
		return nil, ErrReferralImmutable
	}
	built, err := u.buildCode(ctx, req.SalesReferralAccountID, req.CouponID, req.Code, req.CampaignName, req.Description, req.IsActive, req.MaxUses, req.MaxUsesPerEmail, req.ExpiresAt)
	if err != nil {
		return nil, err
	}
	code.SalesReferralAccountID = built.SalesReferralAccountID
	code.CouponID = built.CouponID
	code.Code = built.Code
	code.CampaignName = built.CampaignName
	code.Description = built.Description
	code.IsActive = built.IsActive
	code.MaxUses = built.MaxUses
	code.MaxUsesPerEmail = built.MaxUsesPerEmail
	code.ExpiresAt = built.ExpiresAt
	if err := u.repo.UpdateCode(ctx, code); err != nil {
		return nil, err
	}
	return toCodeResponse(code), nil
}

func (u *referralUsecase) buildCode(ctx context.Context, accountID, couponID, rawCode string, campaignName, description *string, active *bool, maxUses, maxUsesPerEmail int, expiresAt *time.Time) (*models.SalesReferralCode, error) {
	code := NormalizePublicCode(rawCode)
	if err := validatePublicCode(code); err != nil {
		return nil, err
	}
	exists, err := u.repo.CouponCodeExists(ctx, code)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrReferralCouponCollision
	}
	account, err := u.repo.FindAccountByID(ctx, accountID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrReferralNotFound
		}
		return nil, err
	}
	coupon, err := u.repo.CouponExistsUsable(ctx, couponID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrReferralNotFound
		}
		return nil, err
	}
	if !coupon.IsUsable() {
		return nil, ErrReferralNotFound
	}
	if maxUsesPerEmail < 1 {
		maxUsesPerEmail = 1
	}
	isActive := true
	if active != nil {
		isActive = *active
	}
	return &models.SalesReferralCode{SalesReferralAccountID: account.ID, SalesReferralAccount: account, CouponID: coupon.ID, Code: code, CampaignName: campaignName, Description: description, IsActive: isActive, MaxUses: maxUses, MaxUsesPerEmail: maxUsesPerEmail, ExpiresAt: expiresAt}, nil
}

func (u *referralUsecase) ListCodes(ctx context.Context, params dto.ListParams) ([]*dto.SalesReferralCodeResponse, *response.PaginationMeta, error) {
	page, perPage := normalizePagination(params.Page, params.PerPage)
	items, total, err := u.repo.ListCodes(ctx, page, perPage, params.Search)
	if err != nil {
		return nil, nil, err
	}
	out := make([]*dto.SalesReferralCodeResponse, 0, len(items))
	for _, item := range items {
		out = append(out, toCodeResponse(item))
	}
	return out, response.NewPaginationMeta(page, perPage, int(total)), nil
}

func (u *referralUsecase) SetCodeActive(ctx context.Context, id string, active bool) error {
	return u.repo.SetCodeActive(ctx, id, active)
}

func (u *referralUsecase) DeleteCode(ctx context.Context, id string) error {
	return u.repo.DeleteCode(ctx, id)
}

func (u *referralUsecase) GetStats(ctx context.Context, params dto.ReferralStatsParams) (*dto.ReferralStatsResponse, error) {
	totalLeads, totalConversions, trialConversions, paidConversions, grossRevenue, netRevenue, err := u.repo.GetStats(ctx, params.DateFrom, params.DateTo, params.SalesReferralAccountID, params.ReferralCodeID)
	if err != nil {
		return nil, err
	}
	return &dto.ReferralStatsResponse{
		TotalLeads:       totalLeads,
		TotalConversions: totalConversions,
		TrialConversions: trialConversions,
		PaidConversions:  paidConversions,
		GrossRevenueIDR:  grossRevenue,
		NetRevenueIDR:    netRevenue,
	}, nil
}

func (u *referralUsecase) CreateCommissionForPayment(ctx context.Context, paymentTransactionID string) error {
	txn, err := u.repo.GetPaymentTransaction(ctx, paymentTransactionID)
	if err != nil || txn == nil || txn.Status != "paid" || txn.AmountIDR <= 0 || txn.TenantID == "" {
		return err
	}
	conv, err := u.repo.FindConversionByTenantID(ctx, txn.TenantID)
	if err != nil || conv == nil {
		return err
	}
	paidCount, err := u.repo.CountPaidCommissionsByTenant(ctx, txn.TenantID)
	if err != nil {
		return err
	}
	commissionType := models.CommissionTypeRecurring
	if paidCount == 0 {
		commissionType = models.CommissionTypeClose
	}
	account, err := u.repo.FindAccountByID(ctx, conv.SalesReferralAccountID)
	if err != nil || account == nil || !account.IsActive {
		return err
	}
	cfg, err := u.repo.GetActiveCommissionConfig(ctx)
	if err != nil {
		return err
	}
	bps := cfg.DefaultRecurringCommissionBps
	if commissionType == models.CommissionTypeClose {
		bps = cfg.DefaultCloseCommissionBps
		if account.CloseCommissionBps != nil {
			bps = *account.CloseCommissionBps
		}
	} else if account.RecurringCommissionBps != nil {
		bps = *account.RecurringCommissionBps
	}
	amount := (txn.AmountIDR * int64(bps)) / 10000
	commission := &models.ReferralCommission{
		SalesReferralAccountID:    account.ID,
		SalesReferralCodeID:       conv.SalesReferralCodeID,
		SalesReferralConversionID: &conv.ID,
		TenantID:                  txn.TenantID,
		SubscriptionID:            nullableString(txn.SubscriptionID),
		PaymentTransactionID:      txn.ID,
		CommissionType:            commissionType,
		Status:                    models.CommissionStatusPending,
		SourceNetAmountIDR:        txn.AmountIDR,
		CommissionBps:             bps,
		CommissionAmountIDR:       amount,
		EarnedAt:                  apptime.Now(),
	}
	return u.repo.CreateCommissionIfNotExists(ctx, commission)
}

func (u *referralUsecase) GetCommissionConfig(ctx context.Context) (*dto.CommissionConfigResponse, error) {
	cfg, err := u.repo.GetActiveCommissionConfig(ctx)
	if err != nil {
		return nil, err
	}
	return &dto.CommissionConfigResponse{ID: cfg.ID, DefaultCloseCommissionBps: cfg.DefaultCloseCommissionBps, DefaultRecurringCommissionBps: cfg.DefaultRecurringCommissionBps, IsActive: cfg.IsActive, CreatedAt: cfg.CreatedAt, UpdatedAt: cfg.UpdatedAt}, nil
}
func (u *referralUsecase) UpdateCommissionConfig(ctx context.Context, req *dto.CommissionConfigRequest) (*dto.CommissionConfigResponse, error) {
	if err := u.repo.UpsertCommissionConfig(ctx, &models.ReferralCommissionConfig{DefaultCloseCommissionBps: req.DefaultCloseCommissionBps, DefaultRecurringCommissionBps: req.DefaultRecurringCommissionBps}); err != nil {
		return nil, err
	}
	return u.GetCommissionConfig(ctx)
}
func (u *referralUsecase) ListCommissions(ctx context.Context, params dto.CommissionListParams) ([]*dto.CommissionResponse, *response.PaginationMeta, error) {
	page, perPage := normalizePagination(params.Page, params.PerPage)
	items, total, err := u.repo.ListCommissions(ctx, page, perPage, params.SalesReferralAccountID, params.Status, params.CommissionType)
	if err != nil {
		return nil, nil, err
	}
	out := make([]*dto.CommissionResponse, 0, len(items))
	for _, c := range items {
		out = append(out, &dto.CommissionResponse{ID: c.ID, SalesReferralAccountID: c.SalesReferralAccountID, SalesReferralCodeID: c.SalesReferralCodeID, SalesReferralConversionID: c.SalesReferralConversionID, TenantID: c.TenantID, SubscriptionID: c.SubscriptionID, PaymentTransactionID: c.PaymentTransactionID, CommissionType: string(c.CommissionType), Status: string(c.Status), SourceNetAmountIDR: c.SourceNetAmountIDR, CommissionBps: c.CommissionBps, CommissionAmountIDR: c.CommissionAmountIDR, EarnedAt: c.EarnedAt, ApprovedAt: c.ApprovedAt, VoidedAt: c.VoidedAt, VoidReason: c.VoidReason, CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt})
	}
	return out, response.NewPaginationMeta(page, perPage, int(total)), nil
}
func (u *referralUsecase) ApproveCommission(ctx context.Context, id, actorID string) error {
	commission, err := u.repo.FindCommissionByID(ctx, id)
	if err != nil {
		return err
	}
	if commission.Status != models.CommissionStatusPending {
		return ErrCommissionInvalidState
	}
	return u.repo.UpdateCommission(ctx, id, map[string]interface{}{"status": models.CommissionStatusApproved, "approved_at": apptime.Now(), "approved_by": actorID})
}
func (u *referralUsecase) VoidCommission(ctx context.Context, id, actorID, reason string) error {
	commission, err := u.repo.FindCommissionByID(ctx, id)
	if err != nil {
		return err
	}
	if commission.Status == models.CommissionStatusPaid {
		return ErrCommissionInvalidState
	}
	return u.repo.UpdateCommission(ctx, id, map[string]interface{}{"status": models.CommissionStatusVoid, "voided_at": apptime.Now(), "voided_by": actorID, "void_reason": reason})
}
func (u *referralUsecase) CreatePayout(ctx context.Context, req *dto.CreatePayoutRequest, actorID string) (*dto.PayoutResponse, error) {
	if req == nil || strings.TrimSpace(req.SalesReferralAccountID) == "" || len(req.CommissionIDs) == 0 {
		return nil, ErrCommissionInvalidState
	}
	seen := make(map[string]struct{}, len(req.CommissionIDs))
	for _, id := range req.CommissionIDs {
		id = strings.TrimSpace(id)
		if id == "" {
			return nil, ErrCommissionInvalidState
		}
		if _, ok := seen[id]; ok {
			return nil, ErrCommissionInvalidState
		}
		seen[id] = struct{}{}
	}
	payout := &models.ReferralCommissionPayout{SalesReferralAccountID: req.SalesReferralAccountID, PaidAt: req.PaidAt, PaymentReference: req.PaymentReference, Notes: req.Notes, CreatedBy: &actorID}
	if err := u.repo.CreatePayoutWithItems(ctx, payout, req.CommissionIDs); err != nil {
		return nil, err
	}
	return &dto.PayoutResponse{ID: payout.ID, SalesReferralAccountID: payout.SalesReferralAccountID, Status: payout.Status, TotalAmountIDR: payout.TotalAmountIDR, PaidAt: payout.PaidAt, PaymentReference: payout.PaymentReference, Notes: payout.Notes, CreatedBy: payout.CreatedBy, CreatedAt: payout.CreatedAt, UpdatedAt: payout.UpdatedAt}, nil
}
func (u *referralUsecase) ListPayouts(ctx context.Context, params dto.PayoutListParams) ([]*dto.PayoutResponse, *response.PaginationMeta, error) {
	page, perPage := normalizePagination(params.Page, params.PerPage)
	items, total, err := u.repo.ListPayouts(ctx, page, perPage, params.SalesReferralAccountID)
	if err != nil {
		return nil, nil, err
	}
	out := make([]*dto.PayoutResponse, 0, len(items))
	for _, p := range items {
		out = append(out, &dto.PayoutResponse{ID: p.ID, SalesReferralAccountID: p.SalesReferralAccountID, Status: p.Status, TotalAmountIDR: p.TotalAmountIDR, PaidAt: p.PaidAt, PaymentReference: p.PaymentReference, Notes: p.Notes, CreatedBy: p.CreatedBy, CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt})
	}
	return out, response.NewPaginationMeta(page, perPage, int(total)), nil
}

func normalizePagination(page, perPage int) (int, int) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}
	return page, perPage
}

func toAccountResponse(account *models.SalesReferralAccount) *dto.SalesReferralAccountResponse {
	if account == nil {
		return nil
	}
	return &dto.SalesReferralAccountResponse{ID: account.ID, Email: account.Email, Name: account.Name, IsActive: account.IsActive, CloseCommissionBps: account.CloseCommissionBps, RecurringCommissionBps: account.RecurringCommissionBps, CreatedAt: account.CreatedAt, UpdatedAt: account.UpdatedAt}
}

func toCodeResponse(code *models.SalesReferralCode) *dto.SalesReferralCodeResponse {
	if code == nil {
		return nil
	}
	return &dto.SalesReferralCodeResponse{ID: code.ID, SalesReferralAccountID: code.SalesReferralAccountID, SalesReferralAccount: toAccountResponse(code.SalesReferralAccount), CouponID: code.CouponID, Code: code.Code, CampaignName: code.CampaignName, Description: code.Description, IsActive: code.IsActive, MaxUses: code.MaxUses, UsedCount: code.UsedCount, MaxUsesPerEmail: code.MaxUsesPerEmail, ExpiresAt: code.ExpiresAt, CreatedAt: code.CreatedAt, UpdatedAt: code.UpdatedAt}
}
