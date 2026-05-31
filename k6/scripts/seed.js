// k6/scripts/seed.js
// Idempotent API-based seed RESOLVER for GIMS k6 performance suite.
// Resolves existing test data through APIs for local and staging, then persists
// the result to k6/data/generated/seed-state.json via handleSummary().
//
// All resolution happens in setup() (main thread) so the resolved state is
// available to handleSummary() — k6's only file-writing hook.
//
// NOTE: GIMS has NO /users/me endpoint. User identity comes from the login
// response (captured into auth.user by auth-helper.js).
//
// Usage:
//   k6 run k6/scripts/seed.js
//   k6 run -e K6_ENV=staging -e BASE_URL=https://staging.gims.app k6/scripts/seed.js
//   k6 run -e SEED_DRY_RUN=true k6/scripts/seed.js  (validate without writing)

import { check } from "k6";
import { envGuard } from "../lib/env-guard.js";
import { API_V1, CREDENTIALS } from "../config.js";
import { getAuthToken, authGet } from "../auth-helper.js";
import { parseBody } from "../lib/helpers.js";

// ── Configuration ────────────────────────────────────────────────────────────

const DRY_RUN = __ENV.SEED_DRY_RUN === "true";

export const options = {
	scenarios: {
		seed: {
			executor: "shared-iterations",
			vus: 1,
			iterations: 1,
			maxDuration: "2m",
		},
	},
	thresholds: {
		http_req_failed: ["rate<0.5"], // resolver hits negative paths; lenient
	},
};

// ── Setup: resolve everything here (main thread, shared with handleSummary) ──

export function setup() {
	envGuard.assertCanSeed();
	envGuard.printBanner("seed");

	if (DRY_RUN) {
		console.log("[seed] DRY RUN mode — will resolve but not write a file");
	}

	const auth = getAuthToken(CREDENTIALS);
	if (!auth) {
		throw new Error("[seed] Authentication failed. Cannot seed without valid credentials.");
	}

	const state = {};

	// User identity from the login response (no /users/me in GIMS)
	const user = auth.user || {};
	state.user = user.id
		? { id: user.id, email: user.email, employeeId: user.employee_id || null, tenantId: user.tenant_id || null }
		: null;

	// Simple "first item" resolvers
	state.company = resolveEntity(auth, "company", `${API_V1}/organization/companies`);
	state.product = resolveEntity(auth, "product", `${API_V1}/product/products`);
	state.customer = resolveEntity(auth, "customer", `${API_V1}/customer/customers`);
	state.supplier = resolveEntity(auth, "supplier", `${API_V1}/supplier/suppliers`);
	state.warehouse = resolveEntity(auth, "warehouse", `${API_V1}/warehouse/warehouses`);
	state.employee = resolveEntity(auth, "employee", `${API_V1}/organization/employees`);
	state.paymentTerms = resolveEntity(auth, "paymentTerms", `${API_V1}/master-data/payment-terms`);
	state.bankAccount = resolveEntity(auth, "bankAccount", `${API_V1}/finance/bank-accounts`);
	state.leaveType = resolveEntity(auth, "leaveType", `${API_V1}/master-data/leave-types`);
	state.businessUnit = resolveEntity(auth, "businessUnit", `${API_V1}/organization/business-units`);

	// Chart of accounts: pick two postable EXPENSE/REVENUE/EQUITY accounts
	const coaRes = authGet(`${API_V1}/finance/chart-of-accounts`, auth, {
		tags: { name: "seed:coa", endpoint: "seed:coa", module: "seed", tier: "list" },
	});
	check(coaRes, { "seed:coa list succeeded": (r) => r.status >= 200 && r.status < 300 });
	const coaData = parseBody(coaRes);
	if (coaData?.data) {
		const items = Array.isArray(coaData.data) ? coaData.data : coaData.data.items || [];
		const safe = items.filter((a) => {
			const t = (a.type || "").toUpperCase();
			return (t === "EXPENSE" || t === "REVENUE" || t === "EQUITY") && a.is_postable !== false;
		});
		const usable = safe.length >= 2 ? safe : items;
		state.coaDebit = usable[0] ? { id: usable[0].id, code: usable[0].code, name: usable[0].name } : null;
		state.coaCredit = usable[1] ? { id: usable[1].id, code: usable[1].code, name: usable[1].name } : null;
	} else {
		state.coaDebit = null;
		state.coaCredit = null;
	}

	// Outlet with coordinates (for GPS-based attendance scenarios)
	const outletRes = authGet(`${API_V1}/organization/outlets`, auth, {
		tags: { name: "seed:outlet", endpoint: "seed:outlet", module: "seed", tier: "list" },
	});
	check(outletRes, { "seed:outlet list succeeded": (r) => r.status >= 200 && r.status < 300 });
	const outletData = parseBody(outletRes);
	if (outletData?.data) {
		const items = Array.isArray(outletData.data) ? outletData.data : outletData.data.items || [];
		const outlet = items.find((o) => o.latitude && o.longitude) || items[0];
		state.outlet = outlet
			? { id: outlet.id, name: outlet.name, latitude: outlet.latitude || -6.2088, longitude: outlet.longitude || 106.8456 }
			: null;
	} else {
		state.outlet = null;
	}

	// salesRep derives from employee/user
	state.salesRep = state.employee || (state.user ? { id: state.user.id } : null);

	// ── Summary ────────────────────────────────────────────────────────────────
	const resolved = Object.keys(state).filter((k) => state[k] !== null);
	const missing = Object.keys(state).filter((k) => state[k] === null);
	console.log("\n[seed] ═══ Seed State Summary ═══");
	console.log(`  Resolved (${resolved.length}): ${resolved.join(", ")}`);
	if (missing.length > 0) {
		console.log(`  Missing  (${missing.length}): ${missing.join(", ")}`);
	}
	console.log("[seed] ═══════════════════════════\n");

	return state;
}

// ── Default: no-op (all work done in setup) ──────────────────────────────────

export default function (data) {
	// Emit the resolved seed state to stdout between unique delimiters so the
	// Node wrapper (seed-persist.js) can extract and persist it. setup() data is
	// passed here by k6; this runs once (shared-iterations: 1).
	const json = JSON.stringify(data);
	console.log(`__SEED_STATE_BEGIN__${json}__SEED_STATE_END__`);
}

// ── handleSummary: also attempt a direct file write (best effort) ────────────

export function handleSummary(data) {
	// handleSummary runs in a separate context where setup data is unavailable,
	// so the authoritative persistence is done by the Node wrapper parsing the
	// delimited stdout line above. We still return a clean stdout summary.
	return { stdout: "" };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveEntity(auth, key, listUrl) {
	const res = authGet(listUrl, auth, {
		tags: { name: `seed:${key}`, endpoint: `seed:${key}`, module: "seed", tier: "list" },
	});
	check(res, { [`seed:${key} list succeeded`]: (r) => r.status >= 200 && r.status < 300 });

	const body = parseBody(res);
	if (!body?.data) return null;
	const items = Array.isArray(body.data) ? body.data : body.data.items || [];
	if (items.length === 0) {
		console.warn(`[seed] No ${key} found`);
		return null;
	}
	const item = items[0];
	return { id: item.id, name: item.name || item.code || item.email || `${key}-${item.id}` };
}
