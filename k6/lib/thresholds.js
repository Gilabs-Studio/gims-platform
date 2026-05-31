// k6/lib/thresholds.js
// Centralized threshold definitions for all GIMS k6 profiles.
// Each profile gets its own k6 options with appropriate thresholds and workload config.
//
// Usage:
//   import { getProfileOptions } from './lib/thresholds.js';
//   export const options = getProfileOptions('smoke');
//
// Tier-based thresholds:
//   crud     → single-entity ops (GET by ID, POST create, PATCH update)
//   list     → paginated collection queries
//   report   → heavy aggregation/report endpoints
//   workflow  → multi-step E2E business processes

import { envGuard } from "./env-guard.js";

// ── Tier Latency Targets (ms) ────────────────────────────────────────────────

const STRICT_TIERS = {
	crud: { p95: 300, p99: 800 },
	list: { p95: 800, p99: 1500 },
	report: { p95: 1500, p99: 3000 },
	workflow: { p95: 2000, p99: 4000 },
};

const RELAXED_TIERS = {
	crud: { p95: 5000, p99: 10000 },
	list: { p95: 5000, p99: 10000 },
	report: { p95: 10000, p99: 15000 },
	workflow: { p95: 10000, p99: 15000 },
};

export function getTierTargets() {
	return envGuard.useRelaxedThresholds() ? RELAXED_TIERS : STRICT_TIERS;
}

// ── Profile Threshold Definitions ────────────────────────────────────────────

function buildTieredThresholds(errorRate, tiers) {
	return {
		http_req_failed: [`rate<${errorRate}`],
		"http_req_duration{tier:crud}": [`p(95)<${tiers.crud.p95}`],
		"http_req_duration{tier:list}": [`p(95)<${tiers.list.p95}`],
		"http_req_duration{tier:report}": [`p(95)<${tiers.report.p95}`],
		"http_req_duration{tier:workflow}": [`p(95)<${tiers.workflow.p95}`],
	};
}

const PROFILE_THRESHOLDS = {
	smoke: (tiers) => ({
		http_req_failed: ["rate==0"], // Zero HTTP errors for smoke
		checks: ["rate==1"], // All k6 checks must pass
		http_req_duration: [`p(95)<${tiers.crud.p95 * 2}`],
	}),

	load: (tiers) => ({
		...buildTieredThresholds(0.01, tiers),
		checks: ["rate>=0.95"], // 95% of checks must pass
		http_req_duration: [`p(95)<${tiers.list.p95}`, `p(99)<${tiers.list.p99}`],
	}),

	stress: (tiers) => ({
		// Stress is diagnostic — relaxed thresholds, we want to find the breaking point
		http_req_failed: ["rate<0.10"],
		http_req_duration: [`p(95)<${tiers.workflow.p99 * 2}`],
	}),

	spike: (tiers) => ({
		// Spike validates recovery — allow some errors during burst, but recovery must be clean
		http_req_failed: ["rate<0.05"],
		http_req_duration: [`p(95)<${tiers.workflow.p99}`],
	}),

	soak: (tiers) => ({
		// Soak validates stability — strict error rate, moderate latency
		http_req_failed: ["rate<0.01"],
		checks: ["rate>=0.95"],
		http_req_duration: [
			`p(95)<${tiers.list.p95 * 1.5}`,
			`p(99)<${tiers.list.p99 * 1.5}`,
		],
	}),

	breakpoint: () => ({
		// Breakpoint is purely diagnostic — no thresholds that would abort
		http_req_failed: ["rate<0.50"],
	}),

	"security-negative": () => ({
		// Security tests use custom metrics for assertion correctness.
		// http_req_failed is irrelevant here — 4xx are expected, not failures.
		checks: ["rate>=0.95"],
		http_req_duration: [`p(95)<1000`],
		gims_auth_violations: ["count==0"],
		gims_csrf_violations: ["count==0"],
		gims_tenant_isolation_violations: ["count==0"],
	}),

	"domain-concurrency": (tiers) => ({
		// Concurrency profiles intentionally probe conflict paths, so 4xx business
		// rejections are EXPECTED. Gate only on SUCCESSFUL responses staying fast,
		// server errors staying rare, and business invariants holding.
		"http_req_failed{expected_response:true}": ["rate<0.05"],
		"http_req_duration{tier:crud}": [`p(95)<${tiers.crud.p95 * 1.5}`],
		"http_req_duration{tier:workflow}": [`p(95)<${tiers.workflow.p95 * 1.5}`],
		// Hard invariants — any violation fails the run.
		gims_attendance_double_clock_in: ["count==0"],
		gims_finance_double_post: ["count==0"],
		gims_pos_double_payment: ["count==0"],
	}),

	"browser-dashboard": () => ({
		// Browser metrics use different measurement (Web Vitals)
		browser_web_vital_lcp: ["p(95)<2500"],
		browser_web_vital_fid: ["p(95)<100"],
		browser_web_vital_cls: ["p(95)<0.1"],
	}),

	profiler: (tiers) => ({
		...buildTieredThresholds(0.01, tiers),
		checks: ["rate>=0.90"],
	}),
};

