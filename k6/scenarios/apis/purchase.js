// k6/scenarios/apis/purchase.js
// Reusable scenario: purchase module endpoints.

import { check } from "k6";
import { authGet } from "../../auth-helper.js";
import { AUTH_ENDPOINTS, API_V1, checkSuccess } from "../../config.js";

export function listPurchaseOrders(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.purchaseOrders, auth, {
		tags: { name: "purchase:orders:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listGoodsReceipts(auth, params = {}) {
	const res = authGet(`${API_V1}/purchase/goods-receipt`, auth, {
		tags: { name: "purchase:goods-receipts:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}
