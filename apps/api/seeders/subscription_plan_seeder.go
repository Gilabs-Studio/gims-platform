package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
	"gorm.io/gorm/clause"
)

// SeedSubscriptionPlans upserts all subscription plan configs and their module entitlements.
// Prices are in IDR per user per month. Yearly prices are the full-year charge with a 10% discount
// pre-applied (i.e., monthly * 12 * 0.9).
func SeedSubscriptionPlans() error {
	log.Println("Seeding subscription plans...")
	db := database.DB

	plans := []tenantModels.SubscriptionPlanConfig{
		// ── Modular plans ─────────────────────────────────────────────────────
		{
			Slug:            "pos_growth",
			Name:            "POS Modular",
			Category:        "pos",
			Description:     "Multi-outlet cashier with loyalty and advanced reports.",
			BillingType:     tenantModels.BillingTypePerUser,
			PriceMonthlyIDR: 199_000,
			PriceYearlyIDR:  2_149_200, // 199000 * 12 * 0.9
			MinUsers:        1,
			MaxUsers:        500,
			IsActive:        true,
			IsHighlighted:   false,
			SortOrder:       10,
			Features: tenantModels.PlanFeatureList{
				"Multi-outlet cashier",
				"Loyalty programs",
				"Advanced sales reports",
			},
		},
		{
			Slug:            "erp_pro",
			Name:            "ERP Modular",
			Category:        "erp",
			Description:     "Purchase, sales, finance, and inventory operations.",
			BillingType:     tenantModels.BillingTypePerUser,
			PriceMonthlyIDR: 399_000,
			PriceYearlyIDR:  4_309_200, // 399000 * 12 * 0.9
			MinUsers:        1,
			MaxUsers:        500,
			IsActive:        true,
			IsHighlighted:   false,
			SortOrder:       20,
			Features: tenantModels.PlanFeatureList{
				"Purchase and sales",
				"Finance and accounting",
				"Inventory operations",
			},
		},
		{
			Slug:            "crm_growth",
			Name:            "CRM Modular",
			Category:        "crm",
			Description:     "Pipeline automation, custom fields, and activity timeline.",
			BillingType:     tenantModels.BillingTypePerUser,
			PriceMonthlyIDR: 149_000,
			PriceYearlyIDR:  1_609_200, // 149000 * 12 * 0.9
			MinUsers:        1,
			MaxUsers:        500,
			IsActive:        true,
			IsHighlighted:   false,
			SortOrder:       30,
			Features: tenantModels.PlanFeatureList{
				"Pipeline automation",
				"Custom fields",
				"Customer activity timeline",
			},
		},
		{
			Slug:            "hr_growth",
			Name:            "HR Modular",
			Category:        "hr",
			Description:     "Payroll processing, attendance, and performance reviews.",
			BillingType:     tenantModels.BillingTypePerUser,
			PriceMonthlyIDR: 79_000,
			PriceYearlyIDR:  853_200, // 79000 * 12 * 0.9
			MinUsers:        1,
			MaxUsers:        500,
			IsActive:        true,
			IsHighlighted:   false,
			SortOrder:       40,
			Features: tenantModels.PlanFeatureList{
				"Payroll processing",
				"Attendance tracking",
				"Performance reviews",
			},
		},
		// ── Bundle plans ──────────────────────────────────────────────────────
		{
			Slug:            "growth_suite",
			Name:            "Growth Suite",
			Category:        "bundle",
			Description:     "POS · ERP · CRM",
			BillingType:     tenantModels.BillingTypePerUser,
			PriceMonthlyIDR: 149_000,
			PriceYearlyIDR:  1_609_200, // 149000 * 12 * 0.9
			MinUsers:        1,
			MaxUsers:        500,
			IsActive:        true,
			IsHighlighted:   false,
			SortOrder:       1,
			Features: tenantModels.PlanFeatureList{
				"Point of Sale",
				"ERP (Purchase, Sales, Finance)",
				"CRM",
				"Unified dashboard",
				"Cross-module reporting",
			},
		},
		{
			Slug:            "ultimate_suite",
			Name:            "Ultimate Suite",
			Category:        "bundle",
			Description:     "All modules included",
			BillingType:     tenantModels.BillingTypePerUser,
			PriceMonthlyIDR: 175_000,
			PriceYearlyIDR:  1_890_000, // 175000 * 12 * 0.9
			MinUsers:        1,
			MaxUsers:        500,
			IsActive:        true,
			IsHighlighted:   true,
			SortOrder:       2,
			Features: tenantModels.PlanFeatureList{
				"Point of Sale",
				"ERP (Full suite)",
				"CRM",
				"HR & Payroll",
				"All integrations",
				"Priority support",
				"API access",
				"Custom onboarding",
			},
		},
	}

	for i := range plans {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "slug"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "category", "description", "billing_type", "price_monthly_idr", "price_yearly_idr", "min_users", "max_users", "is_highlighted", "sort_order", "features", "updated_at"}),
		}).Create(&plans[i]).Error; err != nil {
			log.Printf("Error seeding plan %s: %v", plans[i].Slug, err)
			return err
		}
	}

	// Seed module entitlements per plan.
	entitlements := map[string][]string{
		"pos_growth":     {"pos", "core", "inventory", "finance", "sales"}, // POS requires stock, finance (cash), sales (receipt)
		"erp_pro":        {"purchase", "inventory", "finance", "sales", "core"},
		"crm_growth":     {"crm", "core"},
		"hr_growth":      {"hr", "core"},
		"growth_suite":   {"pos", "purchase", "inventory", "finance", "sales", "crm", "core"},
		"ultimate_suite": {"pos", "purchase", "inventory", "finance", "sales", "crm", "hr", "core"},
	}

	for slug, modules := range entitlements {
		// Delete existing entitlements for this plan.
		if err := db.Where("plan_slug = ?", slug).Delete(&tenantModels.PlanModuleEntitlement{}).Error; err != nil {
			log.Printf("Warning: failed to clear entitlements for %s: %v", slug, err)
		}
		for _, moduleSlug := range modules {
			ent := tenantModels.PlanModuleEntitlement{
				PlanSlug:   slug,
				ModuleSlug: moduleSlug,
				IsEnabled:  true,
			}
			if err := db.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "plan_slug"}, {Name: "module_slug"}},
				DoUpdates: clause.AssignmentColumns([]string{"is_enabled", "updated_at"}),
			}).Create(&ent).Error; err != nil {
				log.Printf("Warning: failed to seed entitlement %s/%s: %v", slug, moduleSlug, err)
			}
		}
	}

	log.Printf("Seeded %d subscription plans with entitlements.", len(plans))
	return nil
}
