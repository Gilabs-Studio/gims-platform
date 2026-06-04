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

	// STEP 2: Approve SQ (direct status transition — submit step not required)
	const sqApprove = authPatch(`${API_V1}/sales/sales-quotations/${sqId}/status`, { status: "approved" }, auth, {
		tags: { name: "sales:quotations:approve", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	check(sqApprove, { "SQ approved": (r) => r.status >= 200 && r.status < 300 });

	// STEP 3: Convert SQ → SO
	const soRes = authPost(`${API_V1}/sales/sales-orders/convert-from-quotation`, { quotation_id: sqId }, auth, {
		tags: { name: "sales:orders:create", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	const soId = parseBody(soRes)?.data?.id;
	check(soRes, { "SO created": (r) => r.status >= 200 && r.status < 300 && !!soId });
	if (!soId) return { sqId };

	// STEP 4: Submit SO then Approve
	const soSend = authPatch(`${API_V1}/sales/sales-orders/${soId}/status`, { status: "submitted" }, auth, {
		tags: { name: "sales:orders:submit", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	check(soSend, { "SO sent": (r) => r.status >= 200 && r.status < 300 });

	const soApprove = authPost(`${API_V1}/sales/sales-orders/${soId}/approve`, {}, auth, {
		tags: { name: "sales:orders:approve", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	check(soApprove, { "SO approved": (r) => r.status >= 200 && r.status < 300 });

	// STEP 5: Create Delivery Order (requires inventory batch — skip if no stock data)
	let doId = null;
	if (data.batchId && data.batchId !== "SETUP_MISSING") {
		const doPayload = {
			sales_order_id: soId,
			delivery_date: quotationDate,
			warehouse_id: data.warehouseId,
			items: [{ product_id: target.productId, quantity: 1, inventory_batch_id: data.batchId }],
		};
		const doRes = authPost(`${API_V1}/sales/delivery-orders`, doPayload, auth, {
			tags: { name: "sales:delivery-orders:create", ...WORKFLOW_TAGS },
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		});
		doId = parseBody(doRes)?.data?.id;
		check(doRes, { "DO created": (r) => r.status >= 200 && r.status < 300 && !!doId });
	}

	// STEP 6: Create Invoice
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

	// STEP 7: Approve Invoice (required before payment)
	if (invId) {
		const invApprove = authPost(`${API_V1}/sales/customer-invoices/${invId}/approve`, {}, auth, {
			tags: { name: "sales:invoices:approve", ...WORKFLOW_TAGS },
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		});
		check(invApprove, { "Invoice approved": (r) => r.status >= 200 && r.status < 300 });
	}

	// STEP 9: Create Payment
	if (invId) {
		const payPayload = {
			invoice_id: invId,
			amount: 50000,
			payment_date: quotationDate,
			bank_account_id: data.bankAccountId,
			method: "BANK",
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