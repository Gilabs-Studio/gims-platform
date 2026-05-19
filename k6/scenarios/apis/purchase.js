// k6/scenarios/apis/purchase.js
// Reusable scenario: Purchase module endpoints.

import { authGet } from "../../auth-helper.js";
import { API_V1 } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

export function listPurchaseOrders(auth, params = {}) {
	const p = { ...getTaggedParams("purchase:orders:list"), ...params };
	return authGet(`${API_V1}/purchase/purchase-orders`, auth, p);
}

export function listGoodsReceipts(auth, params = {}) {
	return authGet(`${API_V1}/purchase/goods-receipt`, auth, {
		tags: { name: "purchase:goods-receipt:list", endpoint: "purchase:goods-receipt:list", module: "purchase", tier: "list" },
		...params,
	});
}

export function listPurchaseRequisitions(auth, params = {}) {
	const p = { ...getTaggedParams("purchase:requisitions:list"), ...params };
	return authGet(`${API_V1}/purchase/purchase-requisitions`, auth, p);
}

export function listPurchaseReturns(auth, params = {}) {
	const p = { ...getTaggedParams("purchase:returns:list"), ...params };
	return authGet(`${API_V1}/purchase/returns`, auth, p);
}

export function listPurchasePayments(auth, params = {}) {
	const p = { ...getTaggedParams("purchase:payments:list"), ...params };
	return authGet(`${API_V1}/purchase/payments`, auth, p);
}

export function listSupplierInvoices(auth, params = {}) {
	const p = { ...getTaggedParams("purchase:supplier-invoices:list"), ...params };
	return authGet(`${API_V1}/purchase/supplier-invoices`, auth, p);
}

export function listSupplierInvoiceDownPayments(auth, params = {}) {
	const p = { ...getTaggedParams("purchase:supplier-invoice-dp:list"), ...params };
	return authGet(`${API_V1}/purchase/supplier-invoice-down-payments`, auth, p);
}

export function listPayableRecap(auth, params = {}) {
	const p = { ...getTaggedParams("purchase:payable-recap:list"), ...params };
	return authGet(`${API_V1}/purchase/payable-recap`, auth, p);
}