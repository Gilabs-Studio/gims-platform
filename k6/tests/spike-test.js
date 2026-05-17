// k6/tests/spike-test.js
// Spike test: simulates sudden traffic bursts (flash sales, marketing campaigns).
// Validates that GIMS survives sudden load spikes without cascading failures.
//
// Usage:
//   k6 run k6/tests/spike-test.js
//   k6 run -e BASE_URL=https://staging.example.com k6/tests/spike-test.js
//
// Spike pattern: baseline → spike → recover → spike → cooldown

import { group, sleep } from "k6";
import { check } from "k6";
import {
	BASE_URL,
	API_V1,
	AUTH_ENDPOINTS,
	CREDENTIALS,
	THRESHOLDS,
} from "../config.js";
import { getAuthToken, authGet } from "../auth-helper.js";

// ── Test Configuration ─────────────────────────────────────────────────────
const BASELINE_VUS = 5;
const SPIKE_VUS = 40;          // 8x baseline — typical flash sale multiplier
const SPIKE_DURATION = "20s";  // How long to hold the spike
const RECOVERY_DURATION = "30s";

export const options = {
	thresholds: {
		// Availability: must stay up even during spike
		http_req_failed: ["rate<0.02"],    // Allow 2% errors during spike (graceful degradation)
		// Latency: should recover after spike subsides
		http_req_duration: ["p(95)<1000", "p(99)<2000"],
		// Custom: no cascading failures (abort if error rate goes above 5%)
		"http_req_failed{scenario:spike}": ["rate<0.05"],
	},
	scenarios: {
		// Spike 1: initial burst
		spike_1: {
			executor: "ramping-vus",
			startVUs: BASELINE_VUS,
			stages: [
				{ duration: "10s", target: BASELINE_VUS },     // steady baseline
				{ duration: "5s", target: SPIKE_VUS },         // sudden spike UP
				{ duration: SPIKE_DURATION, target: SPIKE_VUS },  // hold spike
				{ duration: "10s", target: BASELINE_VUS },     // recover to baseline
				{ duration: RECOVERY_DURATION, target: BASELINE_VUS }, // cooldown
			],
			gracefulRampDown: "5s",
		},
		// Spike 2: second burst (validates repeatable behavior)
		spike_2: {
			executor: "ramping-vus",
			startVUs: 0,
			stages: [
				{ duration: "5s", target: BASELINE_VUS },    // warmup
				{ duration: "5s", target: SPIKE_VUS },         // spike
				{ duration: SPIKE_DURATION, target: SPIKE_VUS },  // hold
				{ duration: "5s", target: BASELINE_VUS },     // recover
				{ duration: "10s", target: 0 },                // end
			],
			gracefulRampDown: "5s",
		},
	},
};

// ── Setup ─────────────────────────────────────────────────────────────────
export function setup() {
	const auth = getAuthToken(CREDENTIALS);
	if (!auth) throw new Error("Setup failed: could not authenticate.");
	console.log("Spike test: authenticated and ready.");
	return { auth };
}

// ── VU Code ────────────────────────────────────────────────────────────────
export default function (data) {
	const { auth } = data;

	// ── Hit critical endpoints every iteration ─────────────────────────────
	group("Core reads", () => {
		authGet(AUTH_ENDPOINTS.products, auth, {
			tags: { name: "spike:products", scenario: "spike" },
		});
		authGet(AUTH_ENDPOINTS.customers, auth, {
			tags: { name: "spike:customers", scenario: "spike" },
		});
		authGet(AUTH_ENDPOINTS.orders, auth, {
			tags: { name: "spike:sales-orders", scenario: "spike" },
		});
		authGet(AUTH_ENDPOINTS.dashboard, auth, {
			tags: { name: "spike:dashboard", scenario: "spike" },
		});
	});

	// ── 50% chance: detail reads (higher during spike = more stress) ───────
	const vuId = Number(__VU) || 0;
	if (vuId % 2 === 0) {
		authGet(AUTH_ENDPOINTS.quotations, auth, {
			tags: { name: "spike:quotations", scenario: "spike" },
		});
		authGet(AUTH_ENDPOINTS.purchaseOrders, auth, {
			tags: { name: "spike:purchase-orders", scenario: "spike" },
		});
	}

	sleep(0.1 + Math.random() * 0.5);
}

// ── Teardown ───────────────────────────────────────────────────────────────
export function teardown() {
	console.log("Spike test completed. Check thresholds for recovery behavior.");
}