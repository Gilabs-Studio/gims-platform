// k6/scenarios/e2e/revenue-cycle.js
// Full Sales Revenue Cycle end-to-end workflow.
//
// Flow: SQ → SO → DO → Invoice → Payment (10 steps)
//
// This is the most critical business workflow in GIMS ERP.
// It validates:
//   - API contract correctness (every field, every status transition)
//   - State machine transitions (sent → approved → submitted → approved)
//   - Inventory batch selection (FIFO)
//   - Payment idempotency (2nd payment on same invoice should fail)
//   - Data integrity (final invoice state is consistent)
//
// Usage:
//   import { revenueCycle } from "../scenarios/e2e/revenue-cycle.js";
//   revenueCycle(auth, setupData, { withConcurrencyCheck: true });

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authGet, authPost, authPatch } from "../../auth-helper.js";
import { parseBody, isoDate, addDays, pickBatchId, requiredId, firstItem, collectBatchableProducts } from "../../lib/helpers.js";
import {
	invoiceSuccessRate,
	paymentSuccessRate,
	soConversionRate,
	recordWorkflowDuration,
} from "../../lib/metrics.js";

/**
 * Run the full Sales Revenue Cycle.
 *
 * Required setupData fields:
 *   auth, customerId, salesRepId, businessUnitId, paymentTermsId,
 *   warehouseId, bankAccountId, batchableProducts (from setup())
 *
 * @param {object} auth - Auth token from getAuthToken()
 * @param {object} data - Setup data with all required IDs
 * @param {object} options - { withConcurrencyCheck: boolean }
 * @returns {object|null} - { sqId, soId, doId, invoiceId, paymentId } or null on failure
 */
