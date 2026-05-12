// k6/load-test.js
// Realistic average-load test simulating normal business hours traffic.
// Tests all major module endpoints with a mixed read/write workload.
//
// Usage:
//   k6 run k6/load-test.js
//   k6 run -e BASE_URL=https://staging.example.com -e VUS=30 -e DURATION=5m k6/load-test.js

import { check, sleep, group } from "k6";
import { SharedArray } from "k6/data";
import {
	THRESHOLDS,
	API_V1,
	AUTH_ENDPOINTS,
	CREDENTIALS,
	checkSuccess,
	checkList,
} from "./config.js";
import { getAuthToken, authGet, authPost } from "./auth-helper.js";

// ── Test Data ──────────────────────────────────────────────────────────────
// Product names to create in bulk — randomly selected per iteration
const PRODUCT_NAMES = new SharedArray("product-names", () => [
	"Benchmark Widget A",
	"Benchmark Widget B",
	"Benchmark Widget C",
	"Test Component X",
	"Test Component Y",
	"Test Component Z",
	"Load Test Item 1",
	"Load Test Item 2",
	"Load Test Item 3",
	"Perf Test Product Alpha",
	"Perf Test Product Beta",
]);

// ── Scenarios ──────────────────────────────────────────────────────────────
const targetVUs = parseInt(__ENV.VUS) || 20;
const targetDuration = __ENV.DURATION || "5m";

export const options = {
	thresholds: {
		...THRESHOLDS,
		// Stricter for critical paths
		"http_req_duration{name:auth:login}": ["p(95)<500"],
	},
	scenarios: {
		average_load: {
			executor: "ramping-vus",
			startVUs: 0,
			stages: [
				{ duration: "30s", target: Math.min(5, targetVUs) }, // warmup
				{ duration: "30s", target: targetVUs }, // ramp up
				{ duration: targetDuration, target: targetVUs }, // steady
				{ duration: "30s", target: 0 }, // ramp down
			],
			gracefulRampDown: "10s",
		},
	},
};

// ── Setup ──────────────────────────────────────────────────────────────────
export function setup() {
	const auth = getAuthToken(CREDENTIALS);
	if (!auth) {
		throw new Error("Setup failed: could not authenticate.");
	}

	// Pre-fetch some IDs for use in URL-building
	const customersRes = authGet(AUTH_ENDPOINTS.customers, auth, {
		tags: { name: "setup:customers" },
	});
	const productsRes = authGet(AUTH_ENDPOINTS.products, auth, {
		tags: { name: "setup:products" },
	});
	const warehousesRes = authGet(AUTH_ENDPOINTS.warehouses, auth, {
		tags: { name: "setup:warehouses" },
	});

	const customerIds = extractIds(customersRes);
	const productIds = extractIds(productsRes);
	const warehouseIds = extractIds(warehousesRes);

	console.log(
		`Setup: ${customerIds.length} customers, ${productIds.length} products, ${warehouseIds.length} warehouses`,
	);

	return {
		auth,
		customerIds,
		productIds,
		warehouseIds,
	};
}

function extractIds(res) {
	try {
		const body = res.json();
		const data = body.data || [];
		return data.map((item) => item.id).filter(Boolean);
	} catch {
		return [];
	}
}

