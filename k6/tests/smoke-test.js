// k6/tests/smoke-test.js
// Entry point: smoke test using modular scenario components.
// Validates all critical endpoints in under 2 minutes (CI/CD PR gate).
//
// Usage:
//   pnpm k6:smoke
//   k6 run k6/tests/smoke-test.js
//   k6 run -e RELAXED=1 k6/tests/smoke-test.js  # local development

import { check, sleep, group } from "k6";
import {
	SMOKE_WORKLOAD,
	THRESHOLDS,
	BASE_URL,
	API_V1,
	CREDENTIALS,
	AUTH_ENDPOINTS,
	checkSuccess,
} from "../config.js";
import { getAuthToken, authGet } from "../auth-helper.js";
import { healthCheck, ping, apiRoot, csrfToken } from "../scenarios/apis/public-endpoints.js";
import * as masterData from "../scenarios/apis/master-data.js";
import * as finance from "../scenarios/apis/finance.js";
import * as hrd from "../scenarios/apis/hrd.js";
import * as sales from "../scenarios/apis/sales.js";
import * as purchase from "../scenarios/apis/purchase.js";
import * as dashboard from "../scenarios/e2e/dashboard-overview.js";

const relaxedSmoke = __ENV.RELAXED === "1";

export const options = {
	thresholds: relaxedSmoke
		? { http_req_failed: THRESHOLDS.http_req_failed }
		: THRESHOLDS,
	scenarios: {
		smoke: SMOKE_WORKLOAD,
	},
};

export function setup() {
	const auth = getAuthToken(CREDENTIALS);
	if (!auth) {
		throw new Error("Setup failed: could not authenticate. Check credentials in config.js");
	}
	console.log(`Setup: authenticated as ${CREDENTIALS.email}`);
	return { auth };
}

export default function (data) {
	const { auth } = data;

	// ── 1. Public endpoints (no auth) ─────────────────────────────────────
	group("1. Public endpoints", () => {
		healthCheck();
		sleep(0.1);
		ping();
		sleep(0.1);
		apiRoot();
		sleep(0.1);
	});

	// ── 2. Auth flow ───────────────────────────────────────────────────────
	group("2. Auth endpoints", () => {
		csrfToken();
		sleep(0.1);
	});

	// ── 3. Master Data ─────────────────────────────────────────────────────
	group("3. Master data", () => {
		masterData.listUsers(auth);
		sleep(0.2);
		masterData.listRoles(auth);
		sleep(0.2);
		masterData.listProducts(auth);
		sleep(0.2);
		masterData.listCustomers(auth);
		sleep(0.2);
		masterData.listSuppliers(auth);
		sleep(0.2);
		masterData.listWarehouses(auth);
		sleep(0.2);
		masterData.listCurrencies(auth);
	});

	// ── 4. Finance (read-only) ─────────────────────────────────────────────
	group("4. Finance", () => {
		finance.listChartOfAccounts(auth);
		sleep(0.2);
		finance.listJournals(auth);
		sleep(0.2);
		finance.listBudgets(auth);
	});

	// ── 5. HRD ─────────────────────────────────────────────────────────────
	group("5. HRD", () => {
		hrd.listAttendance(auth);
		sleep(0.2);
		hrd.listLeaveRequests(auth);
	});

	// ── 6. Sales ───────────────────────────────────────────────────────────
	group("6. Sales", () => {
		sales.listQuotations(auth);
		sleep(0.2);
		sales.listOrders(auth);
	});

	// ── 7. Purchase ───────────────────────────────────────────────────────
	group("7. Purchase", () => {
		purchase.listPurchaseOrders(auth);
	});

	// ── 8. Dashboard ──────────────────────────────────────────────────────
	group("8. Dashboard", () => {
		dashboard.dashboardOverview(auth);
		dashboard.billingSubscription(auth);
	});
}