// k6/scenarios/apis/pos.js
// Reusable scenario: POS module endpoints.

import { authGet } from "../../auth-helper.js";
import { API_V1 } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

export function listPOSOrders(auth, params = {}) {
	const p = { ...getTaggedParams("pos:orders:list"), ...params };
	return authGet(`${API_V1}/pos/orders`, auth, p);
}

export function listPOSSessions(auth, params = {}) {
	const p = { ...getTaggedParams("pos:sessions:list"), ...params };
	return authGet(`${API_V1}/pos/sessions`, auth, p);
}

export function listFloorPlans(auth, params = {}) {
	const p = { ...getTaggedParams("pos:floor-plans:list"), ...params };
	return authGet(`${API_V1}/pos/floor-plans`, auth, p);
}

export function getPOSConfig(auth, outletId, params = {}) {
	if (!outletId || outletId === "SETUP_MISSING") return null;
	const p = { ...getTaggedParams("pos:config:get"), ...params };
	return authGet(`${API_V1}/pos/config/outlet/${outletId}`, auth, p);
}
