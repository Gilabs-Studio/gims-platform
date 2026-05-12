// k6/stress-test.js
// Progressive stress test to find the breaking point of the GIMS API.
// Ramps up VUs until error rate exceeds 1% (abortOnFail), then stops.
//
// Usage:
//   k6 run k6/stress-test.js
//   k6 run -e BASE_URL=https://staging.example.com -e MAX_VUS=300 k6/stress-test.js

import { group, sleep } from "k6";
import { API_V1, AUTH_ENDPOINTS, CREDENTIALS } from "./config.js";
import { getAuthToken, authGet } from "./auth-helper.js";

const MAX_VUS = parseInt(__ENV.MAX_VUS) || 200;
const QUICK = __ENV.QUICK === "1";

function stage(duration, target) {
	return { duration, target: Math.min(target, MAX_VUS) };
}

const STAGES = QUICK
	? [
			stage("10s", 10),
			stage("20s", 20),
			stage("10s", 0),
		]
	: [
			stage("30s", 20), // warmup
			stage("1m", 50), // moderate
			stage("1m", 100), // heavy
			stage("1m", 150), // very heavy
			stage("1m", 200), // stress
			stage("1m", 300), // breakpoint
			stage("1m", 400), // extreme
			stage("30s", 0), // cooldown
		];

export const options = {
	thresholds: {
		// KEY: auto-abort when error rate crosses 1%
		http_req_failed: [{ threshold: "rate<0.01", abortOnFail: true }],
		// Latency thresholds — adjust to your SLOs
		http_req_duration: ["p(95)<1000", "p(99)<2000"],
	},
	scenarios: {
		stress: {
			executor: "ramping-vus",
			startVUs: 0,
				stages: STAGES,
			gracefulRampDown: "15s",
		},
	},
};

// ── Setup ──────────────────────────────────────────────────────────────────
export function setup() {
	const auth = getAuthToken(CREDENTIALS);
	if (!auth) {
		throw new Error("Setup failed: could not authenticate.");
	}

	// Pre-fetch IDs for read endpoints
	const productsRes = authGet(AUTH_ENDPOINTS.products, auth);
	const customersRes = authGet(AUTH_ENDPOINTS.customers, auth);

	const productIds = extractIds(productsRes);
	const customerIds = extractIds(customersRes);

	console.log(
		`Setup: ${productIds.length} products, ${customerIds.length} customers`,
	);

	return { auth, productIds, customerIds };
}

function extractIds(res) {
	try {
		const data = res.json().data || [];
		return data.map((i) => i.id).filter(Boolean);
	} catch {
		return [];
	}
}

// ── VU Code ────────────────────────────────────────────────────────────────
export default function (data) {
	const { auth, productIds, customerIds } = data;

	const randProduct = randomPick(productIds) || "";
	const randCustomer = randomPick(customerIds) || "";

	// ── Core reads — every iteration ──
	group("Core reads", () => {
		// Products list (high frequency)
		authGet(AUTH_ENDPOINTS.products, auth, {
			tags: { name: "stress:products" },
		});

		// Customers list
		authGet(AUTH_ENDPOINTS.customers, auth, {
			tags: { name: "stress:customers" },
		});

		// Sales orders (critical business path)
		authGet(AUTH_ENDPOINTS.orders, auth, {
			tags: { name: "stress:sales-orders" },
		});

		// Purchase orders
		authGet(AUTH_ENDPOINTS.purchaseOrders, auth, {
			tags: { name: "stress:purchase-orders" },
		});

		// Dashboard
		authGet(AUTH_ENDPOINTS.dashboard, auth, {
			tags: { name: "stress:dashboard" },
		});

		// COA
		authGet(AUTH_ENDPOINTS.coa, auth, {
			tags: { name: "stress:coa" },
		});
	});

	sleep(0.1);

	// ── Detail reads — 50% chance ──
	if (randProduct && Math.random() < 0.5) {
		authGet(`${AUTH_ENDPOINTS.products}/${randProduct}`, auth, {
			tags: { name: "stress:product-detail" },
		});
	}
	if (randCustomer && Math.random() < 0.5) {
		authGet(`${AUTH_ENDPOINTS.customers}/${randCustomer}`, auth, {
			tags: { name: "stress:customer-detail" },
		});
	}

	// Small think-time to prevent unrealistic hammering
	sleep(0.5 + Math.random() * 1.5);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function randomPick(arr) {
	if (!arr || arr.length === 0) return null;
	return arr[Math.floor(Math.random() * arr.length)];
}

// ── Teardown ───────────────────────────────────────────────────────────────
export function teardown() {
	console.log("Stress test completed.");
}
