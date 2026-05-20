// k6/lib/endpoint-registry.js
// Declarative registry mapping every GIMS endpoint to module, tier, and threshold.
// Single source of truth — adding a new endpoint = one object in this file.

import { API_V1, TIER_THRESHOLDS } from "../config.js";

// ── Endpoint Definitions ─────────────────────────────────────────────────────
// Tier: "crud" (single-entity, p95<200ms) | "list" (paginated collection, p95<500ms) | "workflow" (multi-step, p95<1000ms)

const ENDPOINTS = [
	// ── Auth (Public) ─────────────────────────────────────────────────────────
	{ name: "auth:csrf", method: "GET", path: "/auth/csrf", module: "auth", tier: "crud", authenticated: false },
	{ name: "auth:login", method: "POST", path: "/auth/login", module: "auth", tier: "crud", authenticated: false },
	{ name: "auth:refresh", method: "POST", path: "/auth/refresh-token", module: "auth", tier: "crud", authenticated: false },

	// ── Master Data ───────────────────────────────────────────────────────
	{ name: "master:users:list", method: "GET", path: "/users", module: "master-data", tier: "list", authenticated: true },
	{ name: "master:roles:list", method: "GET", path: "/roles", module: "master-data", tier: "list", authenticated: true },
	{ name: "master:products:list", method: "GET", path: "/product/products", module: "master-data", tier: "list", authenticated: true },
	{ name: "master:products:create", method: "POST", path: "/product/products", module: "master-data", tier: "crud", authenticated: true },
	{ name: "master:customers:list", method: "GET", path: "/customer/customers", module: "master-data", tier: "list", authenticated: true },
	{ name: "master:suppliers:list", method: "GET", path: "/supplier/suppliers", module: "master-data", tier: "list", authenticated: true },
	{ name: "master:warehouses:list", method: "GET", path: "/warehouse/warehouses", module: "master-data", tier: "list", authenticated: true },
	{ name: "master:currencies:list", method: "GET", path: "/master-data/currencies", module: "master-data", tier: "list", authenticated: true },

	// ── Core ─────────────────────────────────────────────────────────────────
	{ name: "core:payment-terms:list", method: "GET", path: "/master-data/payment-terms", module: "core", tier: "list", authenticated: true },
	{ name: "core:bank-accounts:list", method: "GET", path: "/finance/bank-accounts", module: "core", tier: "list", authenticated: true },
	{ name: "core:leave-types:list", method: "GET", path: "/master-data/leave-types", module: "core", tier: "list", authenticated: true },
	{ name: "core:courier-agencies:list", method: "GET", path: "/master-data/courier-agencies", module: "core", tier: "list", authenticated: true },
	{ name: "core:so-sources:list", method: "GET", path: "/master-data/so-sources", module: "core", tier: "list", authenticated: true },

	// ── Organization ─────────────────────────────────────────────────────────
	{ name: "org:companies:list", method: "GET", path: "/organization/companies", module: "organization", tier: "list", authenticated: true },
	{ name: "org:business-units:list", method: "GET", path: "/organization/business-units", module: "organization", tier: "list", authenticated: true },
	{ name: "org:divisions:list", method: "GET", path: "/organization/divisions", module: "organization", tier: "list", authenticated: true },
	{ name: "org:outlets:list", method: "GET", path: "/organization/outlets", module: "organization", tier: "list", authenticated: true },
	{ name: "org:areas:list", method: "GET", path: "/organization/areas", module: "organization", tier: "list", authenticated: true },
	{ name: "org:employees:list", method: "GET", path: "/organization/employees", module: "organization", tier: "list", authenticated: true },
	{ name: "org:job-positions:list", method: "GET", path: "/organization/job-positions", module: "organization", tier: "list", authenticated: true },
	{ name: "org:business-types:list", method: "GET", path: "/organization/business-types", module: "organization", tier: "list", authenticated: true },

	// ── Sales ─────────────────────────────────────────────────────────────
	{ name: "sales:quotations:list", method: "GET", path: "/sales/sales-quotations", module: "sales", tier: "list", authenticated: true },
	{ name: "sales:quotations:create", method: "POST", path: "/sales/sales-quotations", module: "sales", tier: "crud", authenticated: true },
	{ name: "sales:orders:list", method: "GET", path: "/sales/sales-orders", module: "sales", tier: "list", authenticated: true },
	{ name: "sales:orders:create", method: "POST", path: "/sales/sales-orders", module: "sales", tier: "crud", authenticated: true },
	{ name: "sales:delivery-orders:list", method: "GET", path: "/sales/delivery-orders", module: "sales", tier: "list", authenticated: true },
	{ name: "sales:invoices:list", method: "GET", path: "/sales/customer-invoices", module: "sales", tier: "list", authenticated: true },
	{ name: "sales:payments:list", method: "GET", path: "/sales/payments", module: "sales", tier: "list", authenticated: true },
	{ name: "sales:returns:list", method: "GET", path: "/sales/returns", module: "sales", tier: "list", authenticated: true },
	{ name: "sales:targets:list", method: "GET", path: "/sales/sales-targets", module: "sales", tier: "list", authenticated: true },
	{ name: "sales:visits:list", method: "GET", path: "/sales/sales-visits", module: "sales", tier: "list", authenticated: true },
	{ name: "sales:invoice-dp:list", method: "GET", path: "/sales/customer-invoice-down-payments", module: "sales", tier: "list", authenticated: true },
	{ name: "sales:receivables-recap:list", method: "GET", path: "/sales/receivables-recap", module: "sales", tier: "list", authenticated: true },

	// ── Purchase ──────────────────────────────────────────────────────────
	{ name: "purchase:orders:list", method: "GET", path: "/purchase/purchase-orders", module: "purchase", tier: "list", authenticated: true },
	{ name: "purchase:orders:create", method: "POST", path: "/purchase/purchase-orders", module: "purchase", tier: "crud", authenticated: true },
	{ name: "purchase:goods-receipt:list", method: "GET", path: "/purchase/goods-receipt", module: "purchase", tier: "list", authenticated: true },
	{ name: "purchase:requisitions:list", method: "GET", path: "/purchase/purchase-requisitions", module: "purchase", tier: "list", authenticated: true },
	{ name: "purchase:returns:list", method: "GET", path: "/purchase/returns", module: "purchase", tier: "list", authenticated: true },
	{ name: "purchase:payments:list", method: "GET", path: "/purchase/payments", module: "purchase", tier: "list", authenticated: true },
	{ name: "purchase:supplier-invoices:list", method: "GET", path: "/purchase/supplier-invoices", module: "purchase", tier: "list", authenticated: true },
	{ name: "purchase:supplier-invoice-dp:list", method: "GET", path: "/purchase/supplier-invoice-down-payments", module: "purchase", tier: "list", authenticated: true },
	{ name: "purchase:payable-recap:list", method: "GET", path: "/purchase/payable-recap", module: "purchase", tier: "list", authenticated: true },

	// ── Finance ───────────────────────────────────────────────────────────
	{ name: "finance:coa:list", method: "GET", path: "/finance/chart-of-accounts", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:journals:list", method: "GET", path: "/finance/journal-entries", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:journals:create", method: "POST", path: "/finance/journal-entries", module: "finance", tier: "crud", authenticated: true },
	{ name: "finance:budget:list", method: "GET", path: "/finance/budget", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:assets:list", method: "GET", path: "/finance/assets", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:asset-categories:list", method: "GET", path: "/finance/asset-categories", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:asset-locations:list", method: "GET", path: "/finance/asset-locations", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:bank-reconciliations:list", method: "GET", path: "/finance/bank-reconciliations", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:bank-transfers:list", method: "GET", path: "/finance/bank-transfers", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:cash-bank:list", method: "GET", path: "/finance/cash-bank", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:cash-bank-transactions:list", method: "GET", path: "/finance/cash-bank-transactions", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:reports:list", method: "GET", path: "/finance/reports", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:settings:get", method: "GET", path: "/finance/settings", module: "finance", tier: "crud", authenticated: true },
	{ name: "finance:closing:list", method: "GET", path: "/finance/closing", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:fiscal-years:list", method: "GET", path: "/finance/fiscal-years", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:inventory-settings:get", method: "GET", path: "/finance/inventory-settings", module: "finance", tier: "crud", authenticated: true },
	{ name: "finance:journal-lines:list", method: "GET", path: "/finance/journal-lines", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:non-trade-payables:list", method: "GET", path: "/finance/non-trade-payables", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:opening-balance:list", method: "GET", path: "/finance/opening-balance", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:payments:list", method: "GET", path: "/finance/payments", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:account-mappings:list", method: "GET", path: "/finance/settings/account-mappings", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:taxes:list", method: "GET", path: "/finance/taxes", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:tax-invoices:list", method: "GET", path: "/finance/tax-invoices", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:up-country-cost:list", method: "GET", path: "/finance/up-country-cost", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:arap-reconciliation:list", method: "GET", path: "/finance/reconciliation/arap", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:depreciation:list", method: "GET", path: "/finance/depreciation", module: "finance", tier: "list", authenticated: true },

	// ── HRD ───────────────────────────────────────────────────────────────
	{ name: "hrd:attendance:list", method: "GET", path: "/hrd/attendance", module: "hrd", tier: "list", authenticated: true },
	{ name: "hrd:attendance:clock-in", method: "POST", path: "/hrd/attendance/clock-in", module: "hrd", tier: "crud", authenticated: true },
	{ name: "hrd:leaves:list", method: "GET", path: "/hrd/leave-requests", module: "hrd", tier: "list", authenticated: true },
	{ name: "hrd:employees:list", method: "GET", path: "/organization/employees", module: "hrd", tier: "list", authenticated: true },
	{ name: "hrd:work-schedules:list", method: "GET", path: "/hrd/work-schedules", module: "hrd", tier: "list", authenticated: true },
	{ name: "hrd:holidays:list", method: "GET", path: "/hrd/holidays", module: "hrd", tier: "list", authenticated: true },
	{ name: "hrd:overtime:list", method: "GET", path: "/hrd/overtime", module: "hrd", tier: "list", authenticated: true },
	{ name: "hrd:evaluations:list", method: "GET", path: "/hrd/employee-evaluations", module: "hrd", tier: "list", authenticated: true },
	{ name: "hrd:evaluation-criteria:list", method: "GET", path: "/hrd/evaluation-criteria", module: "hrd", tier: "list", authenticated: true },
	{ name: "hrd:evaluation-groups:list", method: "GET", path: "/hrd/evaluation-groups", module: "hrd", tier: "list", authenticated: true },
	{ name: "hrd:recruitment:list", method: "GET", path: "/hrd/recruitment-requests", module: "hrd", tier: "list", authenticated: true },
	{ name: "hrd:applicants:list", method: "GET", path: "/hrd/applicants", module: "hrd", tier: "list", authenticated: true },
	{ name: "hrd:salary:list", method: "GET", path: "/hrd/salary", module: "hrd", tier: "list", authenticated: true },

	// ── Inventory ─────────────────────────────────────────────────────────
	{ name: "inventory:stock:list", method: "GET", path: "/stock/inventory", module: "inventory", tier: "list", authenticated: true },
	{ name: "inventory:stock:metrics", method: "GET", path: "/stock/inventory/metrics", module: "inventory", tier: "crud", authenticated: true },
	{ name: "inventory:movements:list", method: "GET", path: "/stock/movements", module: "inventory", tier: "list", authenticated: true },

	// ── Product ──────────────────────────────────────────────────────────────
	{ name: "product:categories:list", method: "GET", path: "/product/product-categories", module: "product", tier: "list", authenticated: true },
	{ name: "product:brands:list", method: "GET", path: "/product/product-brands", module: "product", tier: "list", authenticated: true },
	{ name: "product:segments:list", method: "GET", path: "/product/product-segments", module: "product", tier: "list", authenticated: true },
	{ name: "product:types:list", method: "GET", path: "/product/product-types", module: "product", tier: "list", authenticated: true },
	{ name: "product:uom:list", method: "GET", path: "/product/units-of-measure", module: "product", tier: "list", authenticated: true },
	{ name: "product:packaging:list", method: "GET", path: "/product/packagings", module: "product", tier: "list", authenticated: true },
	{ name: "product:procurement-types:list", method: "GET", path: "/product/procurement-types", module: "product", tier: "list", authenticated: true },

	// ── Dashboard ─────────────────────────────────────────────────────────
	{ name: "general:dashboard", method: "GET", path: "/general/dashboard/overview", module: "general", tier: "crud", authenticated: true },

	// ── CRM ──────────────────────────────────────────────────────────────────────
	{ name: "crm:leads:list", method: "GET", path: "/crm/leads", module: "crm", tier: "list", authenticated: true },
	{ name: "crm:deals:list", method: "GET", path: "/crm/deals", module: "crm", tier: "list", authenticated: true },
	{ name: "crm:contacts:list", method: "GET", path: "/crm/contacts", module: "crm", tier: "list", authenticated: true },
	{ name: "crm:activities:list", method: "GET", path: "/crm/activities", module: "crm", tier: "list", authenticated: true },
	{ name: "crm:activity-types:list", method: "GET", path: "/crm/activity-types", module: "crm", tier: "list", authenticated: true },
	{ name: "crm:tasks:list", method: "GET", path: "/crm/tasks", module: "crm", tier: "list", authenticated: true },
	{ name: "crm:schedules:list", method: "GET", path: "/crm/schedules", module: "crm", tier: "list", authenticated: true },
	{ name: "crm:visits:list", method: "GET", path: "/crm/visits", module: "crm", tier: "list", authenticated: true },
	{ name: "crm:pipeline-stages:list", method: "GET", path: "/crm/pipeline-stages", module: "crm", tier: "list", authenticated: true },
	{ name: "crm:area-mapping:list", method: "GET", path: "/crm/area-mapping", module: "crm", tier: "list", authenticated: true },
	{ name: "crm:lead-sources:list", method: "GET", path: "/crm/lead-sources", module: "crm", tier: "list", authenticated: true },
	{ name: "crm:lead-statuses:list", method: "GET", path: "/crm/lead-statuses", module: "crm", tier: "list", authenticated: true },
	{ name: "crm:contact-roles:list", method: "GET", path: "/crm/contact-roles", module: "crm", tier: "list", authenticated: true },
	{ name: "crm:lead-automations:list", method: "GET", path: "/crm/leads/automation", module: "crm", tier: "list", authenticated: true },
	{ name: "crm:area-captures:list", method: "GET", path: "/crm/area-mapping/map", module: "crm", tier: "list", authenticated: true },

	// ── POS ──────────────────────────────────────────────────────────────────────
	{ name: "pos:orders:list", method: "GET", path: "/pos/orders", module: "pos", tier: "list", authenticated: true },
	{ name: "pos:sessions:list", method: "GET", path: "/pos/sessions", module: "pos", tier: "list", authenticated: true },
	{ name: "pos:floor-plans:list", method: "GET", path: "/pos/floor-plans", module: "pos", tier: "list", authenticated: true },
	{ name: "pos:config:get", method: "GET", path: "/pos/config/outlet/:outletId", module: "pos", tier: "crud", authenticated: true },

	// ── Geographic ───────────────────────────────────────────────────────────────
	{ name: "geo:countries:list", method: "GET", path: "/geographic/countries", module: "geographic", tier: "list", authenticated: true },
	{ name: "geo:provinces:list", method: "GET", path: "/geographic/provinces", module: "geographic", tier: "list", authenticated: true },
	{ name: "geo:cities:list", method: "GET", path: "/geographic/cities", module: "geographic", tier: "list", authenticated: true },
	{ name: "geo:districts:list", method: "GET", path: "/geographic/districts", module: "geographic", tier: "list", authenticated: true },
	{ name: "geo:villages:list", method: "GET", path: "/geographic/villages", module: "geographic", tier: "list", authenticated: true },
	{ name: "geo:map-data:get", method: "GET", path: "/geographic/map-data", module: "geographic", tier: "crud", authenticated: true },

	// ── Report ────────────────────────────────────────────────────────────────────
	{ name: "report:sales-overview:list", method: "GET", path: "/reports/sales-overview", module: "report", tier: "list", authenticated: true },
	{ name: "report:product-analysis:list", method: "GET", path: "/reports/product-analysis", module: "report", tier: "list", authenticated: true },
	{ name: "report:geo-performance:list", method: "GET", path: "/reports/geo-performance", module: "report", tier: "list", authenticated: true },
	{ name: "report:customer-research:list", method: "GET", path: "/reports/customer-research", module: "report", tier: "list", authenticated: true },
	{ name: "report:supplier-research:list", method: "GET", path: "/reports/supplier-research", module: "report", tier: "list", authenticated: true },

	// ── Stock Opname ──────────────────────────────────────────────────────────────
	{ name: "stock-opname:list", method: "GET", path: "/stock-opnames", module: "stock-opname", tier: "list", authenticated: true },

	// ── Notification ─────────────────────────────────────────────────────────────
	{ name: "notification:list", method: "GET", path: "/notifications", module: "notification", tier: "list", authenticated: true },

	// ── Loyalty ───────────────────────────────────────────────────────────────────
	{ name: "loyalty:programs:list", method: "GET", path: "/loyalty/programs", module: "loyalty", tier: "list", authenticated: true },
	{ name: "loyalty:members:list", method: "GET", path: "/loyalty/members", module: "loyalty", tier: "list", authenticated: true },

	// ── General (extras) ─────────────────────────────────────────────────────────
	{ name: "general:onboarding:get", method: "GET", path: "/general/onboarding", module: "general", tier: "crud", authenticated: true },

	// ── Supplier (extras) ────────────────────────────────────────────────────────
	{ name: "supplier:types:list", method: "GET", path: "/supplier/supplier-types", module: "supplier", tier: "list", authenticated: true },
	{ name: "supplier:banks:list", method: "GET", path: "/supplier/banks", module: "supplier", tier: "list", authenticated: true },

	// ── AI ──────────────────────────────────────────────────────────────────────────
	{ name: "ai:sessions:list", method: "GET", path: "/ai/sessions", module: "ai", tier: "list", authenticated: true },
	{ name: "ai:admin-actions:list", method: "GET", path: "/ai/admin/actions", module: "ai", tier: "list", authenticated: true },
	{ name: "ai:admin-intents:list", method: "GET", path: "/ai/admin/intents", module: "ai", tier: "list", authenticated: true },

	// ── Travel Planner ─────────────────────────────────────────────────────────────
	{ name: "travel:plans:list", method: "GET", path: "/travel/travel-planner/plans", module: "travel", tier: "list", authenticated: true },

	// ── Feedback ────────────────────────────────────────────────────────────────────
	{ name: "feedback:forms:list", method: "GET", path: "/feedback/forms", module: "feedback", tier: "list", authenticated: true },

	// ── E2E Workflows (composite, not individual HTTP) ─────────────────────
	{ name: "e2e:revenue-cycle", method: "WORKFLOW", path: "", module: "sales", tier: "workflow", authenticated: true },
	{ name: "e2e:purchase-cycle", method: "WORKFLOW", path: "", module: "purchase", tier: "workflow", authenticated: true },
	{ name: "e2e:journal-entry", method: "WORKFLOW", path: "", module: "finance", tier: "workflow", authenticated: true },
	{ name: "e2e:attendance-checkin", method: "WORKFLOW", path: "", module: "hrd", tier: "workflow", authenticated: true },
];

// ── Public Accessors ────────────────────────────────────────────────────────

/** Get all endpoints (returns a fresh copy each time). */
export function getEndpoints() {
	return ENDPOINTS.map((e) => ({ ...e }));
}

/** Get endpoints filtered by module. */
export function getEndpointsByModule(module) {
	return ENDPOINTS.filter((e) => e.module === module).map((e) => ({ ...e }));
}

/** Get endpoints filtered by tier. */
export function getEndpointsByTier(tier) {
	return ENDPOINTS.filter((e) => e.tier === tier).map((e) => ({ ...e }));
}

/** Get only HTTP endpoints (excludes WORKFLOW type). */
export function getHTTPEndpoints() {
	return ENDPOINTS.filter((e) => e.method !== "WORKFLOW").map((e) => ({ ...e }));
}

/** Get only workflow endpoints. */
export function getWorkflowEndpoints() {
	return ENDPOINTS.filter((e) => e.method === "WORKFLOW").map((e) => ({ ...e }));
}

/**
 * Build k6 request params with tags for a registered endpoint.
 * Tags are used by the profiler to group metrics by endpoint/module/tier.
 */
export function getTaggedParams(endpointName) {
	const ep = ENDPOINTS.find((e) => e.name === endpointName);
	if (!ep) {
		console.warn(`endpoint-registry: unknown endpoint "${endpointName}"`);
		return { tags: { name: endpointName, endpoint: endpointName, module: "unknown", tier: "crud" } };
	}
	return {
		tags: { name: ep.name, endpoint: ep.name, module: ep.module, tier: ep.tier },
	};
}

/** Get tiers threshold config (for the report analyzer). */
export function getTierThresholds() {
	return TIER_THRESHOLDS;
}

/** Build the full URL for an endpoint. */
export function endpointURL(endpointName) {
	const ep = ENDPOINTS.find((e) => e.name === endpointName);
	if (!ep) return "";
	if (ep.path.startsWith("http")) return ep.path;
	return `${API_V1}${ep.path}`;
}