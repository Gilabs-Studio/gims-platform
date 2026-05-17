// k6/scenarios/e2e/dashboard-overview.js
// Reusable scenario: dashboard overview — lightweight endpoint hit every login.

import { check } from "k6";
import { authGet } from "../../auth-helper.js";
import { AUTH_ENDPOINTS, API_V1, checkSuccess } from "../../config.js";

export function dashboardOverview(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.dashboard, auth, {
		tags: { name: "dashboard:overview" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function billingSubscription(auth, params = {}) {
	const res = authGet(`${API_V1}/billing/subscription`, auth, {
		tags: { name: "billing:subscription" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function dashboardAndBilling(auth, params = {}) {
	dashboardOverview(auth, params);
	billingSubscription(auth, params);
}