// ── VU Code ────────────────────────────────────────────────────────────────
export default function (data) {
	const { auth, customerIds, productIds } = data;

	// Pick random IDs for URL-building (with fallback to empty)
	const randCustomer = randomPick(customerIds) || "";
	const randProduct = randomPick(productIds) || "";
	const randName =
		PRODUCT_NAMES[Math.floor(Math.random() * PRODUCT_NAMES.length)];

	// ── 1. Dashboard & Billing (every iteration — lightweight) ──
	group("Dashboard", () => {
		// GET dashboard
		const dash = authGet(AUTH_ENDPOINTS.dashboard, auth, {
			tags: { name: "dashboard" },
		});
		checkSuccess(check, dash);
		sleep(0.1);

		// GET billing subscription
		const billing = authGet(`${API_V1}/billing/subscription`, auth, {
			tags: { name: "billing:subscription" },
		});
		checkSuccess(check, billing);
		sleep(0.1);
	});

	// ── 2. Master Data — mixed reads ──
	group("Master Data", () => {
		// List products (frequent operation)
		const products = authGet(AUTH_ENDPOINTS.products, auth, {
			tags: { name: "master:products:list" },
		});
		checkList(check, products);
		sleep(0.1);

		// List customers
		const customers = authGet(AUTH_ENDPOINTS.customers, auth, {
			tags: { name: "master:customers:list" },
		});
		checkList(check, customers);
		sleep(0.1);

		// List suppliers
		const suppliers = authGet(AUTH_ENDPOINTS.suppliers, auth, {
			tags: { name: "master:suppliers:list" },
		});
		checkSuccess(check, suppliers);
		sleep(0.1);

		// List currencies
		authGet(AUTH_ENDPOINTS.currency, auth, {
			tags: { name: "master:currencies:list" },
		});
		sleep(0.1);

		// 33% chance: get product detail
		if (randProduct && Math.random() < 0.33) {
			authGet(`${AUTH_ENDPOINTS.products}/${randProduct}`, auth, {
				tags: { name: "master:products:detail" },
			});
			sleep(0.1);
		}

		// 33% chance: get customer detail
		if (randCustomer && Math.random() < 0.33) {
			authGet(`${AUTH_ENDPOINTS.customers}/${randCustomer}`, auth, {
				tags: { name: "master:customers:detail" },
			});
			sleep(0.1);
		}
	});

	// ── 3. Finance — reads ──
	group("Finance", () => {
		// COA list
		authGet(AUTH_ENDPOINTS.coa, auth, {
			tags: { name: "finance:coa:list" },
		});
		sleep(0.1);

		// Journal entries
		authGet(AUTH_ENDPOINTS.journals, auth, {
			tags: { name: "finance:journals:list" },
		});
		sleep(0.1);

		// 20% chance: budgets
		if (Math.random() < 0.2) {
			authGet(AUTH_ENDPOINTS.budgets, auth, {
				tags: { name: "finance:budgets:list" },
			});
			sleep(0.1);
		}
	});

	// ── 4. Sales pipeline — reads ──
	group("Sales", () => {
		// Sales quotations list
		authGet(AUTH_ENDPOINTS.quotations, auth, {
			tags: { name: "sales:quotations:list" },
		});
		sleep(0.15);

		// Sales orders list
		authGet(AUTH_ENDPOINTS.orders, auth, {
			tags: { name: "sales:orders:list" },
		});
		sleep(0.15);

		// 20% chance: delivery orders
		if (Math.random() < 0.2) {
			authGet(`${API_V1}/sales/delivery-orders`, auth, {
				tags: { name: "sales:delivery-orders:list" },
			});
			sleep(0.1);
		}

		// 20% chance: customer invoices
		if (Math.random() < 0.2) {
			authGet(`${API_V1}/sales/customer-invoices`, auth, {
				tags: { name: "sales:invoices:list" },
			});
			sleep(0.1);
		}
	});

	// ── 5. Purchase pipeline — reads ──
	group("Purchase", () => {
		// Purchase orders list
		authGet(AUTH_ENDPOINTS.purchaseOrders, auth, {
			tags: { name: "purchase:orders:list" },
		});
		sleep(0.15);

		// 20% chance: goods receipts
		if (Math.random() < 0.2) {
			authGet(`${API_V1}/purchase/goods-receipt`, auth, {
				tags: { name: "purchase:goods-receipts:list" },
			});
			sleep(0.1);
		}
	});

	// ── 6. Inventory — reads ──
	group("Inventory", () => {
		// Stock list
		authGet(`${API_V1}/inventory/stock`, auth, {
			tags: { name: "inventory:stock:list" },
		});
		sleep(0.15);

		// 15% chance: stock opname
		if (Math.random() < 0.15) {
			authGet(`${API_V1}/stock-opnames`, auth, {
				tags: { name: "inventory:stock-opnames:list" },
			});
			sleep(0.1);
		}
	});

	// ── 7. HRD — reads ──
	group("HRD", () => {
		// Attendance
		authGet(AUTH_ENDPOINTS.attendance, auth, {
			tags: { name: "hrd:attendance:list" },
		});
		sleep(0.1);

		// 20% chance: leave requests
		if (Math.random() < 0.2) {
			authGet(AUTH_ENDPOINTS.leaves, auth, {
				tags: { name: "hrd:leaves:list" },
			});
			sleep(0.1);
		}
	});

	// ── 8. Lightweight CREATE (5% probability) ──
	// Minimal writes to avoid data pollution during repeated test runs
	if (Math.random() < 0.05) {
		group("Create", () => {
			const payload = {
				name: `${randName} ${Date.now()}`,
				code: `K6-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
				description: "Created by k6 load test",
			};

			const createRes = authPost(AUTH_ENDPOINTS.products, payload, auth, {
				tags: { name: "master:products:create" },
			});

			check(createRes, {
				"product create returns 2xx": (r) => r.status >= 200 && r.status < 300,
			});
			sleep(0.2);
		});
	}

	sleep(1);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function randomPick(arr) {
	if (!arr || arr.length === 0) return null;
	return arr[Math.floor(Math.random() * arr.length)];
}
