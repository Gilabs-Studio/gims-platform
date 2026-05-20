// k6/scenarios/apis/organization.js
// Reusable scenario: Organization module endpoints.

import { authGet } from "../../auth-helper.js";
import { API_V1 } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

export function listCompanies(auth, params = {}) {
	const p = { ...getTaggedParams("org:companies:list"), ...params };
	return authGet(`${API_V1}/organization/companies`, auth, p);
}

export function listBusinessUnits(auth, params = {}) {
	const p = { ...getTaggedParams("org:business-units:list"), ...params };
	return authGet(`${API_V1}/organization/business-units`, auth, p);
}

export function listDivisions(auth, params = {}) {
	const p = { ...getTaggedParams("org:divisions:list"), ...params };
	return authGet(`${API_V1}/organization/divisions`, auth, p);
}

export function listOutlets(auth, params = {}) {
	const p = { ...getTaggedParams("org:outlets:list"), ...params };
	return authGet(`${API_V1}/organization/outlets`, auth, p);
}

export function listAreas(auth, params = {}) {
	const p = { ...getTaggedParams("org:areas:list"), ...params };
	return authGet(`${API_V1}/organization/areas`, auth, p);
}

export function listOrgEmployees(auth, params = {}) {
	const p = { ...getTaggedParams("org:employees:list"), ...params };
	return authGet(`${API_V1}/organization/employees`, auth, p);
}

export function listJobPositions(auth, params = {}) {
	const p = { ...getTaggedParams("org:job-positions:list"), ...params };
	return authGet(`${API_V1}/organization/job-positions`, auth, p);
}

export function listBusinessTypes(auth, params = {}) {
	const p = { ...getTaggedParams("org:business-types:list"), ...params };
	return authGet(`${API_V1}/organization/business-types`, auth, p);
}
