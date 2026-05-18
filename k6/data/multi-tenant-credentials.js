// k6/data/multi-tenant-credentials.js
// Multi-tenant test credentials for GIMS k6 tests.
// Each tenant represents a different role in the system.

import { SharedArray } from "k6/data";

export const multiTenantCredentials = new SharedArray("tenant-credentials", () => [
	{
		email: "admin@gilabs.com",
		password: __ENV.TEST_PASSWORD || "admin123",
		role: "admin",
		tenant: "Gilabs HQ",
		description: "Full admin access — all modules",
	},
	{
		email: "finance@gilabs.com",
		password: __ENV.TEST_PASSWORD || "admin123",
		role: "finance_officer",
		tenant: "Gilabs HQ",
		description: "Finance module focus — journals, COA, invoices",
	},
	{
		email: "sales@gilabs.com",
		password: __ENV.TEST_PASSWORD || "admin123",
		role: "sales_rep",
		tenant: "Gilabs HQ",
		description: "Sales module focus — quotations, orders, deliveries",
	},
	{
		email: "warehouse@gilabs.com",
		password: __ENV.TEST_PASSWORD || "admin123",
		role: "warehouse_manager",
		tenant: "Gilabs HQ",
		description: "Inventory module focus — stock, opnames",
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