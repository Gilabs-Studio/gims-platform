// k6/scenarios/apis/supporting.js
// Reusable scenario: Supporting module endpoints (Notification, Loyalty, General, Supplier extras).

import { authGet } from "../../auth-helper.js";
import { API_V1 } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

// ── Notification ──────────────────────────────────────────────────────────────
export function listNotifications(auth, params = {}) {
	const p = { ...getTaggedParams("notification:list"), ...params };
	return authGet(`${API_V1}/notifications`, auth, p);
}

// ── Loyalty ───────────────────────────────────────────────────────────────────
export function listLoyaltyPrograms(auth, params = {}) {
	const p = { ...getTaggedParams("loyalty:programs:list"), ...params };
	return authGet(`${API_V1}/loyalty/programs`, auth, p);
}

export function listLoyaltyMembers(auth, params = {}) {
	const p = { ...getTaggedParams("loyalty:members:list"), ...params };
	return authGet(`${API_V1}/loyalty/members`, auth, p);
}

// ── General ───────────────────────────────────────────────────────────────────
export function getOnboardingStatus(auth, params = {}) {
	const p = { ...getTaggedParams("general:onboarding:get"), ...params };
	return authGet(`${API_V1}/general/onboarding`, auth, p);
}

// ── Supplier (extras beyond basic list) ───────────────────────────────────────
export function listSupplierTypes(auth, params = {}) {
	const p = { ...getTaggedParams("supplier:types:list"), ...params };
	return authGet(`${API_V1}/supplier/supplier-types`, auth, p);
}

export function listSupplierBanks(auth, params = {}) {
	const p = { ...getTaggedParams("supplier:banks:list"), ...params };
	return authGet(`${API_V1}/supplier/banks`, auth, p);
}
