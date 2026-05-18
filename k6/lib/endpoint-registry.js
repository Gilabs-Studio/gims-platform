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

	// ── Sales ─────────────────────────────────────────────────────────────
	{ name: "sales:quotations:list", method: "GET", path: "/sales/sales-quotations", module: "sales", tier: "list", authenticated: true },
	{ name: "sales:quotations:create", method: "POST", path: "/sales/sales-quotations", module: "sales", tier: "crud", authenticated: true },
	{ name: "sales:orders:list", method: "GET", path: "/sales/sales-orders", module: "sales", tier: "list", authenticated: true },
	{ name: "sales:orders:create", method: "POST", path: "/sales/sales-orders", module: "sales", tier: "crud", authenticated: true },
	{ name: "sales:delivery-orders:list", method: "GET", path: "/sales/delivery-orders", module: "sales", tier: "list", authenticated: true },
	{ name: "sales:invoices:list", method: "GET", path: "/sales/customer-invoices", module: "sales", tier: "list", authenticated: true },
	{ name: "sales:payments:list", method: "GET", path: "/sales/payments", module: "sales", tier: "list", authenticated: true },

	// ── Purchase ──────────────────────────────────────────────────────────
	{ name: "purchase:orders:list", method: "GET", path: "/purchase/purchase-orders", module: "purchase", tier: "list", authenticated: true },
	{ name: "purchase:orders:create", method: "POST", path: "/purchase/purchase-orders", module: "purchase", tier: "crud", authenticated: true },
	{ name: "purchase:goods-receipt:list", method: "GET", path: "/purchase/goods-receipt", module: "purchase", tier: "list", authenticated: true },

	// ── Finance ───────────────────────────────────────────────────────────
	{ name: "finance:coa:list", method: "GET", path: "/finance/chart-of-accounts", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:journals:list", method: "GET", path: "/finance/journal-entries", module: "finance", tier: "list", authenticated: true },
	{ name: "finance:journals:create", method: "POST", path: "/finance/journal-entries", module: "finance", tier: "crud", authenticated: true },
	{ name: "finance:budget:list", method: "GET", path: "/finance/budget", module: "finance", tier: "list", authenticated: true },

	// ── HRD ───────────────────────────────────────────────────────────────
	{ name: "hrd:attendance:list", method: "GET", path: "/hrd/attendance", module: "hrd", tier: "list", authenticated: true },
	{ name: "hrd:attendance:clock-in", method: "POST", path: "/hrd/attendance/clock-in", module: "hrd", tier: "crud", authenticated: true },
	{ name: "hrd:leaves:list", method: "GET", path: "/hrd/leave-requests", module: "hrd", tier: "list", authenticated: true },
	{ name: "hrd:employees:list", method: "GET", path: "/organization/employees", module: "hrd", tier: "list", authenticated: true },

	// ── Inventory ─────────────────────────────────────────────────────────
	{ name: "inventory:stock:list", method: "GET", path: "/stock/inventory", module: "inventory", tier: "list", authenticated: true },
	{ name: "inventory:stock:metrics", method: "GET", path: "/stock/inventory/metrics", module: "inventory", tier: "crud", authenticated: true },
	{ name: "inventory:movements:list", method: "GET", path: "/stock/movements", module: "inventory", tier: "list", authenticated: true },

	// ── Dashboard ─────────────────────────────────────────────────────────
	{ name: "general:dashboard", method: "GET", path: "/general/dashboard/overview", module: "general", tier: "crud", authenticated: true },

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