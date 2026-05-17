// k6/scenarios/apis/inventory.js
// Reusable scenario: inventory module endpoints.

import { check } from "k6";
import { authGet } from "../../auth-helper.js";
import { API_V1, checkSuccess } from "../../config.js";

export function listStock(auth, params = {}) {
	const res = authGet(`${API_V1}/inventory/stock`, auth, {
		tags: { name: "inventory:stock:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listStockOpnames(auth, params = {}) {
	const res = authGet(`${API_V1}/stock-opnames`, auth, {
		tags: { name: "inventory:stock-opnames:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}
