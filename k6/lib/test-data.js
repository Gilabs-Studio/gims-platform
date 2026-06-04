// k6/lib/test-data.js
// Centralized test data module for GIMS k6 performance suite.
// Loads seed-state from environment or setup, validates required entities,
// and provides typed accessors for seeded test data.
//
// Usage:
//   import { testData } from './lib/test-data.js';
//   testData.load(setupData);
//   testData.requireForProfile('load', ['company', 'user', 'product', 'customer']);
//   const product = testData.get('product');

// ── Profile Requirements ─────────────────────────────────────────────────────
// Each profile declares which entities it needs. If missing, the profile fails fast.

const PROFILE_REQUIREMENTS = {
	smoke: ["company", "user"],
	load: [
		"company",
		"user",
		"product",
		"customer",
		"warehouse",
		"supplier",
		"paymentTerms",
		"salesRep",
		"businessUnit",
	],
	stress: ["company", "user", "product", "customer", "warehouse"],
	spike: ["company", "user", "product", "customer"],
	soak: ["company", "user", "product", "customer", "warehouse"],
	breakpoint: ["company", "user", "product", "customer"],
	"security-negative": ["company", "user"],
	"domain-concurrency": [
		"company",
		"user",
		"employee",
		"product",
		"warehouse",
		"coaDebit",
		"coaCredit",
	],
	"browser-dashboard": ["company", "user"],
	profiler: ["company", "user"],
};

// ── Test Data Store ──────────────────────────────────────────────────────────

class TestDataStore {
	constructor() {
		this._data = {};
		this._loaded = false;
	}

	/**
	 * Load seed state from setup data object.
	 * Maps setup fields to normalized entity keys.
	 */
	load(setupData) {
		if (!setupData) {
			console.warn("[test-data] No setup data provided");
			return;
		}

		const mergedSetupData = {
			...this._normalizeSeedState(setupData.seedState),
			...setupData,
		};

		// Map from setup data fields to entity types
		const mapping = {
			company: mergedSetupData.companyId,
			user: mergedSetupData.auth
				? mergedSetupData.auth.user || mergedSetupData.auth
				: mergedSetupData.userId,
			product: mergedSetupData.productId,
			customer: mergedSetupData.customerId,
			supplier: mergedSetupData.supplierId,
			warehouse: mergedSetupData.warehouseId,
			employee: mergedSetupData.employeeId,
			coaDebit: mergedSetupData.coaDebitId,
			coaCredit: mergedSetupData.coaCreditId,
			paymentTerms: mergedSetupData.paymentTermsId,
			bankAccount: mergedSetupData.bankAccountId,
			leaveType: mergedSetupData.leaveTypeId,
			outlet: mergedSetupData.outletId,
			businessUnit: mergedSetupData.businessUnitId,
			salesRep: mergedSetupData.salesRepId,
			store: mergedSetupData.storeId,
		};

		for (const [key, value] of Object.entries(mapping)) {
			if (value && value !== "SETUP_MISSING") {
				this._data[key] = value;
			}
		}

		// Store full auth for convenience
		if (setupData.auth) {
			this._data._auth = setupData.auth;
			// If user is not explicitly set but auth exists, mark user as available
			if (!this._data.user && setupData.auth.token) {
				this._data.user = setupData.auth.user || {
					token: setupData.auth.token,
				};
			}
		}

		// Store raw setup data for custom access
		this._data._raw = setupData;

		this._loaded = true;
	}

	_normalizeSeedState(seedState) {
		if (!seedState) return {};

		const idOf = (entity) => {
			if (!entity || entity === "SETUP_MISSING") return null;
			return typeof entity === "object" ? entity.id : entity;
		};

		return {
			companyId: idOf(seedState.company),
			userId: idOf(seedState.user),
			productId: idOf(seedState.product),
			customerId: idOf(seedState.customer),
			supplierId: idOf(seedState.supplier),
			warehouseId: idOf(seedState.warehouse),
			employeeId: idOf(seedState.employee),
			coaDebitId: idOf(seedState.coaDebit),
			coaCreditId: idOf(seedState.coaCredit),
			paymentTermsId: idOf(seedState.paymentTerms),
			bankAccountId: idOf(seedState.bankAccount),
			leaveTypeId: idOf(seedState.leaveType),
			outletId: idOf(seedState.outlet),
			businessUnitId: idOf(seedState.businessUnit),
			salesRepId:
				idOf(seedState.salesRep) ||
				idOf(seedState.employee) ||
				idOf(seedState.user),
			storeId: idOf(seedState.store),
		};
	}

	/**
	 * Get a seeded entity value by key.
	 * Returns null if not available.
	 */
	get(key) {
		return this._data[key] || null;
	}

	/**
	 * Get the full auth object.
	 */
	getAuth() {
		return this._data._auth || null;
	}

	/**
	 * Get raw setup data.
	 */
	getRaw() {
		return this._data._raw || {};
	}

	/**
	 * Check if an entity is available.
	 */
	has(key) {
		return !!this._data[key];
	}

	/**
	 * Validate that all required entities for a profile are present.
	 * Fails fast with actionable error if any are missing.
	 */
	requireForProfile(profile, additionalRequirements) {
		const baseReqs = PROFILE_REQUIREMENTS[profile] || [];
		const reqs = [...new Set([...baseReqs, ...(additionalRequirements || [])])];

		const missing = reqs.filter((req) => !this.has(req));

		if (missing.length > 0) {
			const msg = [
				`[test-data] Profile "${profile}" requires entities that are missing:`,
				`  Missing: ${missing.join(", ")}`,
				`  Available: ${Object.keys(this._data)
					.filter((k) => !k.startsWith("_"))
					.join(", ")}`,
				"",
				"  To fix:",
				"  1. Ensure the backend is running and seeded with test data",
				"  2. Run: pnpm k6:seed (when available)",
				"  3. Or manually create the missing entities via API",
			].join("\n");

			throw new Error(msg);
		}
	}

	/**
	 * Require specific entities (custom, not profile-based).
	 * Throws with actionable error if missing.
	 */
	require(entities, context) {
		const missing = entities.filter((e) => !this.has(e));
		if (missing.length > 0) {
			throw new Error(
				`[test-data] ${context || "Test"} requires: ${missing.join(", ")}. ` +
					`Available: ${Object.keys(this._data)
						.filter((k) => !k.startsWith("_"))
						.join(", ")}`,
			);
		}
	}

	/**
	 * Get multiple entities as an object. Useful for scenario setup.
	 */
	getMany(keys) {
		const result = {};
		for (const key of keys) {
			result[key] = this.get(key);
		}
		return result;
	}

	/**
	 * Print loaded state summary.
	 */
	printSummary() {
		const available = Object.keys(this._data).filter((k) => !k.startsWith("_"));
		console.log(
			`[test-data] Loaded ${available.length} entities: ${available.join(", ")}`,
		);
	}
}

// ── Singleton Export ─────────────────────────────────────────────────────────

export const testData = new TestDataStore();
