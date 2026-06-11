package usecase

import (
	"context"
	"testing"
	"time"

	"github.com/gilabs/gims/api/internal/referral/data/models"
	"github.com/gilabs/gims/api/internal/referral/domain/dto"
	tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
)

type fakeReferralRepo struct {
	account     *models.SalesReferralAccount
	code        *models.SalesReferralCode
	config      *models.ReferralCommissionConfig
	conversion  *models.SalesReferralConversion
	payment     *tenantModels.PaymentTransaction
	paidCount   int64
	created     *models.ReferralCommission
	commission  *models.ReferralCommission
	lastUpdates map[string]interface{}
}

func (f *fakeReferralRepo) CreateAccount(context.Context, *models.SalesReferralAccount) error {
	return nil
}
func (f *fakeReferralRepo) UpdateAccount(context.Context, *models.SalesReferralAccount) error {
	return nil
}
func (f *fakeReferralRepo) FindAccountByID(context.Context, string) (*models.SalesReferralAccount, error) {
	return f.account, nil
}
func (f *fakeReferralRepo) FindAccountByEmail(context.Context, string) (*models.SalesReferralAccount, error) {
	return nil, nil
}
func (f *fakeReferralRepo) ListAccounts(context.Context, int, int, string) ([]*models.SalesReferralAccount, int64, error) {
	return nil, 0, nil
}
func (f *fakeReferralRepo) DeleteAccount(context.Context, string) error                 { return nil }
func (f *fakeReferralRepo) CreateCode(context.Context, *models.SalesReferralCode) error { return nil }
func (f *fakeReferralRepo) UpdateCode(context.Context, *models.SalesReferralCode) error { return nil }
func (f *fakeReferralRepo) FindCodeByID(context.Context, string) (*models.SalesReferralCode, error) {
	return f.code, nil
}
func (f *fakeReferralRepo) FindCodeByCode(context.Context, string) (*models.SalesReferralCode, error) {
	return nil, nil
}
func (f *fakeReferralRepo) ListCodes(context.Context, int, int, string) ([]*models.SalesReferralCode, int64, error) {
	return nil, 0, nil
}
func (f *fakeReferralRepo) DeleteCode(context.Context, string) error           { return nil }
func (f *fakeReferralRepo) SetCodeActive(context.Context, string, bool) error  { return nil }
func (f *fakeReferralRepo) HasCodeUsage(context.Context, string) (bool, error) { return false, nil }
func (f *fakeReferralRepo) IsEmailUsedCode(context.Context, string, string) (bool, error) {
	return false, nil
}
func (f *fakeReferralRepo) CreateLead(context.Context, *models.SalesReferralLead) error { return nil }
func (f *fakeReferralRepo) CreateConversion(context.Context, *models.SalesReferralConversion) error {
	return nil
}
func (f *fakeReferralRepo) HasConversion(context.Context, string, string) (bool, error) {
	return false, nil
}
func (f *fakeReferralRepo) IncrementCodeUsage(context.Context, string) error { return nil }
func (f *fakeReferralRepo) MarkLeadConverted(context.Context, string) error  { return nil }
func (f *fakeReferralRepo) FindLatestLead(context.Context, string, string) (*models.SalesReferralLead, error) {
	return nil, nil
}
func (f *fakeReferralRepo) GetStats(context.Context, *time.Time, *time.Time, string, string) (int64, int64, int64, int64, int64, int64, error) {
	return 0, 0, 0, 0, 0, 0, nil
}
func (f *fakeReferralRepo) CouponCodeExists(context.Context, string) (bool, error) { return false, nil }
func (f *fakeReferralRepo) CouponExistsUsable(context.Context, string) (*tenantModels.Coupon, error) {
	return nil, nil
}
func (f *fakeReferralRepo) GetActiveCommissionConfig(context.Context) (*models.ReferralCommissionConfig, error) {
	return f.config, nil
}
func (f *fakeReferralRepo) UpsertCommissionConfig(context.Context, *models.ReferralCommissionConfig) error {
	return nil
}
func (f *fakeReferralRepo) FindConversionByTenantID(context.Context, string) (*models.SalesReferralConversion, error) {
	return f.conversion, nil
}
func (f *fakeReferralRepo) FindConversionByID(context.Context, string) (*models.SalesReferralConversion, error) {
	return f.conversion, nil
}
func (f *fakeReferralRepo) FindLeadByID(context.Context, string) (*models.SalesReferralLead, error) {
	return nil, nil
}
func (f *fakeReferralRepo) GetPaymentTransaction(context.Context, string) (*tenantModels.PaymentTransaction, error) {
	return f.payment, nil
}
func (f *fakeReferralRepo) GetTenantSubscription(context.Context, string) (*tenantModels.TenantSubscription, error) {
	return nil, nil
}
func (f *fakeReferralRepo) CountPaidCommissionsByTenant(context.Context, string) (int64, error) {
	return f.paidCount, nil
}
func (f *fakeReferralRepo) CreateCommissionIfNotExists(_ context.Context, c *models.ReferralCommission) error {
	f.created = c
	return nil
}
func (f *fakeReferralRepo) ListCommissions(context.Context, int, int, string, string, string) ([]*models.ReferralCommission, int64, error) {
	return nil, 0, nil
}
func (f *fakeReferralRepo) FindCommissionByID(context.Context, string) (*models.ReferralCommission, error) {
	return f.commission, nil
}
func (f *fakeReferralRepo) FindPaidCommissionByPaymentTransactionID(context.Context, string) (*models.ReferralCommission, error) {
	return f.commission, nil
}
func (f *fakeReferralRepo) UpdateCommission(_ context.Context, _ string, updates map[string]interface{}) error {
	f.lastUpdates = updates
	return nil
}
func (f *fakeReferralRepo) CreatePayoutWithItems(context.Context, *models.ReferralCommissionPayout, []string) error {
	return nil
}
func (f *fakeReferralRepo) ListPayouts(context.Context, int, int, string) ([]*models.ReferralCommissionPayout, int64, error) {
	return nil, 0, nil
}

