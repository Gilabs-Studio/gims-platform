// k6/scenarios/apis/finance.js
// Reusable scenario: Finance module endpoints.

import { authGet, authPost } from "../../auth-helper.js";
import { API_V1, checkSuccess } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

export function listChartOfAccounts(auth, params = {}) {
	const p = { ...getTaggedParams("finance:coa:list"), ...params };
	return authGet(`${API_V1}/finance/chart-of-accounts`, auth, p);
}

export function listJournalEntries(auth, params = {}) {
	const p = { ...getTaggedParams("finance:journals:list"), ...params };
	return authGet(`${API_V1}/finance/journal-entries`, auth, p);
}

export function createJournalEntry(auth, payload, params = {}) {
	const p = { ...getTaggedParams("finance:journals:create"), ...params };
	return authPost(`${API_V1}/finance/journal-entries`, payload, auth, p);
}

export function listBudgets(auth, params = {}) {
	const p = { ...getTaggedParams("finance:budget:list"), ...params };
	return authGet(`${API_V1}/finance/budget`, auth, p);
}