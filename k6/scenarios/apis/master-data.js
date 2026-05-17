// k6/scenarios/apis/master-data.js
// Reusable scenario: master data endpoints (read-only, frequent operations).

import { check } from "k6";
import { authGet, authPost } from "../../auth-helper.js";
import { AUTH_ENDPOINTS, checkSuccess, checkList } from "../../config.js";

export function listUsers(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.users, auth, {
		tags: { name: "master:users" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listRoles(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.roles, auth, {
		tags: { name: "master:roles" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listProducts(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.products, auth, {
		tags: { name: "master:products:list" },
		...params,
	});
	checkList(check, res);
	return res;
}

export function getProductDetail(auth, productId, params = {}) {
	const res = authGet(`${AUTH_ENDPOINTS.products}/${productId}`, auth, {
		tags: { name: "master:products:detail" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function createProduct(auth, payload, params = {}) {
	const res = authPost(AUTH_ENDPOINTS.products, payload, auth, {
		tags: { name: "master:products:create" },
		...params,
	});
	check(res, {
		"product create returns 2xx": (r) => r.status >= 200 && r.status < 300,
	});
	return res;
}

export function listCustomers(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.customers, auth, {
		tags: { name: "master:customers:list" },
		...params,
	});
	checkList(check, res);
	return res;
}

export function getCustomerDetail(auth, customerId, params = {}) {
	const res = authGet(`${AUTH_ENDPOINTS.customers}/${customerId}`, auth, {
		tags: { name: "master:customers:detail" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listSuppliers(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.suppliers, auth, {
		tags: { name: "master:suppliers:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listWarehouses(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.warehouses, auth, {
		tags: { name: "master:warehouses:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listCurrencies(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.currency, auth, {
		tags: { name: "master:currencies:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}
