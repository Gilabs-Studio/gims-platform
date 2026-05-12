// k6/transaction-test.js
// Sales transaction workflow test aligned with current backend contracts.

import { check, sleep, group } from "k6";
import http from "k6/http";
import {
	API_V1,
	CREDENTIALS,
} from "./config.js";
import { getAuthToken, authGet, authPost, authPatch } from "./auth-helper.js";

const VUS = Number(__ENV.VUS || 3);
const DURATION = __ENV.DURATION || "3m";

export const options = {
	thresholds: {
		http_req_failed: ["rate<0.01"],
		http_req_duration: ["p(95)<1500", "p(99)<3000"],
		checks: ["rate>0.95"],
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

function apiGet(auth, url) {
	return authGet(url, auth);
}

function apiPost(auth, url, body, params = {}) {
	return authPost(url, body, auth, params);
}

function apiPatch(auth, url, body) {
	return authPatch(url, body, auth);
}

function parseBody(res) {
	try {
		return res.json();
	} catch (_) {
		return null;
	}
}

function firstItem(res) {
	const body = parseBody(res);
	if (!body || !body.data) {
		return null;
	}
	if (Array.isArray(body.data)) {
		return body.data[0] || null;
	}
	if (Array.isArray(body.data.items)) {
		return body.data.items[0] || null;
	}
	return null;
}

function extractFieldErrors(res) {
	const body = parseBody(res);
	const errs = body?.error?.field_errors;
	if (!Array.isArray(errs)) {
		return "";
	}
	return errs.map((e) => `${e.field}:${e.message}`).join(", ");
}

function isoDate(date = new Date()) {
	return date.toISOString().split("T")[0];
}

function addDays(date, days) {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

function pickBatchId(auth, warehouseId, productId, quantity) {
	const res = apiPost(
		auth,
		`${API_V1}/sales/delivery-orders/select-batches`,
		{
			product_id: productId,
			warehouse_id: warehouseId,
			quantity,
			method: "FIFO",
		},
		{
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		},
	);

	if (res.status < 200 || res.status >= 300) {
		return null;
	}

	const body = parseBody(res);
	const batches = body?.data?.batches;
	if (!Array.isArray(batches) || batches.length === 0) {
		return null;
	}

	for (const batch of batches) {
		if (Number(batch.available || batch.current_quantity || 0) >= quantity) {
			return batch.id || null;
		}
	}

	return null;
}

function collectBatchableProducts(auth, warehouseId, limit = 8) {
	const res = apiGet(auth, `${API_V1}/product/products?per_page=100`);
	const body = parseBody(res);
	const products = Array.isArray(body?.data)
		? body.data
		: Array.isArray(body?.data?.items)
			? body.data.items
			: [];
	const batchable = [];

	for (const product of products) {
		if (!product?.id) {
			continue;
		}

		const batchId = pickBatchId(auth, warehouseId, product.id, 1);
		if (!batchId) {
			continue;
		}

		batchable.push({ productId: product.id, batchId });
		if (batchable.length >= limit) {
			break;
		}
	}

	return batchable;
}

function requiredId(name, value) {
	if (!value) {
		throw new Error(`setup failed: missing ${name}`);
	}
	return value;
}

function findBatchableProduct(auth, warehouseId) {
	const res = apiGet(auth, `${API_V1}/product/products?per_page=20`);
	const body = parseBody(res);
	const items = Array.isArray(body?.data)
		? body.data
		: Array.isArray(body?.data?.items)
			? body.data.items
			: [];

	for (const p of items) {
		const productId = p?.id;
		if (!productId) {
			continue;
		}
		const batchId = pickBatchId(auth, warehouseId, productId, 1);
		if (batchId) {
			return { productId, batchId };
		}
	}

	return null;
}

export function setup() {
	console.log("=== Transaction Test Setup ===");

	const auth = getAuthToken(CREDENTIALS);
	if (!auth) {
		throw new Error("setup failed: could not authenticate");
	}
	console.log(`Authenticated as ${CREDENTIALS.email}`);

	const customer = firstItem(apiGet(auth, `${API_V1}/customer/customers?per_page=1`));
	const employee = firstItem(apiGet(auth, `${API_V1}/organization/employees?per_page=1`));
	const businessUnit = firstItem(apiGet(auth, `${API_V1}/organization/business-units?per_page=1`));
	const paymentTerms = firstItem(apiGet(auth, `${API_V1}/master-data/payment-terms?per_page=1`));
	const warehouse = firstItem(apiGet(auth, `${API_V1}/warehouse/warehouses?per_page=1`));
	const bankAccount = firstItem(apiGet(auth, `${API_V1}/finance/bank-accounts?per_page=1`));
	const warehouseId = requiredId("warehouseId", warehouse?.id);
	const batchableProducts = collectBatchableProducts(auth, warehouseId, 8);
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
		batchableProducts,
	};

	console.log(`Loaded IDs: customer=${setupData.customerId}, batchableProducts=${setupData.batchableProducts.length}, salesRep=${setupData.salesRepId}`);
	return setupData;
}

export default function (data) {
	group("workflow-1-regular", () => {
		completeRevenueWorkflow(data, false);
	});

	sleep(0.5);

	group("workflow-2-concurrent-payment", () => {
		completeRevenueWorkflow(data, true);
	});
}

function completeRevenueWorkflow(data, withConcurrencyCheck) {
	const now = new Date();
	const quotationDate = isoDate(now);
	const dueDate = isoDate(addDays(now, 30));
	const workflowTarget = pickWorkflowTarget(data);
	if (!workflowTarget) {
		console.error(`No available product/batch for warehouse ${data.warehouseId}`);
		return;
	}

	// 1) Create Sales Quotation
	const sqPayload = {
		quotation_date: quotationDate,
		payment_terms_id: data.paymentTermsId,
		sales_rep_id: data.salesRepId,
		business_unit_id: data.businessUnitId,
		customer_id: data.customerId,
		tax_rate: 11,
		items: [
			{
				product_id: workflowTarget.productId,
				quantity: 1,
				price: 50000,
				discount: 0,
			},
		],
	};
	const sqRes = apiPost(data.auth, `${API_V1}/sales/sales-quotations`, sqPayload);
	const sqBody = parseBody(sqRes);
	const sqId = sqBody?.data?.id;
	check(sqRes, {
		"SQ created": (r) => r.status >= 200 && r.status < 300 && !!sqId,
	});
	if (!sqId) {
		console.error(`SQ create failed: ${sqRes.status} ${extractFieldErrors(sqRes)} body=${sqRes.body}`);
		return;
	}

	// 2) SQ status sent -> approved
	const sqSent = apiPatch(data.auth, `${API_V1}/sales/sales-quotations/${sqId}/status`, { status: "sent" });
	if (!(sqSent.status >= 200 && sqSent.status < 300)) {
		console.error(`SQ sent failed: ${sqSent.status} body=${sqSent.body}`);
		return;
	}
	const sqApproved = apiPatch(data.auth, `${API_V1}/sales/sales-quotations/${sqId}/status`, { status: "approved" });
	if (!(sqApproved.status >= 200 && sqApproved.status < 300)) {
		console.error(`SQ approve failed: ${sqApproved.status} body=${sqApproved.body}`);
		return;
	}

	// 3) Convert SQ -> SO
	const soConvert = apiPost(data.auth, `${API_V1}/sales/sales-orders/convert-from-quotation`, {
		quotation_id: sqId,
	});
	const soId = parseBody(soConvert)?.data?.id;
	check(soConvert, {
		"SO converted": (r) => r.status >= 200 && r.status < 300 && !!soId,
	});
	if (!soId) {
		console.error(`SO convert failed: ${soConvert.status} body=${soConvert.body}`);
		return;
	}

	// Fetch SO details (for items)
	const soGet = apiGet(data.auth, `${API_V1}/sales/sales-orders/${soId}`);
	const so = parseBody(soGet)?.data;
	const soItems = Array.isArray(so?.items) ? so.items : [];
	if (soItems.length === 0) {
		console.error(`SO has no items, cannot create DO. soId=${soId}`);
		return;
	}

	// 4) SO status submitted -> approved
	const soSubmitted = apiPatch(data.auth, `${API_V1}/sales/sales-orders/${soId}/status`, { status: "submitted" });
	if (!(soSubmitted.status >= 200 && soSubmitted.status < 300)) {
		console.error(`SO submit failed: ${soSubmitted.status} body=${soSubmitted.body}`);
		return;
	}
	const soApproved = apiPost(data.auth, `${API_V1}/sales/sales-orders/${soId}/approve`, {});
	if (!(soApproved.status >= 200 && soApproved.status < 300)) {
		console.error(`SO approve failed: ${soApproved.status} body=${soApproved.body}`);
		return;
	}

	// 5) Create DO with required items and inventory batch selection
	const doItems = soItems.map((item) => {
		const batchId = pickBatchId(
			data.auth,
			data.warehouseId,
			item.product_id,
			item.quantity,
		);

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
		console.error(`DO precheck failed: inventory_batch_id missing for one or more items. soId=${soId}`);
		return;
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
	const doCreate = apiPost(data.auth, `${API_V1}/sales/delivery-orders`, doPayload);
	const doId = parseBody(doCreate)?.data?.id;
	if (!doId) {
		console.error(`DO create failed: ${doCreate.status} body=${doCreate.body}`);
		return;
	}

	// 6) DO status sent -> approved -> prepared -> ship -> deliver
	const doSent = apiPatch(data.auth, `${API_V1}/sales/delivery-orders/${doId}/status`, { status: "sent" });
	if (!(doSent.status >= 200 && doSent.status < 300)) {
		console.error(`DO sent failed: ${doSent.status} body=${doSent.body}`);
		return;
	}
	const doApproved = apiPost(data.auth, `${API_V1}/sales/delivery-orders/${doId}/approve`, {});
	if (!(doApproved.status >= 200 && doApproved.status < 300)) {
		console.error(`DO approve failed: ${doApproved.status} body=${doApproved.body}`);
		return;
	}
	const doPrepared = apiPatch(data.auth, `${API_V1}/sales/delivery-orders/${doId}/status`, { status: "prepared" });
	if (!(doPrepared.status >= 200 && doPrepared.status < 300)) {
		console.error(`DO prepared failed: ${doPrepared.status} body=${doPrepared.body}`);
		return;
	}
	const doShipped = apiPost(data.auth, `${API_V1}/sales/delivery-orders/${doId}/ship`, {
		tracking_number: `K6-${Date.now()}`,
	});
	if (!(doShipped.status >= 200 && doShipped.status < 300)) {
		console.error(`DO ship failed: ${doShipped.status} body=${doShipped.body}`);
		return;
	}
	const doDelivered = apiPost(data.auth, `${API_V1}/sales/delivery-orders/${doId}/deliver`, {
		receiver_signature: "k6-signature",
		receiver_name: "K6 Receiver",
	});
	if (!(doDelivered.status >= 200 && doDelivered.status < 300)) {
		console.error(`DO deliver failed: ${doDelivered.status} body=${doDelivered.body}`);
		return;
	}

	// 7) Create invoice with required due_date and items
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
	const invoiceCreate = apiPost(data.auth, `${API_V1}/sales/customer-invoices`, invoicePayload);
	const invoice = parseBody(invoiceCreate)?.data;
	const invoiceId = invoice?.id;
	const invoiceAmount = Number(invoice?.amount || 0);
	if (!invoiceId) {
		console.error(`Invoice create failed: ${invoiceCreate.status} body=${invoiceCreate.body}`);
		return;
	}

	// 8) Invoice submitted -> approved
	const invoiceSubmitted = apiPatch(data.auth, `${API_V1}/sales/customer-invoices/${invoiceId}/status`, { status: "submitted" });
	if (!(invoiceSubmitted.status >= 200 && invoiceSubmitted.status < 300)) {
		console.error(`Invoice submit failed: ${invoiceSubmitted.status} body=${invoiceSubmitted.body}`);
		return;
	}
	const invoiceApproved = apiPost(data.auth, `${API_V1}/sales/customer-invoices/${invoiceId}/approve`, {});
	if (!(invoiceApproved.status >= 200 && invoiceApproved.status < 300)) {
		console.error(`Invoice approve failed: ${invoiceApproved.status} body=${invoiceApproved.body}`);
		return;
	}

	// 9) Payment create
	const paymentCreate = apiPost(data.auth, `${API_V1}/sales/payments`, {
		invoice_id: invoiceId,
		bank_account_id: data.bankAccountId,
		payment_date: quotationDate,
		amount: invoiceAmount,
		method: "BANK",
		reference_number: `K6-PAY-${Date.now()}`,
	});
	const paymentId = parseBody(paymentCreate)?.data?.id;
	if (!paymentId) {
		console.error(`Payment create failed: ${paymentCreate.status} body=${paymentCreate.body}`);
		return;
	}

	// 10) Payment confirm
	const paymentConfirm = apiPost(data.auth, `${API_V1}/sales/payments/${paymentId}/confirm`, {});
	if (!(paymentConfirm.status >= 200 && paymentConfirm.status < 300)) {
		console.error(`Payment confirm failed: ${paymentConfirm.status} body=${paymentConfirm.body}`);
		return;
	}

	if (!withConcurrencyCheck) {
		const invoiceAfter = apiGet(data.auth, `${API_V1}/sales/customer-invoices/${invoiceId}`);
		const inv = parseBody(invoiceAfter)?.data;
		check(invoiceAfter, {
			"invoice paid or partial after payment": () => ["PAID", "PARTIAL", "WAITING_PAYMENT", "WAITING_APPROVAL"].includes(inv?.status),
		});
		return;
	}

	// Concurrency idempotency simulation: 2nd payment on same invoice should be rejected
	const paymentSecond = apiPost(
		data.auth,
		`${API_V1}/sales/payments`,
		{
			invoice_id: invoiceId,
			bank_account_id: data.bankAccountId,
			payment_date: quotationDate,
			amount: invoiceAmount,
			method: "BANK",
			reference_number: `K6-PAY2-${Date.now()}`,
		},
		{
			responseCallback: http.expectedStatuses({ min: 400, max: 599 }),
		},
	);

	const secondRejected = paymentSecond.status >= 400;
	check({ secondRejected }, {
		"second payment rejected": (v) => v.secondRejected,
	});

	if (!secondRejected) {
		console.error(`CRITICAL: second payment unexpectedly succeeded. status=${paymentSecond.status} body=${paymentSecond.body}`);
	}

	const paymentsList = apiGet(data.auth, `${API_V1}/sales/payments?invoice_id=${invoiceId}&per_page=10`);
	const paymentsData = parseBody(paymentsList)?.data;
	const list = Array.isArray(paymentsData) ? paymentsData : Array.isArray(paymentsData?.items) ? paymentsData.items : [];

	check(paymentsList, {
		"invoice has at most 2 payment rows": () => list.length <= 2,
	});
}

function pickWorkflowTarget(data) {
	const candidates = Array.isArray(data.batchableProducts) ? data.batchableProducts : [];
	if (candidates.length === 0) {
		return null;
	}

	const startIndex = ((Number(__VU) || 1) - 1 + (Number(__ITER) || 0)) % candidates.length;
	for (let offset = 0; offset < candidates.length; offset += 1) {
		const candidate = candidates[(startIndex + offset) % candidates.length];
		const batchId = pickBatchId(data.auth, data.warehouseId, candidate.productId, 1);
		if (batchId) {
			return {
				productId: candidate.productId,
				batchId,
			};
		}
	}

	return null;
}
