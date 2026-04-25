package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
	"gorm.io/gorm/clause"
)

// Seeder constants for coupons and subscriptions — UUIDs are hex-only (PostgreSQL requirement)
const (
	// Coupon: granted to internal team for development testing (lifetime access)
	DevCouponID   = "c0000001-0000-0000-0000-000000000001"
	DevCouponCode = "GIMSDEV2026"

	// Coupon: trial coupon for first production registrations (30-day POS Growth plan)
	TrialCouponID   = "c0000002-0000-0000-0000-000000000002"
	TrialCouponCode = "GIMSTRIAL30"

	// Coupon: paid-plan discount for POS Growth registrations.
	POSDiscountCouponID   = "c0000003-0000-0000-0000-000000000003"
	POSDiscountCouponCode = "POSSAVE100"

	// Subscription IDs for pre-seeded tenants
	Tenant1SubscriptionID = "d0000001-0000-0000-0000-000000000001"
	Tenant2SubscriptionID = "d0000002-0000-0000-0000-000000000002"
)

// SeedCoupons creates the initial coupon set needed for development and trial production.
func SeedCoupons() error {
	log.Println("Seeding coupons...")

	coupons := []tenantModels.Coupon{
		{
			ID:           DevCouponID,
			Code:         DevCouponCode,
			Description:  "Internal dev coupon — full access, no expiry, multi-use",
			CouponType:   tenantModels.CouponTypeFullAccess,
			DurationDays: 36500, // ~100 years effective lifetime
			MaxUses:      9999,
			IsActive:     true,
			ExpiresAt:    nil,
			CreatedBy:    SystemAdminEmail,
		},
		{
			ID:             TrialCouponID,
			Code:           TrialCouponCode,
			Description:    "Trial coupon — 30-day POS Growth plan access for first production launch",
			CouponType:     tenantModels.CouponTypePOSOnly,
			DiscountType:   tenantModels.CouponDiscountTrial,
			Scope:          tenantModels.CouponScopeTierSpecific,
			TargetPlanSlug: func() *string { s := "pos_growth"; return &s }(),
			DurationDays:   30,
			MaxUses:        500,
			IsActive:       true,
			ExpiresAt:      nil,
			CreatedBy:      SystemAdminEmail,
		},
		{
			ID:                     POSDiscountCouponID,
			Code:                   POSDiscountCouponCode,
			Description:            "POS package coupon — IDR 100.000/month for up to 5 users, then normal per-user price",
			CouponType:             tenantModels.CouponTypePOSOnly,
			DiscountType:           tenantModels.CouponDiscountAmount,
			DiscountValue:          0,
			Scope:                  tenantModels.CouponScopeTierSpecific,
			TargetPlanSlug:         func() *string { s := "pos_growth"; return &s }(),
			MaxUserCount:           5,
			LockUserCount:          true,
			PackagePriceMonthlyIDR: 100_000,
			PackagePriceYearlyIDR:  1_080_000,
			DurationDays:           30,
			MaxUses:                500,
			IsActive:               true,
			ExpiresAt:              nil,
			CreatedBy:              SystemAdminEmail,
		},
	}

	for _, c := range coupons {
		coupon := c
		result := database.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&coupon)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected > 0 {
			log.Printf("Created coupon: %s (%s)", coupon.Code, coupon.Description)
		}
	}

	return nil
}

// SeedSubscriptions creates subscription records for the pre-seeded tenants.
//
//   - Tenant 1 (default / GiLabs dev): lifetime subscription — no expiry
//   - Tenant 2 (empty test tenant): 30-day monthly trial subscription
func SeedSubscriptions() error {
	log.Println("Seeding tenant subscriptions...")

	now := time.Now().UTC()
	tenant2Expires := now.AddDate(0, 1, 0) // +1 month

	devCouponID := DevCouponID
	trialCouponID := TrialCouponID

	subscriptions := []tenantModels.TenantSubscription{
		{
			ID:            Tenant1SubscriptionID,
			TenantID:      DefaultTenantID,
			Plan:          tenantModels.PlanUltimateSuite,
			BillingPeriod: tenantModels.BillingLifetime,
			Status:        tenantModels.SubscriptionActive,
			StartsAt:      now,
			ExpiresAt:     nil, // lifetime — no expiry
			CouponID:      &devCouponID,
			Notes:         "admin@example.com — Ultimate Suite, lifetime subscription",
		},
		{
			ID:            Tenant2SubscriptionID,
			TenantID:      Tenant2ID,
			Plan:          tenantModels.PlanPOSGrowth,
			BillingPeriod: tenantModels.BillingMonthly,
			Status:        tenantModels.SubscriptionTrial,
			StartsAt:      now,
			ExpiresAt:     &tenant2Expires,
			CouponID:      &trialCouponID,
			Notes:         "Tenant 2 trial — POS full plan (pos_growth) via GIMSTRIAL30",
		},
	}

	for _, s := range subscriptions {
		sub := s
		result := database.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&sub)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected > 0 {
			log.Printf("Created subscription for tenant %s: plan=%s billing=%s", sub.TenantID, sub.Plan, sub.BillingPeriod)
		}
	}

	return nil
}