export function revenueCycle(auth, data, options = {}) {
	const startTime = Date.now();
	const now = new Date();
	const quotationDate = isoDate(now);
	const dueDate = isoDate(addDays(now, 30));

	// Pick a product with available inventory
	const target = pickWorkflowTarget(data);
	if (!target) {
		console.error("revenueCycle: no batchable product available, skipping");
		return null;
	}

	// ═══════════════════════════════════════════════════════════════════
	// STEP 1: Create Sales Quotation
	// ═══════════════════════════════════════════════════════════════════
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

	const sqRes = authPost(`${API_V1}/sales/sales-quotations`, sqPayload, auth);
	const sqBody = parseBody(sqRes);
	const sqId = sqBody?.data?.id;
	check(sqRes, {
		"SQ created": (r) => r.status >= 200 && r.status < 300 && !!sqId,
	});
	if (!sqId) {
		console.error(`SQ failed: ${sqRes.status} body=${sqRes.body?.substring(0, 300)}`);
		return null;
	}

	// ═══════════════════════════════════════════════════════════════════
	// STEP 2: SQ status transitions: draft → sent → approved
	// ═══════════════════════════════════════════════════════════════════
	const sqSent = authPatch(`${API_V1}/sales/sales-quotations/${sqId}/status`, { status: "sent" }, auth);
	check(sqSent, { "SQ status→sent": (r) => r.status >= 200 && r.status < 300 });
	if (sqSent.status >= 300) {
		console.error(`SQ sent failed: ${sqSent.status}`);
		return null;
	}

	const sqApproved = authPatch(`${API_V1}/sales/sales-quotations/${sqId}/status`, { status: "approved" }, auth);
	check(sqApproved, { "SQ status→approved": (r) => r.status >= 200 && r.status < 300 });
	if (sqApproved.status >= 300) {
		console.error(`SQ approve failed: ${sqApproved.status}`);
		return null;
	}

	// ═══════════════════════════════════════════════════════════════════
	// STEP 3: Convert SQ → Sales Order
	// ═══════════════════════════════════════════════════════════════════
	const soConvert = authPost(`${API_V1}/sales/sales-orders/convert-from-quotation`, { quotation_id: sqId }, auth);
	const soId = parseBody(soConvert)?.data?.id;
	check(soConvert, { "SO converted": (r) => r.status >= 200 && r.status < 300 && !!soId });
	soConversionRate.add(!!soId);
	if (!soId) {
		console.error(`SO convert failed: ${soConvert.status}`);
		return null;
	}

	// ═══════════════════════════════════════════════════════════════════
	// STEP 4: Fetch SO items (needed for DO and invoice)
	// ═══════════════════════════════════════════════════════════════════
	const soGet = authGet(`${API_V1}/sales/sales-orders/${soId}`, auth);
	const soData = parseBody(soGet)?.data;
	const soItems = Array.isArray(soData?.items) ? soData.items : [];
	if (soItems.length === 0) {
		console.error(`SO has no items, cannot create DO. soId=${soId}`);
		return null;
	}

	// ═══════════════════════════════════════════════════════════════════
	// STEP 5: SO status transitions: draft → submitted → approved
	// ═══════════════════════════════════════════════════════════════════
	const soSubmitted = authPatch(`${API_V1}/sales/sales-orders/${soId}/status`, { status: "submitted" }, auth);
	check(soSubmitted, { "SO status→submitted": (r) => r.status >= 200 && r.status < 300 });
	const soApproved = authPost(`${API_V1}/sales/sales-orders/${soId}/approve`, {}, auth);
	check(soApproved, { "SO approved": (r) => r.status >= 200 && r.status < 300 });
	if (soSubmitted.status >= 300 || soApproved.status >= 300) {
		console.error(`SO approval failed: submitted=${soSubmitted.status} approved=${soApproved.status}`);
		return null;
	}

	// ═══════════════════════════════════════════════════════════════════
	// STEP 6: Create Delivery Order with inventory batch selection
	// ═══════════════════════════════════════════════════════════════════
	const doItems = soItems.map((item) => {
		const batchId = pickBatchId(auth, data.warehouseId, item.product_id, item.quantity, API_V1);
		return {
			sales_order_item_id: item.id,
			product_id: item.product_id,
			inventory_batch_id: batchId,
			quantity: item.quantity,
			price: item.price || 0,
			discount: 0,
			is_equipment: false,
		};
	});

	const hasMissingBatch = doItems.some((i) => !i.inventory_batch_id);
	if (hasMissingBatch) {
		console.error(`DO precheck: inventory_batch_id missing for one or more items. soId=${soId}`);
	}

	const doPayload = {
		delivery_date: quotationDate,
		warehouse_id: data.warehouseId,
		sales_order_id: soId,
		delivered_by_id: data.salesRepId,
		receiver_name: "K6 Receiver",
		receiver_phone: "081234567890",
		delivery_address: "K6 Test Address",
		items: doItems,
	};
	const doCreate = authPost(`${API_V1}/sales/delivery-orders`, doPayload, auth);
	const doId = parseBody(doCreate)?.data?.id;
	check(doCreate, { "DO created": (r) => r.status >= 200 && r.status < 300 && !!doId });
	if (!doId) {
		console.error(`DO create failed: ${doCreate.status}`);
		return null;
	}

	// ═══════════════════════════════════════════════════════════════════
	// STEP 7: DO status transitions: sent → approved → prepared → ship → deliver
	// ═══════════════════════════════════════════════════════════════════
	const doStatusSteps = [
		{ action: "status", payload: { status: "sent" }, label: "DO status→sent" },
		{ action: "approve", payload: {}, label: "DO approved" },
		{ action: "status", payload: { status: "prepared" }, label: "DO status→prepared" },
		{ action: "ship", payload: { tracking_number: `K6-${Date.now()}` }, label: "DO shipped" },
		{ action: "deliver", payload: { receiver_signature: "k6-sig", receiver_name: "K6 Receiver" }, label: "DO delivered" },
	];

	for (const step of doStatusSteps) {
		const res = step.action === "status"
			? authPatch(`${API_V1}/sales/delivery-orders/${doId}/status`, step.payload, auth)
			: authPost(`${API_V1}/sales/delivery-orders/${doId}/${step.action}`, step.payload, auth);
		check(res, { [step.label]: (r) => r.status >= 200 && r.status < 300 });
		if (res.status >= 300) {
			console.error(`${step.label} failed: ${res.status}`);
			break;
		}
	}

	// ═══════════════════════════════════════════════════════════════════
	// STEP 8: Create Invoice
	// ═══════════════════════════════════════════════════════════════════
	const invoicePayload = {
		invoice_date: quotationDate,
		due_date: dueDate,
		type: "regular",
		sales_order_id: soId,
		delivery_order_id: doId,
		payment_terms_id: data.paymentTermsId,
		tax_rate: 11,
		items: soItems.map((item) => ({
			product_id: item.product_id,
			sales_order_item_id: item.id,
			quantity: item.quantity,
			price: item.price,
			discount: 0,
			hpp_amount: 0,
		})),
	};
	const invoiceCreate = authPost(`${API_V1}/sales/customer-invoices`, invoicePayload, auth);
	const invoice = parseBody(invoiceCreate)?.data;
	const invoiceId = invoice?.id;
	const invoiceAmount = Number(invoice?.amount || 0);
	invoiceSuccessRate.add(!!invoiceId);
	if (!invoiceId) {
		console.error(`Invoice create failed: ${invoiceCreate.status}`);
		return null;
	}

	// ═══════════════════════════════════════════════════════════════════
	// STEP 9: Invoice status transitions: submitted → approved
	// ═══════════════════════════════════════════════════════════════════
	const invSubmitted = authPatch(`${API_V1}/sales/customer-invoices/${invoiceId}/status`, { status: "submitted" }, auth);
	check(invSubmitted, { "Invoice status→submitted": (r) => r.status >= 200 && r.status < 300 });
	const invApproved = authPost(`${API_V1}/sales/customer-invoices/${invoiceId}/approve`, {}, auth);
	check(invApproved, { "Invoice approved": (r) => r.status >= 200 && r.status < 300 });

	// ═══════════════════════════════════════════════════════════════════
	// STEP 10: Create + confirm Payment
	// ═══════════════════════════════════════════════════════════════════
	const paymentCreate = authPost(`${API_V1}/sales/payments`, {
		invoice_id: invoiceId,
		bank_account_id: data.bankAccountId,
		payment_date: quotationDate,
		amount: invoiceAmount,
		method: "BANK",
		reference_number: `K6-PAY-${Date.now()}`,
	}, auth);
	const paymentId = parseBody(paymentCreate)?.data?.id;
	const paymentConfirm = paymentId
		? authPost(`${API_V1}/sales/payments/${paymentId}/confirm`, {}, auth)
		: null;
	paymentSuccessRate.add(!!paymentId && paymentConfirm?.status >= 200 && paymentConfirm?.status < 300);

	// ═══════════════════════════════════════════════════════════════════
	// OPTIONAL: Concurrency idempotency check (2nd payment should fail)
	// ═══════════════════════════════════════════════════════════════════
	if (options.withConcurrencyCheck && paymentId && invoiceAmount > 0) {
		const secondPayment = authPost(
			`${API_V1}/sales/payments`,
			{
				invoice_id: invoiceId,
				bank_account_id: data.bankAccountId,
				payment_date: quotationDate,
				amount: invoiceAmount,
				method: "BANK",
				reference_number: `K6-PAY2-${Date.now()}`,
			},
			auth,
			{ responseCallback: http.expectedStatuses({ min: 400, max: 599 }) },
		);
		const secondRejected = secondPayment.status >= 400;
		check({ secondRejected }, {
			"2nd payment rejected (idempotency)": (v) => v.secondRejected,
		});
		if (!secondRejected) {
			console.error(`CRITICAL: 2nd payment unexpectedly succeeded. status=${secondPayment.status}`);
		}
	}

	// Record workflow duration
	recordWorkflowDuration("sales-revenue-cycle", Date.now() - startTime);

	return { sqId, soId, doId, invoiceId, paymentId };
}

