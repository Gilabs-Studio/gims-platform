// k6/scenarios/apis/misc.js
// Reusable scenario: Low-priority/internal module endpoints (AI, Travel, Feedback).

import { authGet } from "../../auth-helper.js";
import { API_V1 } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

// ── AI ────────────────────────────────────────────────────────────────────────
export function listAISessions(auth, params = {}) {
	const p = { ...getTaggedParams("ai:sessions:list"), ...params };
	return authGet(`${API_V1}/ai/sessions`, auth, p);
}

export function listAIAdminActions(auth, params = {}) {
	const p = { ...getTaggedParams("ai:admin-actions:list"), ...params };
	return authGet(`${API_V1}/ai/admin/actions`, auth, p);
}

export function listAIAdminIntents(auth, params = {}) {
	const p = { ...getTaggedParams("ai:admin-intents:list"), ...params };
	return authGet(`${API_V1}/ai/admin/intents`, auth, p);
}

// ── Travel Planner ────────────────────────────────────────────────────────────
export function listTravelPlans(auth, params = {}) {
	const p = { ...getTaggedParams("travel:plans:list"), ...params };
	return authGet(`${API_V1}/travel/travel-planner/plans`, auth, p);
}

// ── Feedback ──────────────────────────────────────────────────────────────────
export function listFeedbackForms(auth, params = {}) {
	const p = { ...getTaggedParams("feedback:forms:list"), ...params };
	return authGet(`${API_V1}/feedback/forms`, auth, p);
}
