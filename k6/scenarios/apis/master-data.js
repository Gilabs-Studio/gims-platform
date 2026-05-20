// k6/scenarios/apis/master-data.js
// Reusable scenario: Master data endpoints (read-heavy, frequent operations).

import { check } from "k6";
import { authGet, authPost } from "../../auth-helper.js";
import { AUTH_ENDPOINTS, API_V1, checkSuccess, checkList } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

export function listUsers(auth, params = {}) {
	const p = { ...getTaggedParams("master:users:list"), ...params };
	return authGet(AUTH_ENDPOINTS.users, auth, p);
}

export function listRoles(auth, params = {}) {
	const p = { ...getTaggedParams("master:roles:list"), ...params };
	return authGet(AUTH_ENDPOINTS.roles, auth, p);
}

export function listProducts(auth, params = {}) {
	const p = { ...getTaggedParams("master:products:list"), ...params };
	return authGet(AUTH_ENDPOINTS.products, auth, p);
}

export function getProductDetail(auth, productId, params = {}) {
	return authGet(`${AUTH_ENDPOINTS.products}/${productId}`, auth, {
		tags: { name: "master:products:detail", endpoint: "master:products:detail", module: "master-data", tier: "crud" },
		...params,
	});
}

export function createProduct(auth, payload, params = {}) {
	const p = { ...getTaggedParams("master:products:create"), ...params };
	return authPost(AUTH_ENDPOINTS.products, payload, auth, p);
}

export function listCustomers(auth, params = {}) {
	const p = { ...getTaggedParams("master:customers:list"), ...params };
	return authGet(AUTH_ENDPOINTS.customers, auth, p);
}

export function getCustomerDetail(auth, customerId, params = {}) {
	return authGet(`${AUTH_ENDPOINTS.customers}/${customerId}`, auth, {
		tags: { name: "master:customers:detail", endpoint: "master:customers:detail", module: "master-data", tier: "crud" },
		...params,
	});
}

export function listSuppliers(auth, params = {}) {
	const p = { ...getTaggedParams("master:suppliers:list"), ...params };
	return authGet(AUTH_ENDPOINTS.suppliers, auth, p);
}

export function listWarehouses(auth, params = {}) {
	const p = { ...getTaggedParams("master:warehouses:list"), ...params };
	return authGet(AUTH_ENDPOINTS.warehouses, auth, p);
}

export function listCurrencies(auth, params = {}) {
	const p = { ...getTaggedParams("master:currencies:list"), ...params };
	return authGet(AUTH_ENDPOINTS.currency, auth, p);
}