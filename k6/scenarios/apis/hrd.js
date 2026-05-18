// k6/scenarios/apis/hrd.js
// Reusable scenario: HRD module endpoints.

import { authGet } from "../../auth-helper.js";
import { API_V1, checkSuccess } from "../../config.js";
import { getTaggedParams } from "../../lib/endpoint-registry.js";

export function listAttendance(auth, params = {}) {
	const p = { ...getTaggedParams("hrd:attendance:list"), ...params };
	return authGet(`${API_V1}/hrd/attendance`, auth, p);
}

export function listLeaveRequests(auth, params = {}) {
	const p = { ...getTaggedParams("hrd:leaves:list"), ...params };
	return authGet(`${API_V1}/hrd/leave-requests`, auth, p);
}

export function listEmployees(auth, params = {}) {
	const p = { ...getTaggedParams("hrd:employees:list"), ...params };
	return authGet(`${API_V1}/organization/employees`, auth, p);
}