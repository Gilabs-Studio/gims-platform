// k6/lib/env-guard.js
// Environment safety guard for GIMS k6 performance suite.
// Prevents destructive or high-load profiles from running against production accidentally.
//
// Environment ladder:
//   local      → developer feedback, relaxed thresholds, seeded data, destructive allowed
//   staging    → primary release gate, strict thresholds, isolated seed data
//   production → smoke-only by default, read-only/safe low-volume, destructive blocked
//
// Usage:
//   import { envGuard } from './lib/env-guard.js';
//   envGuard.assertCanRun('load');        // throws if environment disallows this profile
//   envGuard.assertCanSeed();             // throws if seeding is not allowed
//   envGuard.assertCanDestroy();          // throws if destructive ops are not allowed
//
// Environment detection:
//   K6_ENV=local|staging|production (default: local)
//   K6_UNLOCK_PRODUCTION=true (explicit unlock for non-smoke production runs)

// ── Environment Detection ────────────────────────────────────────────────────

const ENV = (__ENV.K6_ENV || "local").toLowerCase();
const UNLOCK_PRODUCTION = __ENV.K6_UNLOCK_PRODUCTION === "true";

const VALID_ENVS = ["local", "staging", "production"];

if (!VALID_ENVS.includes(ENV)) {
	throw new Error(
		`[env-guard] Invalid K6_ENV="${ENV}". Must be one of: ${VALID_ENVS.join(", ")}`,
	);
}

// ── Profile Permission Matrix ────────────────────────────────────────────────
// Each profile has a set of environments where it's allowed to run.
// Production requires explicit unlock for anything beyond smoke.

const PROFILE_PERMISSIONS = {
	smoke: { local: true, staging: true, production: true },
	load: { local: true, staging: true, production: false },
	stress: { local: true, staging: true, production: false },
	spike: { local: true, staging: true, production: false },
	soak: { local: true, staging: true, production: false },
	breakpoint: { local: true, staging: true, production: false },
	"security-negative": { local: true, staging: true, production: false },
	"domain-concurrency": { local: true, staging: true, production: false },
	"browser-dashboard": { local: true, staging: true, production: false },
	profiler: { local: true, staging: true, production: false },
	seed: { local: true, staging: true, production: false },
};

// Profiles that can be unlocked for production with K6_UNLOCK_PRODUCTION=true
// Only read-only, low-volume profiles are unlockable. security-negative is NOT
// unlockable because it includes rate-limit bursts and mutation CSRF probes.
const UNLOCKABLE_PROFILES = ["smoke", "load"];

// ── Capability Flags ─────────────────────────────────────────────────────────

const CAPABILITIES = {
	local: {
		canSeed: true,
		canDestroy: true,
		canHighLoad: true,
		canBrowser: true,
		maxVUs: Infinity,
		relaxedThresholds: true,
	},
	staging: {
		canSeed: true,
		canDestroy: true,
		canHighLoad: true,
		canBrowser: true,
		maxVUs: 500,
		relaxedThresholds: false,
	},
	production: {
		canSeed: false,
		canDestroy: false,
		canHighLoad: false,
		canBrowser: false,
		maxVUs: 5,
		relaxedThresholds: false,
	},
};

// ── Guard Implementation ─────────────────────────────────────────────────────

class EnvironmentGuard {
	constructor() {
		this.env = ENV;
		this.unlocked = UNLOCK_PRODUCTION;
		this.capabilities = CAPABILITIES[ENV];
	}

	/**
	 * Get the current environment name.
	 */
	getEnv() {
		return this.env;
	}

	/**
	 * Check if running in a specific environment.
	 */
	isLocal() {
		return this.env === "local";
	}
	isStaging() {
		return this.env === "staging";
	}
	isProduction() {
		return this.env === "production";
	}

	/**
	 * Check if a profile is allowed to run in the current environment.
	 * Returns true/false without throwing.
	 */
	canRunProfile(profile) {
		const perms = PROFILE_PERMISSIONS[profile];
		if (!perms) {
			// Unknown profile — allow in local/staging, block in production
			return this.env !== "production";
		}

		const allowed = perms[this.env];
		if (!allowed && this.isProduction() && this.unlocked) {
			return UNLOCKABLE_PROFILES.includes(profile);
		}
		return allowed;
	}

	/**
	 * Assert that a profile can run. Throws with actionable error if not.
	 */
	assertCanRun(profile) {
		if (!this.canRunProfile(profile)) {
			const msg = this.isProduction()
				? `[env-guard] Profile "${profile}" is BLOCKED in production. ` +
					(UNLOCKABLE_PROFILES.includes(profile)
						? "Set K6_UNLOCK_PRODUCTION=true to override."
						: "This profile cannot run in production even with unlock.")
				: `[env-guard] Profile "${profile}" is not allowed in environment "${this.env}".`;
			throw new Error(msg);
		}
	}

	/**
	 * Assert that seed data creation is allowed.
	 */
	assertCanSeed() {
		if (!this.capabilities.canSeed) {
			throw new Error(
				`[env-guard] Seed data creation is BLOCKED in ${this.env}. ` +
					"Seeding is only allowed in local and staging environments.",
			);
		}
	}

	/**
	 * Assert that destructive operations are allowed.
	 */
	assertCanDestroy() {
		if (!this.capabilities.canDestroy) {
			throw new Error(
				`[env-guard] Destructive operations are BLOCKED in ${this.env}. ` +
					"Destructive tests are only allowed in local and staging environments.",
			);
		}
	}

	/**
	 * Assert that high-load testing is allowed.
	 */
	assertCanHighLoad() {
		if (!this.capabilities.canHighLoad) {
			throw new Error(
				`[env-guard] High-load testing is BLOCKED in ${this.env}. ` +
					"High-load profiles are only allowed in local and staging environments.",
			);
		}
	}

	/**
	 * Get the maximum VUs allowed for the current environment.
	 */
	getMaxVUs() {
		return this.capabilities.maxVUs;
	}

	/**
	 * Clamp VU count to environment maximum.
	 */
	clampVUs(requested) {
		const max = this.getMaxVUs();
		if (requested > max) {
			console.warn(
				`[env-guard] Requested ${requested} VUs exceeds ${this.env} max of ${max}. Clamping.`,
			);
			return max;
		}
		return requested;
	}

	/**
	 * Whether thresholds should be relaxed (local dev mode).
	 */
	useRelaxedThresholds() {
		return this.capabilities.relaxedThresholds;
	}

	/**
	 * Print environment info banner for test output.
	 */
	printBanner(profile) {
		this.assertCanRun(profile);
		console.log(
			"╔══════════════════════════════════════════════════════════════╗",
		);
		console.log(
			`║  GIMS k6 Performance Suite                                  ║`,
		);
		console.log(`║  Profile: ${(profile || "unknown").padEnd(49)}║`);
		console.log(`║  Environment: ${this.env.padEnd(46)}║`);
		console.log(`║  Max VUs: ${String(this.getMaxVUs()).padEnd(49)}║`);
		console.log(
			`║  Relaxed: ${String(this.useRelaxedThresholds()).padEnd(49)}║`,
		);
		if (this.isProduction()) {
			console.log(
				`║  ⚠️  PRODUCTION MODE — Limited operations only              ║`,
			);
		}
		console.log(
			"╚══════════════════════════════════════════════════════════════╝",
		);
	}
}

// ── Singleton Export ─────────────────────────────────────────────────────────

export const envGuard = new EnvironmentGuard();
