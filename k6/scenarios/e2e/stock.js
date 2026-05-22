// k6/scenarios/e2e/stock.js
// Stock Module E2E Workflows — Stock opname (physical inventory count).
//
// Exports:
//   - stockOpnameFlow(auth, data)  → Create opname → submit → approve

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authPost } from "../../auth-helper.js";
import { parseBody, isoDate } from "../../lib/helpers.js";

const TAGS = { module: "stock", tier: "workflow" };

function tag(endpoint) {
	return { tags: { name: endpoint, endpoint, ...TAGS }, responseCallback: http.expectedStatuses({ min: 200, max: 599 }) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW 1: Stock Opname Flow (create → submit → approve)
// ═══════════════════════════════════════════════════════════════════════════════
export function stockOpnameFlow(auth, data) {
	if (data.warehouseId === "SETUP_MISSING") return null;

	// Step 1: Create stock opname
	const payload = {
		warehouse_id: data.warehouseId,
		date: isoDate(new Date()),
		description: "K6 E2E stock opname test - " + Date.now(),
		scope_type: "all",
	};

	const createRes = authPost(`${API_V1}/stock-opnames`, payload, auth, tag("stock:opname:create"));
	const opname = parseBody(createRes)?.data;
	check(createRes, { "Stock opname created": (r) => r.status >= 200 && r.status < 300 && !!opname?.id });
	if (!opname?.id) return null;

	// Step 2: Submit for approval (uses inventory/opname path)
	const submitRes = authPost(`${API_V1}/inventory/opname/${opname.id}/submit-approval`, {}, auth, tag("stock:opname:submit"));
	check(submitRes, { "Stock opname submitted": (r) => r.status >= 200 && r.status < 300 });

	// Step 3: Approve (via stock-opnames status endpoint)
	if (submitRes.status < 300) {
		const approveRes = authPost(`${API_V1}/stock-opnames/${opname.id}/status`, { status: "approved" }, auth, tag("stock:opname:approve"));
		check(approveRes, { "Stock opname approved": (r) => r.status >= 200 && r.status < 300 });
	}

	return { opnameId: opname.id };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER: Execute all Stock workflows (called by profiler)
// ═══════════════════════════════════════════════════════════════════════════════
export function runStockWorkflows(auth, data) {
	if (data.warehouseId === "SETUP_MISSING") return;
	stockOpnameFlow(auth, data);
}
