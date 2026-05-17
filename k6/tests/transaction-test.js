// k6/tests/transaction-test.js
// End-to-end transaction test: validates all 4 critical business workflows.
//
// Workflows tested:
//   1. Sales Revenue Cycle (SQ → SO → DO → Invoice → Payment)
//   2. Purchase Order Cycle (PO → Goods Receipt)
//   3. Finance Journal Entry (debit/credit atomicity)
//   4. HRD Attendance Check-In (timezone-aware)
//
// Usage:
//   k6 run k6/tests/transaction-test.js
//   k6 run -e VUS=3 -e DURATION=3m k6/tests/transaction-test.js
//   k6 run -e RELAXED=1 k6/tests/transaction-test.js

import { check, sleep, group } from "k6";
import { CREDENTIALS, API_V1 } from "../config.js";
import { getAuthToken, authGet } from "../auth-helper.js";
import { firstItem, requiredId, collectBatchableProducts, parseBody } from "../lib/helpers.js";
import { revenueCycle, revenueCycleSetup } from "../scenarios/e2e/revenue-cycle.js";
import { purchaseCycle, purchaseCycleSetup } from "../scenarios/e2e/purchase-cycle.js";
import { journalEntryCycle, journalEntrySetup } from "../scenarios/e2e/journal-entry.js";
import { attendanceCheckinCycle, attendanceCheckinSetup } from "../scenarios/e2e/attendance-checkin.js";

// ── Configuration ──────────────────────────────────────────────────────────
const VUS = Number(__ENV.VUS) || 3;
const DURATION = __ENV.DURATION || "3m";
const RELAXED = __ENV.RELAXED === "1";

export const options = {
	thresholds: RELAXED
		? {
				http_req_failed: ["rate<0.02"],          // Relaxed: allow 2% errors
				checks: ["rate>0.90"],                   // 90% checks pass
			}
		: {
				http_req_failed: ["rate<0.01"],          // Strict: < 1% errors
				http_req_duration: ["p(95)<1500", "p(99)<3000"],
				checks: ["rate>0.95"],                   // 95% checks pass
			},
	scenarios: {
		transaction_workflow: {
			executor: "ramping-vus",
			startVUs: 0,
			stages: [
				{ duration: "30s", target: VUS },
				{ duration: DURATION, target: VUS },
				{ duration: "30s", target: 0 },
			],
			gracefulRampDown: "30s",
		},
	},
};

// ── Setup ──────────────────────────────────────────────────────────────────
export function setup() {
	console.log("=== Transaction Test Setup ===");

	const auth = getAuthToken(CREDENTIALS);
	if (!auth) throw new Error("setup failed: could not authenticate");
	console.log(`Authenticated as ${CREDENTIALS.email}`);

	// Fetch required IDs for all workflows
	const customer = firstItem(authGet(`${API_V1}/customer/customers?per_page=1`, auth));
	const employee = firstItem(authGet(`${API_V1}/organization/employees?per_page=1`, auth));
	const businessUnit = firstItem(authGet(`${API_V1}/organization/business-units?per_page=1`, auth));
	const paymentTerms = firstItem(authGet(`${API_V1}/master-data/payment-terms?per_page=1`, auth));
	const warehouse = firstItem(authGet(`${API_V1}/warehouse/warehouses?per_page=1`, auth));
	const bankAccount = firstItem(authGet(`${API_V1}/finance/bank-accounts?per_page=1`, auth));
	const meRes = authGet(`${API_V1}/users/me`, auth);
	const meData = parseBody(meRes)?.data;
	const companyId = meData?.company_id || meData?.tenant_id;
	const product = firstItem(authGet(`${API_V1}/product/products?per_page=1`, auth));
	const supplier = firstItem(authGet(`${API_V1}/supplier/suppliers?per_page=1`, auth));

	const warehouseId = requiredId("warehouseId", warehouse?.id);
	const batchableProducts = collectBatchableProducts(auth, warehouseId, API_V1, 8);

	if (batchableProducts.length === 0) {
		throw new Error("setup failed: no product with inventory batch available in selected warehouse");
	}

	const setupData = {
		auth,
		customerId: requiredId("customerId", customer?.id),
		salesRepId: requiredId("salesRepId", employee?.id),
		businessUnitId: requiredId("businessUnitId", businessUnit?.id),
		paymentTermsId: requiredId("paymentTermsId", paymentTerms?.id),
		warehouseId,
		bankAccountId: requiredId("bankAccountId", bankAccount?.id),
		supplierId: supplier?.id,              // May be null
		productId: product?.id,                // May be null
		employeeId: employee?.id,               // May be null
		companyId,                             // Required for journal entries
		batchableProducts,
	};

	console.log(`Setup complete: customer=${setupData.customerId}, batchableProducts=${batchableProducts.length}, supplier=${supplier?.id || 'none'}`);
	return setupData;
}

// ── VU Code ────────────────────────────────────────────────────────────────
export default function (data) {
	// Workflow 1: Sales Revenue Cycle (SQ → SO → DO → Invoice → Payment)
	group("workflow-1-revenue-cycle", () => {
		const result = revenueCycle(data.auth, data, { withConcurrencyCheck: true });
		if (result) {
			check(result, {
				"Revenue cycle completed": (r) => !!r.invoiceId,
			});
		}
	});

	sleep(0.5);

	// Workflow 2: Purchase Order Cycle (PO → Goods Receipt)
	if (data.supplierId) {
		group("workflow-2-purchase-cycle", () => {
			const result = purchaseCycle(data.auth, {
				supplierId: data.supplierId,
				warehouseId: data.warehouseId,
				productId: data.productId || data.batchableProducts[0]?.productId,
				paymentTermsId: data.paymentTermsId,
			});
			if (result) {
				check(result, {
					"Purchase cycle completed": (r) => !!r.poId,
				});
			}
		});
	}

	sleep(0.5);

	// Workflow 3: Finance Journal Entry (debit/credit atomicity)
	group("workflow-3-journal-entry", () => {
		const jeSetup = journalEntrySetup(data.auth);
		const companyId = data.companyId || data.auth?.user?.company_id || data.auth?.tenant_id;
		if (jeSetup.coaDebitId && jeSetup.coaCreditId && companyId) {
			const jeData = { ...jeSetup, companyId };
			const result = journalEntryCycle(data.auth, jeData);
			if (result) {
				check(result, {
					"Journal entry completed": (r) => !!r.journalId,
				});
			}
		} else {
			console.warn("Skipping journal entry: need companyId + at least 2 COA accounts");
		}
	});

	sleep(0.5);

	// Workflow 4: HRD Attendance Check-In (timezone-aware)
	if (data.employeeId) {
		group("workflow-4-attendance-checkin", () => {
			const attSetup = attendanceCheckinSetup(data.auth);
			if (attSetup.employeeId) {
				const result = attendanceCheckinCycle(data.auth, attSetup);
				if (result) {
					check(result, {
						"Attendance workflow completed": (r) => !!r.attendanceId || !!r.leaveRequestId,
					});
				}
			}
		});
	}
}

// ── Teardown ───────────────────────────────────────────────────────────────
export function teardown() {
	console.log("=== Transaction Test Complete ===");
	console.log("Check metrics: gims_workflow_duration_ms, gims_invoice_success_rate, gims_so_conversion_rate");
}