func TestCreateCommissionForPaymentCreatesCloseCommission(t *testing.T) {
	repo := &fakeReferralRepo{
		account:    &models.SalesReferralAccount{ID: "acc-1", IsActive: true},
		code:       &models.SalesReferralCode{ID: "code-1", CloseCommissionBps: 1500, RecurringCommissionBps: 400},
		config:     &models.ReferralCommissionConfig{DefaultCloseCommissionBps: 1000, DefaultRecurringCommissionBps: 500},
		conversion: &models.SalesReferralConversion{ID: "conv-1", SalesReferralAccountID: "acc-1", SalesReferralCodeID: "code-1", TenantID: "tenant-1"},
		payment:    &tenantModels.PaymentTransaction{ID: "pay-1", TenantID: "tenant-1", Status: "paid", AmountIDR: 100000, SubscriptionID: "sub-1"},
	}
	u := NewReferralUsecase(repo, nil)
	if err := u.CreateCommissionForPayment(context.Background(), "pay-1"); err != nil {
		t.Fatalf("CreateCommissionForPayment error: %v", err)
	}
	if repo.created == nil {
		t.Fatal("commission not created")
	}
	if repo.created.CommissionType != models.CommissionTypeClose {
		t.Fatalf("type = %s", repo.created.CommissionType)
	}
	if repo.created.CommissionBps != 1500 {
		t.Fatalf("bps = %d", repo.created.CommissionBps)
	}
	if repo.created.CommissionAmountIDR != 15000 {
		t.Fatalf("amount = %d", repo.created.CommissionAmountIDR)
	}
}

func TestCreateCommissionForPaymentSkipsZeroAmount(t *testing.T) {
	repo := &fakeReferralRepo{payment: &tenantModels.PaymentTransaction{ID: "pay-1", TenantID: "tenant-1", Status: "paid", AmountIDR: 0}}
	u := NewReferralUsecase(repo, nil)
	if err := u.CreateCommissionForPayment(context.Background(), "pay-1"); err != nil {
		t.Fatalf("CreateCommissionForPayment error: %v", err)
	}
	if repo.created != nil {
		t.Fatal("zero amount should not create commission")
	}
}

func TestApproveCommissionRequiresPending(t *testing.T) {
	repo := &fakeReferralRepo{commission: &models.ReferralCommission{ID: "c-1", Status: models.CommissionStatusPaid}}
	u := NewReferralUsecase(repo, nil)
	if err := u.ApproveCommission(context.Background(), "c-1", "admin-1"); err != ErrCommissionInvalidState {
		t.Fatalf("err = %v", err)
	}
}

func TestCreatePayoutRejectsDuplicateCommissionIDs(t *testing.T) {
	repo := &fakeReferralRepo{}
	u := NewReferralUsecase(repo, nil)
	_, err := u.CreatePayout(context.Background(), &dto.CreatePayoutRequest{SalesReferralAccountID: "acc-1", CommissionIDs: []string{"c-1", "c-1"}}, "admin-1")
	if err != ErrCommissionInvalidState {
		t.Fatalf("err = %v", err)
	}
}

func TestCreateNegativeAdjustmentForPaymentMirrorsPaidCommission(t *testing.T) {
	repo := &fakeReferralRepo{commission: &models.ReferralCommission{
		ID:                     "c-1",
		SalesReferralAccountID: "acc-1",
		SalesReferralCodeID:    "code-1",
		TenantID:               "tenant-1",
		PaymentTransactionID:   "pay-1",
		CommissionType:         models.CommissionTypeClose,
		Status:                 models.CommissionStatusPaid,
		SourceNetAmountIDR:     100000,
		CommissionBps:          1000,
		CommissionAmountIDR:    10000,
	}}
	u := NewReferralUsecase(repo, nil)
	if err := u.CreateNegativeAdjustmentForPayment(context.Background(), "pay-1", "REFUNDED"); err != nil {
		t.Fatalf("CreateNegativeAdjustmentForPayment error: %v", err)
	}
	if repo.created == nil {
		t.Fatal("adjustment not created")
	}
	if repo.created.CommissionType != models.CommissionTypeAdjustment {
		t.Fatalf("type = %s", repo.created.CommissionType)
	}
	if repo.created.CommissionAmountIDR != -10000 {
		t.Fatalf("amount = %d", repo.created.CommissionAmountIDR)
	}
}
