// k6/smoke-test.js
// Quick validation that all critical endpoints respond correctly.
// Run this whenever you deploy to verify nothing is broken.
//
// Usage:
//   k6 run k6/smoke-test.js
//   k6 run -e BASE_URL=https://staging.example.com k6/smoke-test.js

import { check, sleep, group } from "k6";
import http from "k6/http";
import {
	SMOKE_WORKLOAD,
	THRESHOLDS,
	BASE_URL,
	API_V1,
	CREDENTIALS,
	AUTH_ENDPOINTS,
	checkSuccess,
} from "./config.js";
import { getAuthToken, authGet } from "./auth-helper.js";

const relaxedSmoke = __ENV.RELAXED === "1";

export const options = {
	thresholds: relaxedSmoke
		? {
				http_req_failed: THRESHOLDS.http_req_failed,
			}
		: THRESHOLDS,
	scenarios: {
		smoke: SMOKE_WORKLOAD,
	},
};

export function setup() {
	// Pre-authenticate once — all VUs share this token
	const auth = getAuthToken(CREDENTIALS);
	if (!auth) {
		throw new Error(
			"Setup failed: could not authenticate. Check credentials in config.js",
		);
	}
	console.log(`Setup: authenticated as ${CREDENTIALS.email}`);
	return { auth };
}

export default function (data) {
	const { auth } = data;

	// ── 1. PUBLIC ENDPOINTS ──
	group("1. Public endpoints", () => {
		// Health check
		const health = http.get(`${BASE_URL}/health`, {
			tags: { name: "public:health" },
		});
		check(health, {
			"health returns 200": (r) => r.status === 200,
			"health returns ok": (r) => r.json().status === "ok",
		});

		sleep(0.1);

		// Ping
		const ping = http.get(`${BASE_URL}/ping`, {
			tags: { name: "public:ping" },
		});
		check(ping, {
			"ping returns 200": (r) => r.status === 200,
		});

		sleep(0.1);

		// API root (public)
		const apiRoot = http.get(`${API_V1}/`, {
			tags: { name: "public:api-root" },
		});
		checkSuccess(check, apiRoot, {
			"api root message present": (r) => r.json().data && r.json().data.message,
		});

		sleep(0.1);
	});

	// ── 2. AUTH FLOW ──
	group("2. Auth endpoints", () => {
		// CSRF
		const csrf = http.get(`${API_V1}/auth/csrf`, {
			tags: { name: "auth:csrf" },
		});
		check(csrf, {
			"csrf returns 2xx": (r) => r.status >= 200 && r.status < 300,
		});

		sleep(0.1);
	});

	// ── 3. MASTER DATA (Read-Only) ──
	group("3. Master data", () => {
		// Users
		const users = authGet(AUTH_ENDPOINTS.users, auth, {
			tags: { name: "master:users" },
		});
		checkSuccess(check, users);

		sleep(0.2);

		// Roles
		const roles = authGet(AUTH_ENDPOINTS.roles, auth, {
			tags: { name: "master:roles" },
		});
		checkSuccess(check, roles);

		sleep(0.2);

		// Products
		const products = authGet(AUTH_ENDPOINTS.products, auth, {
			tags: { name: "master:products" },
		});
		checkSuccess(check, products);

		sleep(0.2);

		// Customers
		const customers = authGet(AUTH_ENDPOINTS.customers, auth, {
			tags: { name: "master:customers" },
		});
		checkSuccess(check, customers);

		sleep(0.2);

		// Suppliers
		const suppliers = authGet(AUTH_ENDPOINTS.suppliers, auth, {
			tags: { name: "master:suppliers" },
		});
		checkSuccess(check, suppliers);

		sleep(0.2);

		// Warehouses
		const warehouses = authGet(AUTH_ENDPOINTS.warehouses, auth, {
			tags: { name: "master:warehouses" },
		});
		checkSuccess(check, warehouses);

		sleep(0.2);

		// Currencies
		const currencies = authGet(AUTH_ENDPOINTS.currency, auth, {
			tags: { name: "master:currencies" },
		});
		checkSuccess(check, currencies);
	});

	// ── 4. FINANCE (Read-Only) ──
	group("4. Finance endpoints", () => {
		// Chart of Accounts
		const coa = authGet(AUTH_ENDPOINTS.coa, auth, {
			tags: { name: "finance:coa" },
		});
		checkSuccess(check, coa);

		sleep(0.2);

		// Journals
		const journals = authGet(AUTH_ENDPOINTS.journals, auth, {
			tags: { name: "finance:journals" },
		});
		checkSuccess(check, journals);

		sleep(0.2);

		// Budgets
		const budgets = authGet(AUTH_ENDPOINTS.budgets, auth, {
			tags: { name: "finance:budgets" },
		});
		checkSuccess(check, budgets);
	});

	// ── 5. HRD ──
	group("5. HRD endpoints", () => {
		// Attendance records
		const attendance = authGet(AUTH_ENDPOINTS.attendance, auth, {
			tags: { name: "hrd:attendance" },
		});
		checkSuccess(check, attendance);

		sleep(0.2);

		// Leave requests
		const leaves = authGet(AUTH_ENDPOINTS.leaves, auth, {
			tags: { name: "hrd:leaves" },
		});
		checkSuccess(check, leaves);
	});

	// ── 6. SALES ──
	group("6. Sales endpoints", () => {
		// Sales quotations
		const quotations = authGet(AUTH_ENDPOINTS.quotations, auth, {
			tags: { name: "sales:quotations" },
		});
		checkSuccess(check, quotations);

		sleep(0.2);

		// Sales orders
		const orders = authGet(AUTH_ENDPOINTS.orders, auth, {
			tags: { name: "sales:orders" },
		});
		checkSuccess(check, orders);
	});

	// ── 7. PURCHASE ──
	group("7. Purchase endpoints", () => {
		// Purchase orders
		const po = authGet(AUTH_ENDPOINTS.purchaseOrders, auth, {
			tags: { name: "purchase:orders" },
		});
		checkSuccess(check, po);
	});

	// ── 8. DASHBOARD ──
	group("8. Dashboard", () => {
		const dash = authGet(AUTH_ENDPOINTS.dashboard, auth, {
			tags: { name: "dashboard" },
		});
		checkSuccess(check, dash);
	});

	sleep(0.5);
}

export function teardown() {
	console.log("Smoke test completed successfully.");
}
