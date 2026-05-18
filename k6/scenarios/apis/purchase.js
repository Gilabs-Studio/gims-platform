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