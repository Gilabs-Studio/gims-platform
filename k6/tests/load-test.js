// k6/tests/load-test.js
// Entry point: load test using modular scenario components.
// Simulates normal business hours traffic with mixed read/write workload.
//
// Usage:
//   pnpm k6:load:baseline  # 20 VUs, 10 min
//   pnpm k6:load:peak     # 50 VUs, 15 min
//   k6 run k6/tests/load-test.js -e VUS=30 -e DURATION=5m

import { check, sleep, group } from "k6";
import { SharedArray } from "k6/data";
import {
	THRESHOLDS,
	API_V1,
	AUTH_ENDPOINTS,
	CREDENTIALS,
	checkSuccess,
	checkList,
} from "../config.js";
import { getAuthToken, authGet, authPost } from "../auth-helper.js";
import * as masterData from "../scenarios/apis/master-data.js";
import * as finance from "../scenarios/apis/finance.js";
import * as sales from "../scenarios/apis/sales.js";
import * as purchase from "../scenarios/apis/purchase.js";
import * as inventory from "../scenarios/apis/inventory.js";
import * as hrd from "../scenarios/apis/hrd.js";
import * as dashboard from "../scenarios/e2e/dashboard-overview.js";
import { productNames, generateProductCode } from "../data/product-fixtures.js";

// ── Configuration ──────────────────────────────────────────────────────────
const targetVUs = parseInt(__ENV.VUS) || 20;
const targetDuration = __ENV.DURATION || "5m";

export const options = {
	thresholds: {
		...THRESHOLDS,
		"http_req_duration{name:auth:login}": ["p(95)<500"],
	},
	scenarios: {
		average_load: {
			executor: "ramping-vus",
			startVUs: 0,
			stages: [
				{ duration: "30s", target: Math.min(5, targetVUs) },
				{ duration: "30s", target: targetVUs },
				{ duration: targetDuration, target: targetVUs },
				{ duration: "30s", target: 0 },
			],
			gracefulRampDown: "10s",
		},
	},
};

// ── Setup ──────────────────────────────────────────────────────────────────
export function setup() {
	const auth = getAuthToken(CREDENTIALS);
	if (!auth) throw new Error("Setup failed: could not authenticate.");

	const customersRes = authGet(AUTH_ENDPOINTS.customers, auth);
	const productsRes = authGet(AUTH_ENDPOINTS.products, auth);
	const warehousesRes = authGet(AUTH_ENDPOINTS.warehouses, auth);

	const customerIds = extractIds(customersRes);
	const productIds = extractIds(productsRes);
	const warehouseIds = extractIds(warehousesRes);

	console.log(`Setup: ${customerIds.length} customers, ${productIds.length} products, ${warehouseIds.length} warehouses`);
	return { auth, customerIds, productIds, warehouseIds };
}

function extractIds(res) {
	try {
		const body = res.json();
		return (body.data || []).map((i) => i.id).filter(Boolean);
	} catch { return []; }
}

// ── VU Code ────────────────────────────────────────────────────────────────
export default function (data) {
	const { auth, customerIds, productIds } = data;
	const randCustomer = randomPick(customerIds) || "";
	const randProduct = randomPick(productIds) || "";

	// Dashboard (lightweight — every iteration)
	group("Dashboard", () => {
		dashboard.dashboardOverview(auth);
		dashboard.billingSubscription(auth);
	});

	// Master data (read-heavy)
	group("Master Data", () => {
		masterData.listProducts(auth);
		sleep(0.1);
		masterData.listCustomers(auth);
		sleep(0.1);
		masterData.listSuppliers(auth);
		sleep(0.1);
		masterData.listCurrencies(auth);
		if (randProduct && Math.random() < 0.33) {
			masterData.getProductDetail(auth, randProduct);
			sleep(0.1);
		}
		if (randCustomer && Math.random() < 0.33) {
			masterData.getCustomerDetail(auth, randCustomer);
			sleep(0.1);
		}
	});

	// Finance
	group("Finance", () => {
		finance.listChartOfAccounts(auth);
		sleep(0.1);
		finance.listJournals(auth);
		sleep(0.1);
		if (Math.random() < 0.2) finance.listBudgets(auth);
		sleep(0.1);
	});

	// Sales pipeline
	group("Sales", () => {
		sales.listQuotations(auth);
		sleep(0.15);
		sales.listOrders(auth);
		sleep(0.15);
		if (Math.random() < 0.2) sales.listDeliveryOrders(auth);
		sleep(0.1);
	});

	// Purchase
	group("Purchase", () => {
		purchase.listPurchaseOrders(auth);
		sleep(0.15);
		if (Math.random() < 0.2) purchase.listGoodsReceipts(auth);
		sleep(0.1);
	});

	// Inventory
	group("Inventory", () => {
		inventory.listStock(auth);
		sleep(0.15);
		if (Math.random() < 0.15) inventory.listStockOpnames(auth);
		sleep(0.1);
	});

	// HRD
	group("HRD", () => {
		hrd.listAttendance(auth);
		sleep(0.1);
		if (Math.random() < 0.2) hrd.listLeaveRequests(auth);
		sleep(0.1);
	});

	// Minimal writes (5%)
	if (Math.random() < 0.05) {
		group("Create", () => {
			const payload = {
				name: `${productNames[Math.floor(Math.random() * productNames.length)]} ${Date.now()}`,
				code: generateProductCode("K6"),
				description: "Created by k6 load test",
			};
			masterData.createProduct(auth, payload);
			sleep(0.2);
		});
	}

	sleep(1);
}

function randomPick(arr) {
	if (!arr || arr.length === 0) return null;
	return arr[Math.floor(Math.random() * arr.length)];
}