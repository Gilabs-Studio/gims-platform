// k6/scenarios/apis/finance.js
// Reusable scenario: finance module endpoints (read-heavy).

import { check } from "k6";
import { authGet } from "../../auth-helper.js";
import { AUTH_ENDPOINTS, checkSuccess } from "../../config.js";

export function listChartOfAccounts(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.coa, auth, {
		tags: { name: "finance:coa:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listJournals(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.journals, auth, {
		tags: { name: "finance:journals:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listBudgets(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.budgets, auth, {
		tags: { name: "finance:budgets:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listBankAccounts(auth, params = {}) {
	const res = authGet(`${AUTH_ENDPOINTS.coa}/bank-accounts`, auth, {
		tags: { name: "finance:bank-accounts:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}
