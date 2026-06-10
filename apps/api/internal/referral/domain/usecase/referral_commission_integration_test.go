package usecase

import (
	"context"
	"strings"
	"testing"
	"time"

	refModels "github.com/gilabs/gims/api/internal/referral/data/models"
	refRepo "github.com/gilabs/gims/api/internal/referral/data/repositories"
	"github.com/gilabs/gims/api/internal/referral/domain/dto"
	tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func openReferralCommissionIntegrationDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		if strings.Contains(err.Error(), "go-sqlite3 requires cgo") {
			t.Skip("sqlite integration test skipped because CGO is disabled")
		}
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(
		&refModels.SalesReferralAccount{},
		&refModels.SalesReferralCode{},
		&refModels.SalesReferralLead{},
		&refModels.SalesReferralConversion{},
		&refModels.ReferralCommissionConfig{},
		&refModels.ReferralCommission{},
		&refModels.ReferralCommissionPayout{},
		&refModels.ReferralCommissionPayoutItem{},
		&tenantModels.PaymentTransaction{},
	); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func seedReferralCommissionIntegration(t *testing.T, db *gorm.DB) (ReferralUsecase, string, string) {
	t.Helper()
	ctx := context.Background()
	closeBps := 2500
	account := refModels.SalesReferralAccount{ID: "acc-1", Email: "sales@example.com", IsActive: true, CloseCommissionBps: &closeBps}
	code := refModels.SalesReferralCode{ID: "code-1", SalesReferralAccountID: account.ID, CouponID: "coupon-1", Code: "REFINT001", IsActive: true, MaxUses: 100, MaxUsesPerEmail: 1}
	lead := refModels.SalesReferralLead{ID: "lead-1", SalesReferralCodeID: code.ID, SalesReferralAccountID: account.ID, CouponID: code.CouponID, EmailNormalized: "buyer@example.com", RegistrationCode: code.Code, Status: refModels.LeadStatusConverted}
	conversion := refModels.SalesReferralConversion{ID: "conv-1", SalesReferralLeadID: lead.ID, SalesReferralCodeID: code.ID, SalesReferralAccountID: account.ID, CouponID: code.CouponID, TenantID: "tenant-1", SubscriptionID: strPtr("sub-1"), ConversionType: refModels.ConversionTypePaid, GrossAmountIDR: 100000, NetAmountIDR: 100000}
	config := refModels.ReferralCommissionConfig{ID: "cfg-1", DefaultCloseCommissionBps: 3000, DefaultRecurringCommissionBps: 300, IsActive: true}
	payment := tenantModels.PaymentTransaction{ID: "pay-1", TenantID: conversion.TenantID, SubscriptionID: "sub-1", Provider: tenantModels.PaymentProviderXendit, Status: tenantModels.PaymentStatusPaid, AmountIDR: 100000, ProviderInvoiceID: "inv-1"}
	for _, row := range []interface{}{&account, &code, &lead, &conversion, &config, &payment} {
		if err := db.WithContext(ctx).Create(row).Error; err != nil {
			t.Fatalf("seed %T: %v", row, err)
		}
	}
	return NewReferralUsecase(refRepo.NewReferralRepository(db), nil), payment.ID, account.ID
}

func TestReferralCommissionDBFlowClosePayoutAndRefundAdjustment(t *testing.T) {
	db := openReferralCommissionIntegrationDB(t)
	uc, paymentID, accountID := seedReferralCommissionIntegration(t, db)
	ctx := context.Background()

	if err := uc.CreateCommissionForPayment(ctx, paymentID); err != nil {
		t.Fatalf("CreateCommissionForPayment: %v", err)
	}
	commissions, _, err := uc.ListCommissions(ctx, dto.CommissionListParams{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("ListCommissions: %v", err)
	}
	if len(commissions) != 1 {
		t.Fatalf("commissions len = %d", len(commissions))
	}
	closeCommission := commissions[0]
	if closeCommission.CommissionType != string(refModels.CommissionTypeClose) || closeCommission.CommissionBps != 2500 || closeCommission.CommissionAmountIDR != 25000 {
		t.Fatalf("close commission = %#v", closeCommission)
	}

	if err := uc.ApproveCommission(ctx, closeCommission.ID, "admin-1"); err != nil {
		t.Fatalf("ApproveCommission: %v", err)
	}
	payout, err := uc.CreatePayout(ctx, &dto.CreatePayoutRequest{SalesReferralAccountID: accountID, CommissionIDs: []string{closeCommission.ID}, PaidAt: time.Now()}, "admin-1")
	if err != nil {
		t.Fatalf("CreatePayout: %v", err)
	}
	if payout.TotalAmountIDR != 25000 {
		t.Fatalf("payout total = %d", payout.TotalAmountIDR)
	}

	if err := uc.CreateNegativeAdjustmentForPayment(ctx, paymentID, "REFUNDED"); err != nil {
		t.Fatalf("CreateNegativeAdjustmentForPayment: %v", err)
	}
	commissions, _, err = uc.ListCommissions(ctx, dto.CommissionListParams{Page: 1, PerPage: 10, CommissionType: string(refModels.CommissionTypeAdjustment)})
	if err != nil {
		t.Fatalf("ListCommissions adjustment: %v", err)
	}
	if len(commissions) != 1 {
		t.Fatalf("adjustment len = %d", len(commissions))
	}
	if commissions[0].CommissionAmountIDR != -25000 || commissions[0].SourceNetAmountIDR != -100000 || commissions[0].Status != string(refModels.CommissionStatusPending) {
		t.Fatalf("adjustment = %#v", commissions[0])
	}
}

func strPtr(v string) *string { return &v }