// ── Profile Workload Definitions ─────────────────────────────────────────────

function getProfileWorkload(profile) {
	const vus = parseInt(__ENV.VUS || "0", 10);
	const duration = __ENV.DURATION || "";

	switch (profile) {
		case "smoke":
			return {
				executor: "constant-vus",
				vus: envGuard.clampVUs(vus || 1),
				duration: duration || "30s",
			};

		case "load":
			return {
				executor: "ramping-vus",
				startVUs: 0,
				stages: [
					{ duration: "2m", target: envGuard.clampVUs(vus || 20) },
					{ duration: "5m", target: envGuard.clampVUs(vus || 20) },
					{ duration: "2m", target: 0 },
				],
			};

		case "stress":
			return {
				executor: "ramping-vus",
				startVUs: 0,
				stages: [
					{ duration: "2m", target: envGuard.clampVUs(20) },
					{ duration: "5m", target: envGuard.clampVUs(vus || 50) },
					{
						duration: "3m",
						target: envGuard.clampVUs(parseInt(__ENV.MAX_VUS || "100", 10)),
					},
					{
						duration: "2m",
						target: envGuard.clampVUs(parseInt(__ENV.MAX_VUS || "100", 10)),
					},
					{ duration: "2m", target: 0 },
				],
			};

		case "spike":
			return {
				executor: "ramping-vus",
				startVUs: envGuard.clampVUs(10),
				stages: [
					{ duration: "1m", target: envGuard.clampVUs(10) },
					{ duration: "10s", target: envGuard.clampVUs(vus || 200) },
					{ duration: "1m", target: envGuard.clampVUs(10) },
					{ duration: "10s", target: envGuard.clampVUs(vus || 200) },
					{ duration: "1m", target: envGuard.clampVUs(10) },
					{ duration: "30s", target: 0 },
				],
			};

		case "soak":
			return {
				executor: "constant-vus",
				vus: envGuard.clampVUs(vus || 30),
				duration: duration || "60m",
			};

		case "breakpoint":
			return {
				executor: "ramping-arrival-rate",
				startRate: 10,
				timeUnit: "1s",
				preAllocatedVUs: envGuard.clampVUs(50),
				maxVUs: envGuard.clampVUs(parseInt(__ENV.MAX_VUS || "300", 10)),
				stages: [
					{ duration: "2m", target: 20 },
					{ duration: "3m", target: 50 },
					{ duration: "3m", target: 100 },
					{ duration: "3m", target: 200 },
					{ duration: "2m", target: 300 },
				],
			};

		case "security-negative":
			return {
				executor: "constant-vus",
				vus: envGuard.clampVUs(vus || 10),
				duration: duration || "2m",
			};

		case "domain-concurrency":
			if (duration) {
				return {
					executor: "constant-vus",
					vus: envGuard.clampVUs(vus || 20),
					duration,
				};
			}
			return {
				executor: "ramping-vus",
				startVUs: 0,
				stages: [
					{ duration: "1m", target: envGuard.clampVUs(vus || 20) },
					{ duration: "3m", target: envGuard.clampVUs(vus || 20) },
					{ duration: "1m", target: 0 },
				],
			};

		case "browser-dashboard":
			return {
				executor: "constant-vus",
				vus: envGuard.clampVUs(vus || 1),
				duration: duration || "1m",
				options: { browser: { type: "chromium" } },
			};

		default:
			return {
				executor: "constant-vus",
				vus: envGuard.clampVUs(vus || 5),
				duration: duration || "1m",
			};
	}
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get complete k6 options for a profile.
 * Includes scenarios, thresholds, and environment-appropriate settings.
 */
export function getProfileOptions(profile, scenarioName) {
	envGuard.assertCanRun(profile);

	const tiers = getTierTargets();
	const thresholdFn = PROFILE_THRESHOLDS[profile];
	const thresholds = thresholdFn
		? thresholdFn(tiers)
		: buildTieredThresholds(0.01, tiers);
	const workload = getProfileWorkload(profile);

	const scenario = scenarioName || profile;

	return {
		scenarios: {
			[scenario]: workload,
		},
		thresholds,
	};
}

/**
 * Get thresholds only (for merging into custom options).
 */
export function getProfileThresholds(profile) {
	const tiers = getTierTargets();
	const thresholdFn = PROFILE_THRESHOLDS[profile];
	return thresholdFn ? thresholdFn(tiers) : buildTieredThresholds(0.01, tiers);
}

/**
 * Get workload config only (for merging into custom options).
 */
export function getProfileWorkloadConfig(profile) {
	return getProfileWorkload(profile);
}

/**
 * Get tier targets for external use (e.g., report analyzer).
 */
export { STRICT_TIERS, RELAXED_TIERS };