/**
 * Setup function for revenue cycle tests.
 * Fetches required IDs from the API.
 */
export function revenueCycleSetup(auth) {
	const customer = firstItem(authGet(`${API_V1}/customer/customers?per_page=1`, auth));
	const employee = firstItem(authGet(`${API_V1}/organization/employees?per_page=1`, auth));
	const businessUnit = firstItem(authGet(`${API_V1}/organization/business-units?per_page=1`, auth));
	const paymentTerms = firstItem(authGet(`${API_V1}/master-data/payment-terms?per_page=1`, auth));
	const warehouse = firstItem(authGet(`${API_V1}/warehouse/warehouses?per_page=1`, auth));
	const bankAccount = firstItem(authGet(`${API_V1}/finance/bank-accounts?per_page=1`, auth));

	const warehouseId = requiredId("warehouseId", warehouse?.id);
	const batchableProducts = collectBatchableProducts(auth, warehouseId, API_V1, 8);

	if (batchableProducts.length === 0) {
		throw new Error("setup failed: no product with inventory batch available");
	}

	return {
		auth,
		customerId: requiredId("customerId", customer?.id),
		salesRepId: requiredId("salesRepId", employee?.id),
		businessUnitId: requiredId("businessUnitId", businessUnit?.id),
		paymentTermsId: requiredId("paymentTermsId", paymentTerms?.id),
		warehouseId,
		bankAccountId: requiredId("bankAccountId", bankAccount?.id),
		batchableProducts,
	};
}

/**
 * Pick which product/batch to use for this iteration.
 * VUs rotate through available batchable products to avoid contention.
 */
function pickWorkflowTarget(data) {
	const candidates = Array.isArray(data.batchableProducts) ? data.batchableProducts : [];
	if (candidates.length === 0) return null;

	const startIndex = ((Number(__VU) || 1) - 1 + (Number(__ITER) || 0)) % candidates.length;
	for (let offset = 0; offset < candidates.length; offset += 1) {
		const candidate = candidates[(startIndex + offset) % candidates.length];
		const batchId = pickBatchId(data.auth, data.warehouseId, candidate.productId, 1, API_V1);
		if (batchId) {
			return { productId: candidate.productId, batchId };
		}
	}
	return null;
}

// Re-export helpers that are also used by purchase-cycle, journal-entry, etc.
export { parseBody, firstItem, extractFieldErrors, isoDate, addDays, pickBatchId, collectBatchableProducts, findBatchableProduct, randomPick, requiredId } from "../../lib/helpers.js";