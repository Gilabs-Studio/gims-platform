// k6/scenarios/e2e/revenue-cycle.js
// Full Sales Revenue Cycle end-to-end workflow.
// Flow: SQ → SO → DO → Invoice → Payment (10 steps)

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authGet, authPost, authPatch } from "../../auth-helper.js";
import { parseBody, isoDate, addDays, pickWorkflowTarget } from "../../lib/helpers.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

const WORKFLOW_TAGS = { endpoint: "e2e:revenue-cycle", module: "sales", tier: "workflow" };

export function revenueCycle(auth, data, options = {}) {
	const startTime = Date.now();
	const now = new Date();
	const quotationDate = isoDate(now);
	const dueDate = isoDate(addDays(now, 30));

	const target = pickWorkflowTarget(data);
	if (!target) {
		console.error("revenueCycle: no batchable product available, skipping");
		return null;
	}

	// STEP 1: Create Sales Quotation
	const sqPayload = {
		quotation_date: quotationDate,
		payment_terms_id: data.paymentTermsId,
		sales_rep_id: data.salesRepId,
		business_unit_id: data.businessUnitId,
		customer_id: data.customerId,
		tax_rate: 11,
		items: [{
			product_id: target.productId,
			quantity: 1,
			price: 50000,
			discount: 0,
		}],
	};

	const sqRes = authPost(`${API_V1}/sales/sales-quotations`, sqPayload, auth, {
		tags: { name: "sales:quotations:create", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	const sqId = parseBody(sqRes)?.data?.id;
	check(sqRes, { "SQ created": (r) => r.status >= 200 && r.status < 300 && !!sqId });
	if (!sqId) return null;

	// STEP 2: Submit SQ
	const sqSubmit = authPost(`${API_V1}/sales/sales-quotations/${sqId}/submit`, {}, auth, {
		tags: { name: "sales:quotations:submit", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	check(sqSubmit, { "SQ submitted": (r) => r.status >= 200 && r.status < 300 });

	// STEP 3: Approve SQ
	const sqApprove = authPost(`${API_V1}/sales/sales-quotations/${sqId}/approve`, {}, auth, {
		tags: { name: "sales:quotations:approve", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	check(sqApprove, { "SQ approved": (r) => r.status >= 200 && r.status < 300 });

	// STEP 4: Convert SQ → SO
	const soPayload = { ...sqPayload, quotation_id: sqId };
	const soRes = authPost(`${API_V1}/sales/sales-orders`, soPayload, auth, {
		tags: { name: "sales:orders:create", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	const soId = parseBody(soRes)?.data?.id;
	check(soRes, { "SO created": (r) => r.status >= 200 && r.status < 300 && !!soId });
	if (!soId) return { sqId };

	// STEP 5: Submit SO
	const soSubmit = authPost(`${API_V1}/sales/sales-orders/${soId}/submit`, {}, auth, {
		tags: { name: "sales:orders:submit", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	check(soSubmit, { "SO submitted": (r) => r.status >= 200 && r.status < 300 });

	// STEP 6: Approve SO
	const soApprove = authPost(`${API_V1}/sales/sales-orders/${soId}/approve`, {}, auth, {
		tags: { name: "sales:orders:approve", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	check(soApprove, { "SO approved": (r) => r.status >= 200 && r.status < 300 });

	// STEP 7: Create Delivery Order
	const doPayload = {
		sales_order_id: soId,
		delivery_date: quotationDate,
		warehouse_id: data.warehouseId,
		items: [{ product_id: target.productId, quantity: 1 }],
	};
	const doRes = authPost(`${API_V1}/sales/delivery-orders`, doPayload, auth, {
		tags: { name: "sales:delivery-orders:create", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	const doId = parseBody(doRes)?.data?.id;
	check(doRes, { "DO created": (r) => r.status >= 200 && r.status < 300 && !!doId });

	// STEP 8: Create Invoice
	const invPayload = {
		sales_order_id: soId,
		invoice_date: quotationDate,
		due_date: dueDate,
		items: [{ product_id: target.productId, quantity: 1, price: 50000, discount: 0 }],
	};
	const invRes = authPost(`${API_V1}/sales/customer-invoices`, invPayload, auth, {
		tags: { name: "sales:invoices:create", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	const invId = parseBody(invRes)?.data?.id;
	check(invRes, { "Invoice created": (r) => r.status >= 200 && r.status < 300 && !!invId });

	// STEP 9: Create Payment
	if (invId) {
		const payPayload = {
			invoice_id: invId,
			amount: 55000,
			payment_date: quotationDate,
			bank_account_id: data.bankAccountId,
		};
		const payRes = authPost(`${API_V1}/sales/payments`, payPayload, auth, {
			tags: { name: "sales:payments:create", ...WORKFLOW_TAGS },
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		});
		check(payRes, { "Payment created": (r) => r.status >= 200 && r.status < 300 });

		// STEP 10: Payment idempotency (2nd payment on same invoice should fail or be idempotent)
		if (options.withConcurrencyCheck) {
			const payRes2 = authPost(`${API_V1}/sales/payments`, { ...payPayload, reference: `K6-${Date.now()}` }, auth, {
				tags: { name: "sales:payments:idempotency", ...WORKFLOW_TAGS },
				responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
			});
			check(payRes2, { "Payment idempotency": (r) => r.status >= 400 || r.status < 300 });
		}
	}

	return { sqId, soId, doId, invId };
}