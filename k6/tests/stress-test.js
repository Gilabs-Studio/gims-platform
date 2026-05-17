// k6/tests/stress-test.js
// Entry point: stress test using modular scenario components.
// Progressive ramp to find breaking point. Auto-aborts on > 1% error rate.
//
// Usage:
//   pnpm k6:stress:quick  # fast sanity check
//   pnpm k6:stress:full   # full capacity test
//   k6 run k6/tests/stress-test.js -e MAX_VUS=300

import { group, sleep } from "k6";
import {
	AUTH_ENDPOINTS,
	CREDENTIALS,
} from "../config.js";
import { getAuthToken, authGet } from "../auth-helper.js";

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
			stage("30s", 20),
			stage("1m", 50),
			stage("1m", 100),
			stage("1m", 150),
			stage("1m", 200),
			stage("1m", 300),
			stage("1m", 400),
			stage("30s", 0),
		];

export const options = {
	thresholds: {
		http_req_failed: [{ threshold: "rate<0.01", abortOnFail: true }],
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

export function setup() {
	const auth = getAuthToken(CREDENTIALS);
	if (!auth) throw new Error("Setup failed: could not authenticate.");

	const productsRes = authGet(AUTH_ENDPOINTS.products, auth);
	const customersRes = authGet(AUTH_ENDPOINTS.customers, auth);
	const productIds = (productsRes.json().data || []).map((i) => i.id).filter(Boolean);
	const customerIds = (customersRes.json().data || []).map((i) => i.id).filter(Boolean);

	console.log(`Setup: ${productIds.length} products, ${customerIds.length} customers`);
	return { auth, productIds, customerIds };
}

export default function (data) {
	const { auth, productIds, customerIds } = data;
	const randProduct = randomPick(productIds) || "";
	const randCustomer = randomPick(customerIds) || "";

	group("Core reads", () => {
		authGet(AUTH_ENDPOINTS.products, auth, { tags: { name: "stress:products" } });
		authGet(AUTH_ENDPOINTS.customers, auth, { tags: { name: "stress:customers" } });
		authGet(AUTH_ENDPOINTS.orders, auth, { tags: { name: "stress:sales-orders" } });
		authGet(AUTH_ENDPOINTS.purchaseOrders, auth, { tags: { name: "stress:purchase-orders" } });
		authGet(AUTH_ENDPOINTS.dashboard, auth, { tags: { name: "stress:dashboard" } });
		authGet(AUTH_ENDPOINTS.coa, auth, { tags: { name: "stress:coa" } });
	});

	if (randProduct && Math.random() < 0.5) {
		authGet(`${AUTH_ENDPOINTS.products}/${randProduct}`, auth, { tags: { name: "stress:product-detail" } });
	}
	if (randCustomer && Math.random() < 0.5) {
		authGet(`${AUTH_ENDPOINTS.customers}/${randCustomer}`, auth, { tags: { name: "stress:customer-detail" } });
	}

	sleep(0.5 + Math.random() * 1.5);
}

function randomPick(arr) {
	if (!arr || arr.length === 0) return null;
	return arr[Math.floor(Math.random() * arr.length)];
}

export function teardown() {
	console.log("Stress test completed.");
}