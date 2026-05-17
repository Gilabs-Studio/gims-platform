// k6/scenarios/apis/sales.js
// Reusable scenario: sales module endpoints.

import { check } from "k6";
import { authGet } from "../../auth-helper.js";
import { AUTH_ENDPOINTS, API_V1, checkSuccess } from "../../config.js";

export function listQuotations(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.quotations, auth, {
		tags: { name: "sales:quotations:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listOrders(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.orders, auth, {
		tags: { name: "sales:orders:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listDeliveryOrders(auth, params = {}) {
	const res = authGet(`${API_V1}/sales/delivery-orders`, auth, {
		tags: { name: "sales:delivery-orders:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listInvoices(auth, params = {}) {
	const res = authGet(`${API_V1}/sales/customer-invoices`, auth, {
		tags: { name: "sales:invoices:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listPayments(auth, params = {}) {
	const res = authGet(`${API_V1}/sales/payments`, auth, {
		tags: { name: "sales:payments:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}
