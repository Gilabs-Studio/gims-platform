// k6/scenarios/apis/inventory.js
// Reusable scenario: Inventory module endpoints.

import http from "k6/http";
import { authGet } from "../../auth-helper.js";
import { API_V1 } from "../../config.js";

export function listStock(auth, params = {}) {
	return authGet(`${API_V1}/stock/inventory`, auth, {
		tags: { name: "inventory:stock:list", endpoint: "inventory:stock:list", module: "inventory", tier: "list" },
		...params,
	});
}

export function getStockMetrics(auth, params = {}) {
	return authGet(`${API_V1}/stock/inventory/metrics`, auth, {
		tags: { name: "inventory:stock:metrics", endpoint: "inventory:stock:metrics", module: "inventory", tier: "crud" },
		...params,
	});
}

export function listMovements(auth, params = {}) {
	return authGet(`${API_V1}/stock/movements`, auth, {
		tags: { name: "inventory:movements:list", endpoint: "inventory:movements:list", module: "inventory", tier: "list" },
		...params,
	});
}