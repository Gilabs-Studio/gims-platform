package seeders

import (
	"log"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
	"gorm.io/gorm/clause"
)

const posPaymentManagePermission = "pos.payment.manage"

var masterDataMenuPrefix = strings.Join([]string{"/master", "data"}, "-")

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
		"pos_growth":     {"pos", "purchase", "core", "inventory", "finance", "sales"}, // POS Growth includes purchase, sales, finance, and inventory menus
		"erp_pro":        {"purchase", "inventory", "finance", "sales", "core"},
		"crm_growth":     {"crm", "core"},
		"hr_growth":      {"hr", "core"},
		"growth_suite":   {"pos", "purchase", "inventory", "finance", "sales", "crm", "core"},
		"ultimate_suite": {"pos", "purchase", "inventory", "finance", "sales", "crm", "hr", "core"},
		"enterprise":     {"pos", "purchase", "inventory", "finance", "sales", "crm", "hr", "core"},
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

	// Seed granular permission/menu policy entitlements per plan.
	// pos_growth uses explicit exact menu URLs per product definition.
	posExactMenuURLs := []string{
		"/dashboard",
		"/pos",
		"/pos/fb/floor-layout",
		"/pos/fb/terminal",
		"/pos/feedback",
		"/pos/feedback/response",
		"/pos/feedback/forms",
		"/pos/loyalty",
		"/pos/loyalty/config",
		"/pos/loyalty/members",
		"/sales/orders",
		"/sales/invoices",
		"/sales/payments",
		"/purchase/purchase-orders",
		"/purchase/supplier-invoices",
		"/purchase/payments",
		"/stock/inventory",
		"/stock/movements",
		"/finance/journals/purchase",
		"/finance/journals/sales",
		"/finance/bank-accounts",
		"/finance/settings/fiscal-years",
	}
	masterDataExactMenuURLs := []string{
		masterDataMenuPrefix,
		masterDataMenuPrefix + "/geographic",
		masterDataMenuPrefix + "/organization",
		masterDataMenuPrefix + "/users",
		masterDataMenuPrefix + "/employees",
		masterDataMenuPrefix + "/company",
		masterDataMenuPrefix + "/outlet",
		masterDataMenuPrefix + "/warehouses",
		masterDataMenuPrefix + "/divisions",
		masterDataMenuPrefix + "/job-positions",
		masterDataMenuPrefix + "/business-units",
		masterDataMenuPrefix + "/business-types",
		masterDataMenuPrefix + "/areas",
		masterDataMenuPrefix + "/supplier",
		masterDataMenuPrefix + "/suppliers",
		masterDataMenuPrefix + "/supplier-types",
		masterDataMenuPrefix + "/customer",
		masterDataMenuPrefix + "/customers",
		masterDataMenuPrefix + "/customer-types",
		masterDataMenuPrefix + "/product",
		masterDataMenuPrefix + "/products",
		masterDataMenuPrefix + "/product-categories",
		masterDataMenuPrefix + "/product-brands",
		masterDataMenuPrefix + "/product-segments",
		masterDataMenuPrefix + "/product-types",
		masterDataMenuPrefix + "/packaging",
		masterDataMenuPrefix + "/uom",
		masterDataMenuPrefix + "/procurement-types",
		masterDataMenuPrefix + "/payment-courier",
		masterDataMenuPrefix + "/currencies",
		masterDataMenuPrefix + "/banks",
		masterDataMenuPrefix + "/payment-terms",
		masterDataMenuPrefix + "/courier-agencies",
		masterDataMenuPrefix + "/so-sources",
		masterDataMenuPrefix + "/leave-types",
	}
	erpMenuPrefixes := []string{"/purchase", "/sales", "/stock", "/finance", masterDataMenuPrefix}
	crmMenuPrefixes := []string{"/crm", masterDataMenuPrefix}
	hrMenuPrefixes := []string{"/hrd", masterDataMenuPrefix}
	growthSuitePrefixes := []string{"/pos", "/purchase", "/sales", "/stock", "/finance", "/crm", masterDataMenuPrefix}
	ultimateSuitePrefixes := []string{"/"}

	planPermissionPolicies := map[string]struct {
		menuURLs        []string
		menuPrefixes    []string
		permissionCodes []string
	}{
		"pos_growth": {
			menuURLs:        append(posExactMenuURLs, masterDataExactMenuURLs...),
			menuPrefixes:    []string{masterDataMenuPrefix},
			permissionCodes: []string{posPaymentManagePermission},
		},
		"erp_pro": {
			menuURLs:        []string{},
			menuPrefixes:    erpMenuPrefixes,
			permissionCodes: []string{},
		},
		"crm_growth": {
			menuURLs:        []string{},
			menuPrefixes:    crmMenuPrefixes,
			permissionCodes: []string{},
		},
		"hr_growth": {
			menuURLs:        []string{},
			menuPrefixes:    hrMenuPrefixes,
			permissionCodes: []string{},
		},
		"growth_suite": {
			menuURLs:        []string{},
			menuPrefixes:    growthSuitePrefixes,
			permissionCodes: []string{},
		},
		"ultimate_suite": {
			menuURLs:        []string{},
			menuPrefixes:    ultimateSuitePrefixes,
			permissionCodes: []string{},
		},
		"enterprise": {
			menuURLs:        []string{},
			menuPrefixes:    ultimateSuitePrefixes,
			permissionCodes: []string{},
		},
	}

	normalizeMenuRules := func(values []string) []string {
		seen := make(map[string]struct{}, len(values))
		result := make([]string, 0, len(values))
		for _, raw := range values {
			value := strings.ToLower(strings.TrimSpace(raw))
			if value == "" {
				continue
			}
			if !strings.HasPrefix(value, "/") {
				value = "/" + value
			}
			if _, exists := seen[value]; exists {
				continue
			}
			seen[value] = struct{}{}
			result = append(result, value)
		}
		return result
	}

	for slug, policy := range planPermissionPolicies {
		if err := db.Where("plan_slug = ?", slug).Delete(&tenantModels.PlanPermissionEntitlement{}).Error; err != nil {
			log.Printf("Warning: failed to clear permission entitlements for %s: %v", slug, err)
		}

		mergedURLs := normalizeMenuRules(append(policy.menuURLs, policy.menuPrefixes...))
		for _, menuURL := range mergedURLs {
			entry := tenantModels.PlanPermissionEntitlement{
				PlanSlug:       slug,
				PermissionCode: "",
				MenuURL:        menuURL,
				IsEnabled:      true,
			}
			if err := db.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "plan_slug"}, {Name: "permission_code"}, {Name: "menu_url"}},
				DoUpdates: clause.AssignmentColumns([]string{"is_enabled", "updated_at"}),
			}).Create(&entry).Error; err != nil {
				log.Printf("Warning: failed to seed menu entitlement %s/%s: %v", slug, menuURL, err)
			}
		}

		for _, permissionCode := range policy.permissionCodes {
			entry := tenantModels.PlanPermissionEntitlement{
				PlanSlug:       slug,
				PermissionCode: permissionCode,
				MenuURL:        "",
				IsEnabled:      true,
			}
			if err := db.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "plan_slug"}, {Name: "permission_code"}, {Name: "menu_url"}},
				DoUpdates: clause.AssignmentColumns([]string{"is_enabled", "updated_at"}),
			}).Create(&entry).Error; err != nil {
				log.Printf("Warning: failed to seed permission entitlement %s/%s: %v", slug, permissionCode, err)
			}
		}
	}

	log.Printf("Seeded %d subscription plans with entitlements.", len(plans))
	return nil
}
