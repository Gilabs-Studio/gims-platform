// k6/scenarios/apis/core.js
// Reusable scenario: Core master-data endpoints (payment-terms, bank-accounts, etc.)

import { authGet } from "../../auth-helper.js";
import { API_V1 } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

export function listPaymentTerms(auth, params = {}) {
	const p = { ...getTaggedParams("core:payment-terms:list"), ...params };
	return authGet(`${API_V1}/master-data/payment-terms`, auth, p);
}

export function listBankAccounts(auth, params = {}) {
	const p = { ...getTaggedParams("core:bank-accounts:list"), ...params };
	return authGet(`${API_V1}/finance/bank-accounts`, auth, p);
}

export function listLeaveTypes(auth, params = {}) {
	const p = { ...getTaggedParams("core:leave-types:list"), ...params };
	return authGet(`${API_V1}/master-data/leave-types`, auth, p);
}

export function listCourierAgencies(auth, params = {}) {
	const p = { ...getTaggedParams("core:courier-agencies:list"), ...params };
	return authGet(`${API_V1}/master-data/courier-agencies`, auth, p);
}

export function listSOSources(auth, params = {}) {
	const p = { ...getTaggedParams("core:so-sources:list"), ...params };
	return authGet(`${API_V1}/master-data/so-sources`, auth, p);
}
