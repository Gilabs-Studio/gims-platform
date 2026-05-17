// k6/tests/soak-test.js
// Soak test: validates GIMS stability over extended periods.
// Detects memory leaks, connection pool exhaustion, slow DB query drift.
//
// Usage:
//   k6 run k6/tests/soak-test.js
//   k6 run -e VUS=30 -e DURATION=60m k6/tests/soak-test.js
//
// Recommended: run this weekly as a health check (CI/CD scheduled job).

import { group, sleep } from "k6";
import { check } from "k6";
import {
	AUTH_ENDPOINTS,
	CREDENTIALS,
} from "../config.js";
import { getAuthToken, authGet } from "../auth-helper.js";

// ── Test Configuration ─────────────────────────────────────────────────────
const TARGET_VUS = Number(__ENV.VUS) || 30;
const TARGET_DURATION = __ENV.DURATION || "30m";  // Default 30 min; run 60m weekly
const RAMP_UP = "2m";
const SUSTAINED = TARGET_DURATION;
const RAMP_DOWN = "2m";

export const options = {
	// Key thresholds for soak: memory/connection drift, not just latency
	thresholds: {
		// Availability: must stay stable for the full duration
		http_req_failed: ["rate<0.005"],
		// Latency: p95 should not drift over time
		http_req_duration: ["p(95)<800", "p(99)<1500"],
		// No sustained degradation — p95 should stay consistent
		// (k6 doesn't track p95 drift natively, but if p95 > 800, fail)
	},
	scenarios: {
		soak: {
			executor: "ramping-vus",
			startVUs: 0,
			stages: [
				{ duration: RAMP_UP, target: TARGET_VUS },
				{ duration: SUSTAINED, target: TARGET_VUS },
				{ duration: RAMP_DOWN, target: 0 },
			],
			gracefulRampDown: "30s",
		},
	},
};

// ── Setup ─────────────────────────────────────────────────────────────────
export function setup() {
	const auth = getAuthToken(CREDENTIALS);
	if (!auth) throw new Error("Setup failed: could not authenticate.");

	// Pre-fetch IDs for read endpoints
	const products = authGet(AUTH_ENDPOINTS.products, auth).json().data || [];
	const productIds = products.map((p) => p.id).filter(Boolean);

	console.log(`Soak test: ${productIds.length} products preloaded.`);
	console.log(`Duration: ${TARGET_DURATION} at ${TARGET_VUS} VUs.`);
	return { auth, productIds };
}

// ── VU Code ────────────────────────────────────────────────────────────────
export default function (data) {
	const { auth, productIds } = data;

	// ── Round-robin product reads (simulate inventory lookups) ─────────────
	const productId = productIds[(__VU + __ITER) % productIds.length] || null;

	group("Read-heavy operations", () => {
		// Products list (every iteration)
		authGet(AUTH_ENDPOINTS.products, auth, {
			tags: { name: "soak:products" },
		});

		// Customers list (every iteration)
		authGet(AUTH_ENDPOINTS.customers, auth, {
			tags: { name: "soak:customers" },
		});

		// Sales orders (every iteration — hot path)
		authGet(AUTH_ENDPOINTS.orders, auth, {
			tags: { name: "soak:sales-orders" },
		});

		// Dashboard (every iteration — lightweight)
		authGet(AUTH_ENDPOINTS.dashboard, auth, {
			tags: { name: "soak:dashboard" },
		});

		// Finance: COA (every iteration)
		authGet(AUTH_ENDPOINTS.coa, auth, {
			tags: { name: "soak:coa" },
		});
	});

	// ── Detail read: 30% chance per iteration ─────────────────────────────
	if (productId && Math.random() < 0.3) {
		authGet(`${AUTH_ENDPOINTS.products}/${productId}`, auth, {
			tags: { name: "soak:product-detail" },
		});
	}

	// ── HRD (20% chance): attendance is timezone-sensitive ─────────────────
	if (Math.random() < 0.2) {
		authGet(AUTH_ENDPOINTS.attendance, auth, {
			tags: { name: "soak:attendance" },
		});
	}

	sleep(1 + Math.random() * 1.5);  // 1-2.5s think time (realistic)
}

// ── Teardown ───────────────────────────────────────────────────────────────
export function teardown() {
	console.log("Soak test completed.");
	console.log("Check: p95 latency should NOT increase over time.");
	console.log("Check: error rate should remain < 0.5% throughout.");
	console.log("If p95 drifted upward, suspect: memory leak, connection pool exhaustion, slow GC.");
}