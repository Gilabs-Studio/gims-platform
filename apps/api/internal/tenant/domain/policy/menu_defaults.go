package policy

import "strings"

type PlanEntitlementRow struct {
	PermissionCode string
	MenuURL        string
}

var posGrowthDefaultMenuURLs = []string{
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
	"/sales",
	"/sales/orders",
	"/sales/invoices",
	"/sales/payments",
	"/purchase",
	"/purchase/purchase-orders",
	"/purchase/supplier-invoices",
	"/purchase/payments",
	"/stock",
	"/stock/inventory",
	"/stock/movements",
	"/finance",
	"/finance/journals/purchase",
	"/finance/journals/sales",
	"/finance/bank-accounts",
	"/finance/settings/fiscal-years",
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
}

func NormalizePlanSlug(planSlug string) string {
	normalized := strings.ToLower(strings.TrimSpace(planSlug))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	normalized = strings.ReplaceAll(normalized, " ", "_")

	switch normalized {
	case "pos", "pos_modular":
		return "pos_growth"
	case "erp", "erp_modular":
		return "erp_pro"
	case "crm", "crm_modular":
		return "crm_growth"
	case "hr", "hr_modular":
		return "hr_growth"
	default:
		return normalized
	}
}

func DefaultPlanEntitlementRows(planSlug string) []PlanEntitlementRow {
	switch NormalizePlanSlug(planSlug) {
	case "pos_growth":
		rows := make([]PlanEntitlementRow, 0, len(posGrowthDefaultMenuURLs))
		for _, menuURL := range posGrowthDefaultMenuURLs {
			rows = append(rows, PlanEntitlementRow{MenuURL: menuURL})
		}
		return rows
	default:
		return nil
	}
}
