package seeders

import (
	"log"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	roleModels "github.com/gilabs/gims/api/internal/role/data/models"
	tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
	"gorm.io/gorm"
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
			Slug:                  "pos_growth",
			Name:                  "POS Modular",
			Category:              "pos",
			Description:           "Multi-outlet cashier with loyalty and advanced reports.",
			BillingType:           tenantModels.BillingTypePerUser,
			PriceMonthlyIDR:       79_000,
			PriceYearlyIDR:        853_200, // 79000 * 12 * 0.9
			OutletAddonMonthlyIDR: 500_000,
			OutletAddonYearlyIDR:  6_000_000,
			MinUsers:              1,
			MaxUsers:              500,
			IsActive:              true,
			IsHighlighted:         false,
			SortOrder:             10,
			Features: tenantModels.PlanFeatureList{
				"Multi-outlet cashier",
				"Loyalty programs",
				"Advanced sales reports",
			},
			RoleTemplates: tenantModels.RoleTemplateList{
				{Code: "tenant_owner", Name: "Owner", Description: "Main account owner role with full access."},
				{Code: "admin", Name: "Admin", Description: "Full access to manage the system."},
				{Code: "cashier", Name: "Cashier", Description: "Handles sales and payment transactions."},
				{Code: "outlet_manager", Name: "Outlet Manager", Description: "Manages outlet operations and staff."},
			},
		},
		{
			Slug:                  "erp_pro",
			Name:                  "ERP Modular",
			Category:              "erp",
			Description:           "Purchase, sales, finance, and inventory operations.",
			BillingType:           tenantModels.BillingTypePerUser,
			PriceMonthlyIDR:       109_000,
			PriceYearlyIDR:        1_177_200, // 109000 * 12 * 0.9
			OutletAddonMonthlyIDR: 500_000,
			OutletAddonYearlyIDR:  6_000_000,
			MinUsers:              1,
			MaxUsers:              500,
			IsActive:              true,
			IsHighlighted:         false,
			SortOrder:             20,
			Features: tenantModels.PlanFeatureList{
				"Purchase and sales",
				"Finance and accounting",
				"Inventory operations",
			},
			RoleTemplates: tenantModels.RoleTemplateList{
				{Code: "tenant_owner", Name: "Owner", Description: "Main account owner role with full access."},
				{Code: "admin", Name: "Admin", Description: "Full access to manage the system."},
				{Code: "finance", Name: "Finance", Description: "Manages finance, accounting, and payments."},
				{Code: "purchasing", Name: "Purchasing", Description: "Handles purchase orders and supplier invoices."},
				{Code: "warehouse", Name: "Warehouse", Description: "Manages inventory and stock movements."},
				{Code: "sales", Name: "Sales", Description: "Handles sales orders and customer invoices."},
			},
		},
		{
			Slug:                  "crm_growth",
			Name:                  "CRM Modular",
			Category:              "crm",
			Description:           "Pipeline automation, custom fields, and activity timeline.",
			BillingType:           tenantModels.BillingTypePerUser,
			PriceMonthlyIDR:       89_000,
			PriceYearlyIDR:        961_200, // 89000 * 12 * 0.9
			OutletAddonMonthlyIDR: 500_000,
			OutletAddonYearlyIDR:  6_000_000,
			MinUsers:              1,
			MaxUsers:              500,
			IsActive:              true,
			IsHighlighted:         false,
			SortOrder:             30,
			Features: tenantModels.PlanFeatureList{
				"Pipeline automation",
				"Custom fields",
				"Customer activity timeline",
			},
			RoleTemplates: tenantModels.RoleTemplateList{
				{Code: "tenant_owner", Name: "Owner", Description: "Main account owner role with full access."},
				{Code: "admin", Name: "Admin", Description: "Full access to manage the system."},
				{Code: "sales_manager", Name: "Sales Manager", Description: "Manages sales team, pipeline, and targets."},
				{Code: "sales", Name: "Sales", Description: "Handles leads, pipeline, and customer activities."},
			},
		},
		{
			Slug:                  "hr_growth",
			Name:                  "HR Modular",
			Category:              "hr",
			Description:           "Payroll processing, attendance, and performance reviews.",
			BillingType:           tenantModels.BillingTypePerUser,
			PriceMonthlyIDR:       89_000,
			PriceYearlyIDR:        961_200, // 89000 * 12 * 0.9
			OutletAddonMonthlyIDR: 500_000,
			OutletAddonYearlyIDR:  6_000_000,
			MinUsers:              1,
			MaxUsers:              500,
			IsActive:              true,
			IsHighlighted:         false,
			SortOrder:             40,
			Features: tenantModels.PlanFeatureList{
				"Payroll processing",
				"Attendance tracking",
				"Performance reviews",
			},
			RoleTemplates: tenantModels.RoleTemplateList{
				{Code: "tenant_owner", Name: "Owner", Description: "Main account owner role with full access."},
				{Code: "admin", Name: "Admin", Description: "Full access to manage the system."},
				{Code: "hr_manager", Name: "HR Manager", Description: "Manages HR operations, payroll, and reviews."},
				{Code: "hr_staff", Name: "HR Staff", Description: "Handles attendance, leave, and daily HR tasks."},
				{Code: "employee", Name: "Employee", Description: "Basic access for personal HR data and requests."},
			},
		},
		// ── Bundle plans ──────────────────────────────────────────────────────
		{
			Slug:                  "growth_suite",
			Name:                  "Growth Suite",
			Category:              "bundle",
			Description:           "POS · ERP · CRM",
			BillingType:           tenantModels.BillingTypePerUser,
			PriceMonthlyIDR:       125_000,
			PriceYearlyIDR:        1_350_000, // 125000 * 12 * 0.9
			OutletAddonMonthlyIDR: 500_000,
			OutletAddonYearlyIDR:  6_000_000,
			MinUsers:              1,
			MaxUsers:              500,
			IsActive:              true,
			IsHighlighted:         false,
			SortOrder:             1,
			Features: tenantModels.PlanFeatureList{
				"Point of Sale",
				"ERP (Purchase, Sales, Finance)",
				"CRM",
				"Unified dashboard",
				"Cross-module reporting",
			},
			RoleTemplates: tenantModels.RoleTemplateList{
				{Code: "tenant_owner", Name: "Owner", Description: "Main account owner role with full access."},
				{Code: "admin", Name: "Admin", Description: "Full access to manage the system."},
				{Code: "outlet_manager", Name: "Outlet Manager", Description: "Manages outlet operations and staff."},
				{Code: "cashier", Name: "Cashier", Description: "Handles sales and payment transactions."},
				{Code: "sales_manager", Name: "Sales Manager", Description: "Manages sales team, pipeline, and targets."},
				{Code: "sales", Name: "Sales", Description: "Handles leads, pipeline, and customer activities."},
				{Code: "finance", Name: "Finance", Description: "Manages finance, accounting, and payments."},
				{Code: "purchasing", Name: "Purchasing", Description: "Handles purchase orders and supplier invoices."},
				{Code: "warehouse", Name: "Warehouse", Description: "Manages inventory and stock movements."},
			},
		},
		{
			Slug:                  "ultimate_suite",
			Name:                  "Ultimate Suite",
			Category:              "bundle",
			Description:           "All modules included",
			BillingType:           tenantModels.BillingTypePerUser,
			PriceMonthlyIDR:       175_000,
			PriceYearlyIDR:        1_890_000, // 175000 * 12 * 0.9
			OutletAddonMonthlyIDR: 500_000,
			OutletAddonYearlyIDR:  6_000_000,
			MinUsers:              1,
			MaxUsers:              500,
			IsActive:              true,
			IsHighlighted:         true,
			SortOrder:             2,
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
			RoleTemplates: tenantModels.RoleTemplateList{
				{Code: "tenant_owner", Name: "Owner", Description: "Main account owner role with full access."},
				{Code: "admin", Name: "Admin", Description: "Full access to manage the system."},
				{Code: "outlet_manager", Name: "Outlet Manager", Description: "Manages outlet operations and staff."},
				{Code: "cashier", Name: "Cashier", Description: "Handles sales and payment transactions."},
				{Code: "sales_manager", Name: "Sales Manager", Description: "Manages sales team, pipeline, and targets."},
				{Code: "sales", Name: "Sales", Description: "Handles leads, pipeline, and customer activities."},
				{Code: "finance", Name: "Finance", Description: "Manages finance, accounting, and payments."},
				{Code: "purchasing", Name: "Purchasing", Description: "Handles purchase orders and supplier invoices."},
				{Code: "warehouse", Name: "Warehouse", Description: "Manages inventory and stock movements."},
				{Code: "hr_manager", Name: "HR Manager", Description: "Manages HR operations, payroll, and reviews."},
				{Code: "hr_staff", Name: "HR Staff", Description: "Handles attendance, leave, and daily HR tasks."},
				{Code: "employee", Name: "Employee", Description: "Basic access for personal HR data and requests."},
			},
		},
	}

	for i := range plans {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "slug"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "category", "description", "billing_type", "price_monthly_idr", "price_yearly_idr", "outlet_addon_monthly_idr", "outlet_addon_yearly_idr", "min_users", "max_users", "is_highlighted", "sort_order", "features", "role_templates", "updated_at"}),
		}).Create(&plans[i]).Error; err != nil {
			log.Printf("Error seeding plan %s: %v", plans[i].Slug, err)
			return err
		}
	}

	if err := syncTenantRolesFromPlanTemplates(db); err != nil {
		return err
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
		"/finance/accounting/coa",
		"/finance/journals/purchase",
		"/finance/journals/sales",
		"/finance/bank-accounts",
		"/finance/settings/accounting-mapping",
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
		"/master-data/contact-roles",
	}
	erpExactMenuURLs := []string{
		"/dashboard",
		"/sales",
		"/sales/quotations",
		"/sales/orders",
		"/sales/delivery-orders",
		"/sales/invoices",
		"/sales/customer-invoice-down-payments",
		"/sales/returns",
		"/sales/payments",
		"/sales/receivables-recap",
		"/purchase",
		"/purchase/purchase-requisitions",
		"/purchase/purchase-orders",
		"/purchase/goods-receipt",
		"/purchase/supplier-invoices",
		"/purchase/supplier-invoice-down-payments",
		"/purchase/returns",
		"/purchase/payments",
		"/purchase/payable-recap",
		"/stock",
		"/stock/inventory",
		"/stock/ledger",
		"/stock/movements",
		"/stock/opname",
		"/finance",
		"/finance/accounting/coa",
		"/finance/journals",
		"/finance/journals/sales",
		"/finance/journals/purchase",
		"/finance/journals/adjustment",
		"/finance/closing",
		"/finance/ar/aging-reports",
		"/finance/ap/non-trade-payables",
		"/finance/ap/aging-reports",
		"/finance/bank-accounts",
		"/finance/journals/cash-bank",
		"/finance/bank-transfer",
		"/finance/bank-reconciliation",
		"/finance/fixed-assets/assets",
		"/finance/fixed-assets/categories",
		"/finance/fixed-assets/locations",
		"/finance/fixed-assets/depreciation-schedule",
		"/finance/fixed-assets/disposal",
		"/finance/fixed-assets/revaluation",
		"/finance/reports/general-ledger",
		"/finance/reports/trial-balance",
		"/finance/reports/balance-sheet",
		"/finance/reports/profit-loss",
		"/finance/reports/cash-flow-statement",
		"/finance/settings/accounting-mapping",
		"/finance/settings/fiscal-years",
		"/finance/settings/tax-config",
		"/finance/settings/inventory",
		"/finance/settings/opening-balance",
		"/reports",
		"/reports/sales-overview",
		"/reports/product-analysis",
		"/reports/customer-research",
		"/reports/supplier-research",
	}
	crmExactMenuURLs := []string{
		"/dashboard",
		"/crm",
		"/crm/leads",
		"/crm/pipeline",
		"/crm/tasks",
		"/crm/visits",
		"/crm/area-mapping",
		"/crm/targets",
		"/crm/settings",
		"/crm/settings/pipeline-stages",
		"/crm/settings/lead-sources",
		"/crm/settings/lead-statuses",
		"/crm/settings/activity-types",
		"/travel/travel-planner",
		"/travel/visit-planner",
		"/reports",
		"/reports/sales-overview",
		"/reports/geo-performance",
		"/reports/customer-research",
	}
	hrExactMenuURLs := []string{
		"/dashboard",
		"/hrd",
		"/hrd/attendance",
		"/hrd/leave-requests",
		"/hrd/overtime",
		"/hrd/evaluation",
		"/hrd/recruitment",
		"/hrd/work-schedule",
		"/hrd/holidays",
	}
	masterDataOrgURLs := []string{
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
		"/master-data/contact-roles",
	}
	masterDataSupplyChainURLs := []string{
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
	}
	masterDataHRURLs := []string{
		masterDataMenuPrefix + "/leave-types",
	}
	allNavigationMenuURLs := []string{
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
		"/crm",
		"/crm/leads",
		"/crm/pipeline",
		"/crm/tasks",
		"/crm/visits",
		"/crm/area-mapping",
		"/crm/targets",
		"/crm/settings",
		"/crm/settings/pipeline-stages",
		"/crm/settings/lead-sources",
		"/crm/settings/lead-statuses",
		"/crm/settings/activity-types",
		"/travel/travel-planner",
		"/travel/visit-planner",
		"/sales",
		"/sales/quotations",
		"/sales/orders",
		"/sales/delivery-orders",
		"/sales/invoices",
		"/sales/customer-invoice-down-payments",
		"/sales/returns",
		"/sales/payments",
		"/sales/receivables-recap",
		"/purchase",
		"/purchase/purchase-requisitions",
		"/purchase/purchase-orders",
		"/purchase/goods-receipt",
		"/purchase/supplier-invoices",
		"/purchase/supplier-invoice-down-payments",
		"/purchase/returns",
		"/purchase/payments",
		"/purchase/payable-recap",
		"/stock",
		"/stock/inventory",
		"/stock/ledger",
		"/stock/movements",
		"/stock/opname",
		"/finance",
		"/finance/accounting/coa",
		"/finance/journals",
		"/finance/journals/sales",
		"/finance/journals/purchase",
		"/finance/journals/adjustment",
		"/finance/closing",
		"/finance/ar/aging-reports",
		"/finance/ap/non-trade-payables",
		"/finance/ap/aging-reports",
		"/finance/bank-accounts",
		"/finance/journals/cash-bank",
		"/finance/bank-transfer",
		"/finance/bank-reconciliation",
		"/finance/fixed-assets/assets",
		"/finance/fixed-assets/categories",
		"/finance/fixed-assets/locations",
		"/finance/fixed-assets/depreciation-schedule",
		"/finance/fixed-assets/disposal",
		"/finance/fixed-assets/revaluation",
		"/finance/reports/general-ledger",
		"/finance/reports/trial-balance",
		"/finance/reports/balance-sheet",
		"/finance/reports/profit-loss",
		"/finance/reports/cash-flow-statement",
		"/finance/settings/accounting-mapping",
		"/finance/settings/fiscal-years",
		"/finance/settings/tax-config",
		"/finance/settings/inventory",
		"/finance/settings/opening-balance",
		"/hrd",
		"/hrd/attendance",
		"/hrd/leave-requests",
		"/hrd/overtime",
		"/hrd/evaluation",
		"/hrd/recruitment",
		"/hrd/work-schedule",
		"/hrd/holidays",
		"/reports",
		"/reports/sales-overview",
		"/reports/product-analysis",
		"/reports/geo-performance",
		"/reports/customer-research",
		"/reports/supplier-research",
		"/master-data",
		"/master-data/geographic",
		"/master-data/organization",
		"/master-data/users",
		"/master-data/employees",
		"/master-data/company",
		"/master-data/outlet",
		"/master-data/warehouses",
		"/master-data/divisions",
		"/master-data/job-positions",
		"/master-data/business-units",
		"/master-data/business-types",
		"/master-data/areas",
		"/master-data/supplier",
		"/master-data/suppliers",
		"/master-data/supplier-types",
		"/master-data/customer",
		"/master-data/customers",
		"/master-data/customer-types",
		"/master-data/product",
		"/master-data/products",
		"/master-data/product-categories",
		"/master-data/product-brands",
		"/master-data/product-segments",
		"/master-data/product-types",
		"/master-data/packaging",
		"/master-data/uom",
		"/master-data/procurement-types",
		"/master-data/payment-courier",
		"/master-data/currencies",
		"/master-data/banks",
		"/master-data/payment-terms",
		"/master-data/courier-agencies",
		"/master-data/so-sources",
		"/master-data/leave-types",
		"/master-data/contact-roles",
		"/ai-assistant",
		"/ai-chatbot",
		"/ai-settings",
	}

	planPermissionPolicies := map[string]struct {
		menuURLs        []string
		menuPrefixes    []string
		permissionCodes []string
	}{
		"pos_growth": {
			menuURLs:     append(posExactMenuURLs, masterDataExactMenuURLs...),
			menuPrefixes: []string{},
			permissionCodes: []string{
				posPaymentManagePermission,
				// Chart of Accounts (full CRUD)
				"coa.read",
				"coa.create",
				"coa.update",
				"coa.delete",
				// Sales Journal (read-only)
				"sales_journal.read",
				// Purchase Journal (read-only)
				"purchase_journal.read",
				// Fiscal Years (full CRUD)
				"fiscal_year.read",
				"fiscal_year.write",
				// Accounting Mapping (read-only)
				"account_mappings.read",
			},
		},
		"erp_pro": {
			menuURLs:        append(erpExactMenuURLs, append(masterDataOrgURLs, masterDataSupplyChainURLs...)...),
			menuPrefixes:    []string{},
			permissionCodes: []string{},
		},
		"crm_growth": {
			menuURLs: append(crmExactMenuURLs, append(masterDataOrgURLs, []string{
				masterDataMenuPrefix + "/customer",
				masterDataMenuPrefix + "/customers",
				masterDataMenuPrefix + "/customer-types",
			}...)...),
			menuPrefixes:    []string{},
			permissionCodes: []string{},
		},
		"hr_growth": {
			menuURLs:        append(hrExactMenuURLs, append(masterDataOrgURLs, masterDataHRURLs...)...),
			menuPrefixes:    []string{},
			permissionCodes: []string{},
		},
		"growth_suite": {
			menuURLs: append(
				append(posExactMenuURLs, erpExactMenuURLs...),
				append(crmExactMenuURLs, append(masterDataOrgURLs, masterDataSupplyChainURLs...)...)...,
			),
			menuPrefixes:    []string{},
			permissionCodes: []string{posPaymentManagePermission},
		},
		"ultimate_suite": {
			menuURLs:        allNavigationMenuURLs,
			menuPrefixes:    []string{},
			permissionCodes: []string{},
		},
		"enterprise": {
			menuURLs:        allNavigationMenuURLs,
			menuPrefixes:    []string{},
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

func syncTenantRolesFromPlanTemplates(db *gorm.DB) error {
	var plans []tenantModels.SubscriptionPlanConfig
	if err := db.Find(&plans).Error; err != nil {
		return err
	}

	planTemplates := make(map[string]tenantModels.RoleTemplateList, len(plans))
	for _, plan := range plans {
		if len(plan.RoleTemplates) == 0 {
			continue
		}
		planTemplates[plan.Slug] = plan.RoleTemplates
	}

	if len(planTemplates) == 0 {
		return nil
	}

	type tenantRow struct {
		ID   string
		Plan string
	}

	var tenants []tenantRow
	if err := db.Table("tenants").Select("id, plan").Find(&tenants).Error; err != nil {
		return err
	}

	for _, tenant := range tenants {
		templates := planTemplates[strings.TrimSpace(strings.ToLower(tenant.Plan))]
		baseCodes := make([]string, 0, len(templates))
		for _, template := range templates {
			baseCode := strings.TrimSpace(strings.ToLower(template.Code))
			if baseCode == "" {
				continue
			}
			baseCodes = append(baseCodes, baseCode)
		}

		var tenantRoles []roleModels.Role
		if err := db.Where("tenant_id = ? AND deleted_at IS NULL", tenant.ID).Find(&tenantRoles).Error; err != nil {
			return err
		}

		for _, template := range templates {
			baseCode := strings.TrimSpace(strings.ToLower(template.Code))
			if baseCode == "" {
				continue
			}

			var role roleModels.Role
			found := false
			for _, candidate := range tenantRoles {
				if !tenantRoleMatchesTemplateCode(candidate.Code, baseCode, baseCodes) {
					continue
				}
				role = candidate
				found = true
				break
			}
			if !found {
				continue
			}

			updates := map[string]any{
				"name":        strings.TrimSpace(template.Name),
				"description": strings.TrimSpace(template.Description),
			}
			if baseCode == "tenant_owner" {
				updates["is_protected"] = true
			}

			if err := db.Model(&role).Updates(updates).Error; err != nil {
				log.Printf("Warning: failed to sync role template %s for tenant %s: %v", baseCode, tenant.ID, err)
			}
		}
	}

	return nil
}

func tenantRoleMatchesTemplateCode(roleCode, baseCode string, allBaseCodes []string) bool {
	normalizedRoleCode := strings.TrimSpace(strings.ToLower(roleCode))
	normalizedBaseCode := strings.TrimSpace(strings.ToLower(baseCode))
	if normalizedRoleCode == "" || normalizedBaseCode == "" {
		return false
	}
	if normalizedRoleCode == normalizedBaseCode {
		return true
	}
	prefix := normalizedBaseCode + "_"
	if !strings.HasPrefix(normalizedRoleCode, prefix) {
		return false
	}

	for _, otherBaseCode := range allBaseCodes {
		normalizedOtherBaseCode := strings.TrimSpace(strings.ToLower(otherBaseCode))
		if normalizedOtherBaseCode == "" || normalizedOtherBaseCode == normalizedBaseCode {
			continue
		}
		if strings.HasPrefix(normalizedOtherBaseCode, prefix) && strings.HasPrefix(normalizedRoleCode, normalizedOtherBaseCode+"_") {
			return false
		}
	}

	return true
}
