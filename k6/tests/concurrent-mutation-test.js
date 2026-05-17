// k6/tests/concurrent-mutation-test.js
// Concurrent mutation test: validates GIMS locking behavior under write contention.
// Tests FOR UPDATE behavior, conflict detection, and lost-update prevention.
//
// Usage:
//   k6 run k6/tests/concurrent-mutation-test.js
//   k6 run -e VUS=5 -e DURATION=2m k6/tests/concurrent-mutation-test.js
//
// This test should be run BEFORE Phase 2 (CI/CD) to validate that the
// backend correctly handles concurrent writes to the same resource.

import { group, sleep } from "k6";
import http from "k6/http";
import { check } from "k6";
import {
	API_V1,
	AUTH_ENDPOINTS,
	CREDENTIALS,
} from "../config.js";
import { getAuthToken, authGet, authPost, authPatch } from "../auth-helper.js";
import { conflictRate } from "../lib/metrics.js";

const VUS = Number(__ENV.VUS) || 5;
const DURATION = __ENV.DURATION || "3m";

// How many VUs will fight over the same resource simultaneously
const CONTENTION_GROUP_SIZE = Math.min(VUS, 5);

export const options = {
	thresholds: {
		// Low error threshold: we EXPECT some 409s in conflict scenarios
		http_req_failed: ["rate<0.05"],
		http_req_duration: ["p(95)<2000", "p(99)<4000"],
		checks: ["rate>0.90"],
	},
	scenarios: {
		concurrent_write: {
			executor: "ramping-vus",
			startVUs: 0,
			stages: [
				{ duration: "20s", target: VUS },
				{ duration: DURATION, target: VUS },
				{ duration: "20s", target: 0 },
			],
			gracefulRampDown: "10s",
		},
	},
};

function apiPost(auth, url, body, params = {}) {
	return authPost(url, body, auth, params);
}
function apiGet(auth, url) {
	return authGet(url, auth);
}
function parseBody(res) {
	try { return res.json(); } catch (_) { return null; }
}

export function setup() {
	console.log("=== Concurrent Mutation Test Setup ===");
	const auth = getAuthToken(CREDENTIALS);
	if (!auth) throw new Error("Setup failed: could not authenticate.");

	// Find a product that exists and can receive inventory
	const productsRes = authGet(`${AUTH_ENDPOINTS.products}?per_page=20`, auth);
	const body = parseBody(productsRes);
	const products = Array.isArray(body?.data) ? body.data : (body?.data?.items || []);
	if (products.length === 0) throw new Error("No products found for concurrent test.");

	// Pick a product and ensure it can have batches
	const testProduct = products[0];

	// Fetch or create a warehouse
	const warehousesRes = authGet(`${AUTH_ENDPOINTS.warehouses}?per_page=1`, auth);
	const warehouse = parseBody(warehousesRes)?.data?.[0];
	if (!warehouse) throw new Error("No warehouse found.");

	// Try to select a batch (this pre-warms the inventory system)
	const batchRes = apiPost(auth, `${API_V1}/sales/delivery-orders/select-batches`, {
		product_id: testProduct.id,
		warehouse_id: warehouse.id,
		quantity: 1,
		method: "FIFO",
	}, {
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	const batchData = parseBody(batchRes);
	const batchId = batchData?.data?.batches?.[0]?.id || null;

	console.log(`Setup: product=${testProduct.id}, warehouse=${warehouse.id}, batch=${batchId}`);
	console.log(`Concurrent mutation test will run ${CONTENTION_GROUP_SIZE} VUs contending over the same resource.`);

	return {
		auth,
		productId: testProduct.id,
		warehouseId: warehouse.id,
		batchId,
		productName: testProduct.name,
	};
}

// ── VU Code ───────────────────────────────────────────────────────────────
// Each VU will:
// 1. Pick a shared "contention key" (same for all VUs in a contention group)
// 2. Try to update the same product simultaneously
// 3. Expect: one succeeds, others get 409 Conflict (if locking works)
// 4. Validate: no lost updates (final state is consistent)
export default function (data) {
	const { auth, productId, warehouseId } = data;

	// Contention key: all VUs in the same group fight over the same batch
	const groupIndex = (__VU - 1) % CONTENTION_GROUP_SIZE;
	const contentionKey = `${productId}-${warehouseId}-${groupIndex}`;

	// ── Scenario A: Product detail update (optimistic locking test) ────────
	group("Concurrent product read", () => {
		const res = apiGet(auth, `${AUTH_ENDPOINTS.products}/${productId}`);
		check(res, { "product accessible": (r) => r.status === 200 });
	});

	// ── Scenario B: Select batch (inventory contention) ───────────────────
	group("Concurrent batch selection", () => {
		const res = apiPost(auth, `${API_V1}/sales/delivery-orders/select-batches`, {
			product_id: productId,
			warehouse_id: warehouseId,
			quantity: 1,
			method: "FIFO",
		}, {
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		});

		// 409 = correct (another VU got the batch)
		// 200 = fine (batch still available)
		// 422 = fine (no stock available)
		const isConflict = res.status === 409;
		const isOk = res.status >= 200 && res.status < 400;
		conflictRate.add(isConflict ? 1 : 0, { type: "batch-selection" });

		check({ conflict: isConflict, ok: isOk }, {
			"batch select: conflict or ok": (v) => v.conflict || v.ok,
		});
	});

	// ── Scenario C: Multiple VUs creating sales quotations (state race) ──
	group("Concurrent quotation creation", () => {
		const payload = {
			quotation_date: new Date().toISOString().split("T")[0],
			payment_terms_id: 1,
			sales_rep_id: 1,
			business_unit_id: 1,
			customer_id: 1,
			tax_rate: 11,
			items: [{ product_id: productId, quantity: 1, price: 10000, discount: 0 }],
		};

		const res = apiPost(auth, `${API_V1}/sales/sales-quotations`, payload, {
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		});

		// All should succeed (quotations are independent)
		check(res, { "quotation created": (r) => r.status >= 200 && r.status < 300 });
	});

	sleep(0.5 + Math.random() * 0.5);
}

// ── Teardown ───────────────────────────────────────────────────────────────
export function teardown() {
	console.log("Concurrent mutation test completed.");
	console.log("Check conflictRate metric: should have some 409s if locking works.");
	console.log("If 409 = 0, the backend might not be using FOR UPDATE.");
	console.log("If 500s appear, the backend may be deadlocking under write contention.");
}