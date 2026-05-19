// k6/scenarios/apis/crm.js
// Reusable scenario: CRM module endpoints.

import { authGet } from "../../auth-helper.js";
import { API_V1 } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

export function listLeads(auth, params = {}) {
	const p = { ...getTaggedParams("crm:leads:list"), ...params };
	return authGet(`${API_V1}/crm/leads`, auth, p);
}

export function listDeals(auth, params = {}) {
	const p = { ...getTaggedParams("crm:deals:list"), ...params };
	return authGet(`${API_V1}/crm/deals`, auth, p);
}

export function listContacts(auth, params = {}) {
	const p = { ...getTaggedParams("crm:contacts:list"), ...params };
	return authGet(`${API_V1}/crm/contacts`, auth, p);
}

export function listActivities(auth, params = {}) {
	const p = { ...getTaggedParams("crm:activities:list"), ...params };
	return authGet(`${API_V1}/crm/activities`, auth, p);
}

export function listActivityTypes(auth, params = {}) {
	const p = { ...getTaggedParams("crm:activity-types:list"), ...params };
	return authGet(`${API_V1}/crm/activity-types`, auth, p);
}

export function listTasks(auth, params = {}) {
	const p = { ...getTaggedParams("crm:tasks:list"), ...params };
	return authGet(`${API_V1}/crm/tasks`, auth, p);
}

export function listSchedules(auth, params = {}) {
	const p = { ...getTaggedParams("crm:schedules:list"), ...params };
	return authGet(`${API_V1}/crm/schedules`, auth, p);
}

export function listVisitReports(auth, params = {}) {
	const p = { ...getTaggedParams("crm:visits:list"), ...params };
	return authGet(`${API_V1}/crm/visits`, auth, p);
}

export function listPipelineStages(auth, params = {}) {
	const p = { ...getTaggedParams("crm:pipeline-stages:list"), ...params };
	return authGet(`${API_V1}/crm/pipeline-stages`, auth, p);
}

export function listAreaMappings(auth, params = {}) {
	const p = { ...getTaggedParams("crm:area-mapping:list"), ...params };
	return authGet(`${API_V1}/crm/area-mapping`, auth, p);
}

export function listLeadSources(auth, params = {}) {
	const p = { ...getTaggedParams("crm:lead-sources:list"), ...params };
	return authGet(`${API_V1}/crm/lead-sources`, auth, p);
}

export function listLeadStatuses(auth, params = {}) {
	const p = { ...getTaggedParams("crm:lead-statuses:list"), ...params };
	return authGet(`${API_V1}/crm/lead-statuses`, auth, p);
}

export function listContactRoles(auth, params = {}) {
	const p = { ...getTaggedParams("crm:contact-roles:list"), ...params };
	return authGet(`${API_V1}/crm/contact-roles`, auth, p);
}

export function listLeadAutomations(auth, params = {}) {
	const p = { ...getTaggedParams("crm:lead-automations:list"), ...params };
	return authGet(`${API_V1}/crm/leads/automation`, auth, p);
}

export function listAreaCaptures(auth, params = {}) {
	const p = { ...getTaggedParams("crm:area-captures:list"), ...params };
	return authGet(`${API_V1}/crm/area-mapping/map`, auth, p);
}
