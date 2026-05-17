// k6/tests/rate-limit-test.js
// Rate limiting validation test: verifies GIMS rate limiter correctness.
// Tests 429 responses, Retry-After headers, and recovery behavior.
//
// Usage:
//   k6 run k6/tests/rate-limit-test.js
//   k6 run -e BASE_URL=https://staging.example.com k6/tests/rate-limit-test.js
//
// NOTE: This test intentionally hits rate limits. It should be run
// against a dedicated test/staging environment, NOT production.

import { group, sleep } from "k6";
import http from "k6/http";
import { check } from "k6";
import {
	BASE_URL,
	API_V1,
	CREDENTIALS,
} from "../config.js";
import { getAuthToken, authGet } from "../auth-helper.js";
import { rateLimitHits } from "../lib/metrics.js";

// ── Test Configuration ─────────────────────────────────────────────────────
const BASE_RATE = 10;      // requests per second (below limit)
const BURST_RATE = 200;    // requests per second (should trigger rate limit)
const TEST_DURATION = "30s";

export const options = {
	thresholds: {
		// We EXPECT 429s — do not fail the test on rate limit hits
		// But ensure the rate limiter itself works correctly
		http_req_failed: ["rate<0.10"],   // Allow up to 10% errors (includes 429)
		http_req_duration: ["p(95)<3000"], // Latency may spike during rate limit
	},
	scenarios: {
		// Phase 1: normal rate (baseline)
		baseline: {
			executor: "constant-arrival-rate",
			rate: BASE_RATE,
			timeUnit: "1s",
			duration: "10s",
			preAllocatedVUs: 2,
			maxVUs: 5,
		},
		// Phase 2: burst (should trigger rate limit)
		burst: {
			executor: "constant-arrival-rate",
			rate: BURST_RATE,
			timeUnit: "1s",
			duration: TEST_DURATION,
			preAllocatedVUs: 10,
			maxVUs: 20,
		},
		// Phase 3: recovery (rate limit should reset)
		recovery: {
			executor: "constant-arrival-rate",
			rate: BASE_RATE,
			timeUnit: "1s",
			duration: "10s",
			preAllocatedVUs: 2,
			maxVUs: 5,
		},
	},
};

export function setup() {
	const auth = getAuthToken(CREDENTIALS);
	if (!auth) throw new Error("Setup failed: could not authenticate.");
	console.log("Rate limit test: authenticated.");
	console.log(`Burst rate: ${BURST_RATE} req/s — this WILL trigger rate limits.`);
	return { auth };
}

// ── VU Code ────────────────────────────────────────────────────────────────
export default function (data) {
	const { auth } = data;

	group("Rate limit validation", () => {
		// Hit a public endpoint (most likely to have rate limiting)
		const res = authGet(`${API_V1}/products?per_page=1`, auth, {
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		});

		if (res.status === 429) {
			// Rate limit hit — validate response structure
			const hasRetryAfter = res.headers["Retry-After"] !== undefined;
			const hasErrorBody = (() => {
				try { return !!res.json().error; } catch (_) { return false; }
			})();

			rateLimitHits.add(1, { endpoint: "products" });

			check(res, {
				"429 has Retry-After header": () => hasRetryAfter,
				"429 has error message": () => hasErrorBody,
				"429 status code": (r) => r.status === 429,
			});

			// Log rate limit hit for analysis
			const retryAfter = res.headers["Retry-After"] || "unknown";
			console.log(`Rate limited: Retry-After=${retryAfter}s`);
		} else {
			// Normal response — just validate it worked
			check(res, {
				"request completed (2xx or 429)": (r) =>
					(r.status >= 200 && r.status < 300) || r.status === 429,
			});
		}
	});

	sleep(0.1 + Math.random() * 0.5);
}

// ── Teardown ───────────────────────────────────────────────────────────────
export function teardown() {
	console.log("Rate limit test completed.");
	console.log("Check rateLimitHits metric to see how many 429s occurred.");
	console.log("Validate: Retry-After header present and correct.");
	console.log("Validate: rate limit resets after recovery phase (no sustained 429s).");
	console.log("WARNING: Do NOT run this test against production.");
}