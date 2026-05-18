// k6/scenarios/apis/sales.js
// Reusable scenario: Sales module endpoints.

import { check } from "k6";
import { authGet, authPost, authPatch } from "../../auth-helper.js";
import { API_V1, checkSuccess } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";
import { parseBody, requiredId } from "../../lib/helpers.js";

export function listQuotations(auth, params = {}) {
	const p = { ...getTaggedParams("sales:quotations:list"), ...params };
	return authGet(`${API_V1}/sales/sales-quotations`, auth, p);
}

export function createQuotation(auth, payload, params = {}) {
	const p = { ...getTaggedParams("sales:quotations:create"), ...params };
	return authPost(`${API_V1}/sales/sales-quotations`, payload, auth, p);
}

export function listOrders(auth, params = {}) {
	const p = { ...getTaggedParams("sales:orders:list"), ...params };
	return authGet(`${API_V1}/sales/sales-orders`, auth, p);
}

export function listDeliveryOrders(auth, params = {}) {
	return authGet(`${API_V1}/sales/delivery-orders`, auth, {
		tags: { name: "sales:delivery-orders:list", endpoint: "sales:delivery-orders:list", module: "sales", tier: "list" },
		...params,
	});
}

export function listInvoices(auth, params = {}) {
	return authGet(`${API_V1}/sales/customer-invoices`, auth, {
		tags: { name: "sales:invoices:list", endpoint: "sales:invoices:list", module: "sales", tier: "list" },
		...params,
	});
}

export function listPayments(auth, params = {}) {
	return authGet(`${API_V1}/sales/payments`, auth, {
		tags: { name: "sales:payments:list", endpoint: "sales:payments:list", module: "sales", tier: "list" },
		...params,
	});
}