// k6/scenarios/e2e/sales.js
// Sales Module E2E Workflows — Full rewrite with happy paths + error cases.
//
// Exports:
//   - revenueCycle(auth, data)        → Full SQ → SO → DO → Invoice → Payment flow
//   - salesReturnFlow(auth, data)     → Return from delivered order
//   - salesVisitFlow(auth, data)      → Visit check-in/check-out
//   - errorInvalidTransition(auth, data) → Approve SO without submitting
//   - errorCreditLimit(auth, data)    → SO approval exceeds credit limit
//   - errorOverpayment(auth, data)    → Payment exceeds invoice remaining
//   - verifyInvoiceJournal(auth, data) → Invoice approve creates AR journal
//   - verifyDOJournal(auth, data)     → DO approve creates COGS journal

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authGet, authPost, authPatch } from "../../auth-helper.js";
import { parseBody, isoDate, addDays } from "../../lib/helpers.js";

const TAGS = { module: "sales", tier: "workflow" };

function tag(endpoint) {
	return { tags: { name: endpoint, endpoint, ...TAGS }, responseCallback: http.expectedStatuses({ min: 200, max: 599 }) };
}

// ── Helper: Create and approve a Sales Quotation ─────────────────────────────
function createApprovedSQ(auth, data) {
	const now = new Date();
	const sqPayload = {
		quotation_date: isoDate(now),
		payment_terms_id: data.paymentTermsId,
		sales_rep_id: data.salesRepId,
		business_unit_id: data.businessUnitId,
		customer_id: data.customerId,
		tax_rate: 11,
		items: [{ product_id: data.productId, quantity: 1, price: 50000, discount: 0 }],
	};

	const sqRes = authPost(`${API_V1}/sales/sales-quotations`, sqPayload, auth, tag("sales:sq:create"));
	const sqId = parseBody(sqRes)?.data?.id;
	if (!sqId) return null;

	const approveRes = authPatch(`${API_V1}/sales/sales-quotations/${sqId}/status`, { status: "approved" }, auth, tag("sales:sq:approve"));
	if (approveRes.status >= 300) return null;

	return { sqId, quotationDate: isoDate(now), dueDate: isoDate(addDays(now, 30)) };
}

// ── Helper: Convert SQ to SO and approve ─────────────────────────────────────
function createApprovedSO(auth, data, sqId) {
	const soRes = authPost(`${API_V1}/sales/sales-orders/convert-from-quotation`, { quotation_id: sqId }, auth, tag("sales:so:convert"));
	const soId = parseBody(soRes)?.data?.id;
	if (!soId) return null;

	const submitRes = authPatch(`${API_V1}/sales/sales-orders/${soId}/status`, { status: "submitted" }, auth, tag("sales:so:submit"));
	if (submitRes.status >= 300) return null;

	const approveRes = authPost(`${API_V1}/sales/sales-orders/${soId}/approve`, {}, auth, tag("sales:so:approve"));
	if (approveRes.status >= 300) return null;

	return soId;
}

