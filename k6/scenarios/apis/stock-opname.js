// k6/scenarios/apis/stock-opname.js
// Reusable scenario: Stock Opname module endpoints.

import { authGet } from "../../auth-helper.js";
import { API_V1 } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

export function listStockOpnames(auth, params = {}) {
	const p = { ...getTaggedParams("stock-opname:list"), ...params };
	return authGet(`${API_V1}/stock-opnames`, auth, p);
}
