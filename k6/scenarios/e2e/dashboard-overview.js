// k6/scenarios/e2e/dashboard-overview.js
// Dashboard overview — lightweight authenticated check.

import { authGet } from "../../auth-helper.js";
import { AUTH_ENDPOINTS } from "../../config.js";

const WORKFLOW_TAGS = { endpoint: "general:dashboard", module: "general", tier: "crud" };

export function dashboardOverview(auth) {
	return authGet(AUTH_ENDPOINTS.dashboard, auth, {
		tags: { name: "general:dashboard", ...WORKFLOW_TAGS },
	});
}