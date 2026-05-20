// k6/data/multi-tenant-credentials.js
// Multi-tenant test credentials for GIMS k6 tests.
// Each tenant represents a different role in the system.

import { SharedArray } from "k6/data";

export const multiTenantCredentials = new SharedArray("tenant-credentials", () => [
	{
		email: __ENV.SEED_DEFAULT_EMAIL || "admin@example.com",
		password: __ENV.SEED_DEFAULT_PASSWORD || "admin123",
		role: "admin",
		tenant: "Gilabs HQ",
		description: "Full admin access — all modules",
	},
	{
		email: "manager@example.com",
		password: __ENV.SEED_DEFAULT_PASSWORD || "admin123",
		role: "manager",
		tenant: "Gilabs HQ",
		description: "Manager access — approvals, reports",
	},
	{
		email: "staff@example.com",
		password: __ENV.SEED_DEFAULT_PASSWORD || "admin123",
		role: "staff",
		tenant: "Gilabs HQ",
		description: "Staff access — day-to-day operations",
	},
	{
		email: "viewer@example.com",
		password: __ENV.SEED_DEFAULT_PASSWORD || "admin123",
		role: "viewer",
		tenant: "Gilabs HQ",
		description: "Read-only access — dashboards, reports",
	},
]);

/**
 * Get the credential for a given VU index (round-robin distribution).
 * @param {number} vuIndex - 1-based VU index from __VU
 * @returns {object} credential object
 */
export function getCredentialForVU(vuIndex) {
	return multiTenantCredentials[(vuIndex - 1) % multiTenantCredentials.length];
}