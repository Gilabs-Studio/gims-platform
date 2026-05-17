// k6/scenarios/apis/hrd.js
// Reusable scenario: HRD module endpoints.

import { check } from "k6";
import { authGet } from "../../auth-helper.js";
import { AUTH_ENDPOINTS, API_V1, checkSuccess } from "../../config.js";

export function listAttendance(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.attendance, auth, {
		tags: { name: "hrd:attendance:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listLeaveRequests(auth, params = {}) {
	const res = authGet(AUTH_ENDPOINTS.leaves, auth, {
		tags: { name: "hrd:leaves:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}

export function listEmployees(auth, params = {}) {
	const res = authGet(`${API_V1}/organization/employees`, auth, {
		tags: { name: "hrd:employees:list" },
		...params,
	});
	checkSuccess(check, res);
	return res;
}