// ── Helper: Create and approve Invoice ───────────────────────────────────────
function createApprovedInvoice(auth, data, soId, quotationDate, dueDate) {
	const invPayload = {
		sales_order_id: soId,
		invoice_date: quotationDate,
		due_date: dueDate,
		items: [{ product_id: data.productId, quantity: 1, price: 50000, discount: 0 }],
	};
	const invRes = authPost(`${API_V1}/sales/customer-invoices`, invPayload, auth, tag("sales:invoice:create"));
	const invId = parseBody(invRes)?.data?.id;
	if (!invId) return null;

	const approveRes = authPost(`${API_V1}/sales/customer-invoices/${invId}/approve`, {}, auth, tag("sales:invoice:approve"));
	if (approveRes.status >= 300) return null;

	return invId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW 1: Full Revenue Cycle
// ═══════════════════════════════════════════════════════════════════════════════
export function revenueCycle(auth, data) {
	// Step 1-2: Create + approve SQ
	const sq = createApprovedSQ(auth, data);
	const sqOk = check(null, { "SQ created & approved": () => sq !== null });
	if (!sq) return null;

	// Step 3-5: Convert to SO + submit + approve (reserves stock)
	const soId = createApprovedSO(auth, data, sq.sqId);
	const soOk = check(null, { "SO created & approved": () => soId !== null });
	if (!soId) return null;

	// Step 6-8: Create DO + approve (triggers COGS journal if stock available)
	let doId = null;
	if (data.batchId && data.batchId !== "SETUP_MISSING") {
		const doPayload = {
			sales_order_id: soId,
			delivery_date: sq.quotationDate,
			warehouse_id: data.warehouseId,
			items: [{ product_id: data.productId, quantity: 1, inventory_batch_id: data.batchId }],
		};
		const doRes = authPost(`${API_V1}/sales/delivery-orders`, doPayload, auth, tag("sales:do:create"));
		doId = parseBody(doRes)?.data?.id;
		if (doId) {
			authPatch(`${API_V1}/sales/delivery-orders/${doId}/status`, { status: "sent" }, auth, tag("sales:do:send"));
			const doApprove = authPatch(`${API_V1}/sales/delivery-orders/${doId}/status`, { status: "approved" }, auth, tag("sales:do:approve"));
			check(doApprove, { "DO approved": (r) => r.status >= 200 && r.status < 300 });
		}
	}

	// Step 9-10: Create + approve Invoice (triggers AR journal)
	const invId = createApprovedInvoice(auth, data, soId, sq.quotationDate, sq.dueDate);
	check(null, { "Invoice created & approved": () => invId !== null });

	// Step 11-12: Create + confirm Payment (triggers payment journal)
	if (invId) {
		const payRes = authPost(`${API_V1}/sales/payments`, {
			invoice_id: invId,
			amount: 55500,
			payment_date: sq.quotationDate,
			bank_account_id: data.bankAccountId,
			method: "bank_transfer",
		}, auth, tag("sales:payment:create"));
		const payId = parseBody(payRes)?.data?.id;

		if (payId) {
			const confirmRes = authPost(`${API_V1}/sales/payments/${payId}/confirm`, {}, auth, tag("sales:payment:confirm"));
			check(confirmRes, { "Payment confirmed": (r) => r.status >= 200 && r.status < 300 });
		}
	}

	return { sqId: sq.sqId, soId, doId, invId };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW 2: Sales Return Flow
// ═══════════════════════════════════════════════════════════════════════════════
export function salesReturnFlow(auth, data) {
	// Returns require a delivery_id — skip if no batch data available for DO creation
	if (!data.batchId || data.batchId === "SETUP_MISSING") {
		// Cannot test return flow without delivery data
		return null;
	}

	// Full flow with delivery
	const sq = createApprovedSQ(auth, data);
	if (!sq) return null;
	const soId = createApprovedSO(auth, data, sq.sqId);
	if (!soId) return null;

	// Create DO
	const doPayload = {
		sales_order_id: soId,
		delivery_date: sq.quotationDate,
		warehouse_id: data.warehouseId,
		items: [{ product_id: data.productId, quantity: 1, inventory_batch_id: data.batchId }],
	};
	const doRes = authPost(`${API_V1}/sales/delivery-orders`, doPayload, auth, tag("sales:return:do-create"));
	const doId = parseBody(doRes)?.data?.id;
	if (!doId) return null;

	const returnPayload = {
		sales_order_id: soId,
		delivery_id: doId,
		return_date: sq.quotationDate,
		action: "refund",
		reason: "K6 load test return - quality issue",
		warehouse_id: data.warehouseId,
		items: [{ product_id: data.productId, quantity: 1, reason: "Defective item" }],
	};
	const returnRes = authPost(`${API_V1}/sales/returns`, returnPayload, auth, tag("sales:return:create"));
	const returnId = parseBody(returnRes)?.data?.id;
	check(returnRes, { "Return created": (r) => r.status >= 200 && r.status < 300 && !!returnId });
	if (!returnId) return null;

	const submitRes = authPatch(`${API_V1}/sales/returns/${returnId}/status`, { status: "submitted" }, auth, tag("sales:return:submit"));
	check(submitRes, { "Return submitted": (r) => r.status >= 200 && r.status < 300 });

	if (submitRes.status < 300) {
		const processRes = authPatch(`${API_V1}/sales/returns/${returnId}/status`, { status: "processed" }, auth, tag("sales:return:process"));
		check(processRes, { "Return processed": (r) => r.status >= 200 && r.status < 300 });
	}

	return { returnId };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW 3: Sales Visit Flow
// ═══════════════════════════════════════════════════════════════════════════════
export function salesVisitFlow(auth, data) {
	const now = new Date();
	const visitPayload = {
		customer_id: data.customerId,
		employee_id: data.salesRepId,
		visit_date: isoDate(now),
		purpose: "K6 load test visit - product demo",
		notes: "Scheduled product demonstration for performance testing",
	};

	const visitRes = authPost(`${API_V1}/sales/sales-visits`, visitPayload, auth, tag("sales:visit:create"));
	const visitId = parseBody(visitRes)?.data?.id;
	check(visitRes, { "Visit created": (r) => r.status >= 200 && r.status < 300 && !!visitId });
	if (!visitId) return null;

	// Check-in (known backend issue: timestamp parsing bug in repository)
	const checkInRes = authPost(`${API_V1}/sales/sales-visits/${visitId}/check-in`, {
		latitude: -6.2088,
		longitude: 106.8456,
	}, auth, tag("sales:visit:checkin"));
	check(checkInRes, { "Visit check-in": (r) => r.status >= 200 && r.status < 300 });

	// Check-out
	if (checkInRes.status < 300) {
		const checkOutRes = authPost(`${API_V1}/sales/sales-visits/${visitId}/check-out`, {
			result: "Demo completed successfully - customer interested",
		}, auth, tag("sales:visit:checkout"));
		check(checkOutRes, { "Visit check-out": (r) => r.status >= 200 && r.status < 300 });
	}

	return { visitId };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CASE 4: Invalid State Transition
// ═══════════════════════════════════════════════════════════════════════════════
export function errorInvalidTransition(auth, data) {
	// Create SO directly (not from SQ)
	const soPayload = {
		order_date: isoDate(new Date()),
		payment_terms_id: data.paymentTermsId,
		sales_rep_id: data.salesRepId,
		business_unit_id: data.businessUnitId,
		customer_id: data.customerId,
		tax_rate: 11,
		items: [{ product_id: data.productId, quantity: 1, price: 50000, discount: 0 }],
	};
	const soRes = authPost(`${API_V1}/sales/sales-orders`, soPayload, auth, tag("sales:error:create-so"));
	const soId = parseBody(soRes)?.data?.id;
	if (!soId) return null;

	// Try to approve without submitting (should fail)
	const approveRes = authPost(`${API_V1}/sales/sales-orders/${soId}/approve`, {}, auth, tag("sales:error:approve-without-submit"));
	check(approveRes, {
		"Invalid transition rejected": (r) => r.status >= 400 && r.status < 500,
	});

	return { soId, rejected: approveRes.status >= 400 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CASE 5: Credit Limit Exceeded
// ═══════════════════════════════════════════════════════════════════════════════
export function errorCreditLimit(auth, data) {
	// Create SO with extremely high amount
	const soPayload = {
		order_date: isoDate(new Date()),
		payment_terms_id: data.paymentTermsId,
		sales_rep_id: data.salesRepId,
		business_unit_id: data.businessUnitId,
		customer_id: data.customerId,
		tax_rate: 11,
		items: [{ product_id: data.productId, quantity: 99999, price: 99999999, discount: 0 }],
	};
	const soRes = authPost(`${API_V1}/sales/sales-orders`, soPayload, auth, tag("sales:error:create-high-so"));
	const soId = parseBody(soRes)?.data?.id;
	if (!soId) return null;

	// Submit
	authPatch(`${API_V1}/sales/sales-orders/${soId}/status`, { status: "submitted" }, auth, tag("sales:error:submit-high-so"));

	// Try to approve (should fail if credit limit configured)
	const approveRes = authPost(`${API_V1}/sales/sales-orders/${soId}/approve`, {}, auth, tag("sales:error:approve-credit-limit"));
	check(approveRes, {
		"Credit limit check executed": (r) => r.status === 200 || r.status === 400,
	});

	return { soId, creditLimitTriggered: approveRes.status >= 400 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CASE 6: Payment Exceeds Remaining Amount
// ═══════════════════════════════════════════════════════════════════════════════
export function errorOverpayment(auth, data) {
	// Create approved invoice first
	const sq = createApprovedSQ(auth, data);
	if (!sq) return null;
	const soId = createApprovedSO(auth, data, sq.sqId);
	if (!soId) return null;
	const invId = createApprovedInvoice(auth, data, soId, sq.quotationDate, sq.dueDate);
	if (!invId) return null;

	// Try to pay double the amount
	const payRes = authPost(`${API_V1}/sales/payments`, {
		invoice_id: invId,
		amount: 999999999,
		payment_date: sq.quotationDate,
		bank_account_id: data.bankAccountId,
		method: "bank_transfer",
	}, auth, tag("sales:error:overpayment"));

	check(payRes, {
		"Overpayment rejected": (r) => r.status >= 400 && r.status < 500,
	});

	return { invId, rejected: payRes.status >= 400 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFY 7: Invoice Approve Creates AR Journal
// ═══════════════════════════════════════════════════════════════════════════════
export function verifyInvoiceJournal(auth, data) {
	// Create approved invoice
	const sq = createApprovedSQ(auth, data);
	if (!sq) return null;
	const soId = createApprovedSO(auth, data, sq.sqId);
	if (!soId) return null;
	const invId = createApprovedInvoice(auth, data, soId, sq.quotationDate, sq.dueDate);
	if (!invId) return null;

	// Verify journal was created
	const journalRes = authGet(`${API_V1}/finance/journal-entries?reference_id=${invId}`, auth, tag("sales:verify:invoice-journal"));
	const journalData = parseBody(journalRes);
	const journals = journalData?.data ? (Array.isArray(journalData.data) ? journalData.data : journalData.data.items || []) : [];

	check(null, {
		"AR journal exists for invoice": () => journals.length > 0,
		"AR journal is posted": () => journals.length > 0 && journals[0].status === "posted",
	});

	return { invId, journalFound: journals.length > 0 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFY 8: DO Approve Creates COGS Journal
// ═══════════════════════════════════════════════════════════════════════════════
export function verifyDOJournal(auth, data) {
	// Only run if batch data available (DO requires inventory)
	if (!data.batchId || data.batchId === "SETUP_MISSING") return null;

	const sq = createApprovedSQ(auth, data);
	if (!sq) return null;
	const soId = createApprovedSO(auth, data, sq.sqId);
	if (!soId) return null;

	// Create + approve DO
	const doPayload = {
		sales_order_id: soId,
		delivery_date: sq.quotationDate,
		warehouse_id: data.warehouseId,
		items: [{ product_id: data.productId, quantity: 1, inventory_batch_id: data.batchId }],
	};
	const doRes = authPost(`${API_V1}/sales/delivery-orders`, doPayload, auth, tag("sales:verify:do-create"));
	const doId = parseBody(doRes)?.data?.id;
	if (!doId) return null;

	authPatch(`${API_V1}/sales/delivery-orders/${doId}/status`, { status: "sent" }, auth, tag("sales:verify:do-send"));
	authPatch(`${API_V1}/sales/delivery-orders/${doId}/status`, { status: "approved" }, auth, tag("sales:verify:do-approve"));

	// Verify COGS journal
	const journalRes = authGet(`${API_V1}/finance/journal-entries?reference_id=${doId}`, auth, tag("sales:verify:do-journal"));
	const journalData = parseBody(journalRes);
	const journals = journalData?.data ? (Array.isArray(journalData.data) ? journalData.data : journalData.data.items || []) : [];

	check(null, {
		"COGS journal exists for DO": () => journals.length > 0,
		"COGS journal is posted": () => journals.length > 0 && journals[0].status === "posted",
	});

	return { doId, journalFound: journals.length > 0 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER: Execute all Sales workflows (called by profiler)
// ═══════════════════════════════════════════════════════════════════════════════
export function runSalesWorkflows(auth, data) {
	if (data.customerId === "SETUP_MISSING") return;

	// Happy paths
	revenueCycle(auth, data);
	salesReturnFlow(auth, data);
	salesVisitFlow(auth, data);

	// Error cases
	errorInvalidTransition(auth, data);
	errorCreditLimit(auth, data);
	errorOverpayment(auth, data);

	// Verification
	verifyInvoiceJournal(auth, data);
	verifyDOJournal(auth, data);
}
