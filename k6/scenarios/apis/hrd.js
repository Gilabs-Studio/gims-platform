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

export function listWorkSchedules(auth, params = {}) {
	const p = { ...getTaggedParams("hrd:work-schedules:list"), ...params };
	return authGet(`${API_V1}/hrd/work-schedules`, auth, p);
}

export function listHolidays(auth, params = {}) {
	const p = { ...getTaggedParams("hrd:holidays:list"), ...params };
	return authGet(`${API_V1}/hrd/holidays`, auth, p);
}

export function listOvertimeRequests(auth, params = {}) {
	const p = { ...getTaggedParams("hrd:overtime:list"), ...params };
	return authGet(`${API_V1}/hrd/overtime`, auth, p);
}

export function listEmployeeEvaluations(auth, params = {}) {
	const p = { ...getTaggedParams("hrd:evaluations:list"), ...params };
	return authGet(`${API_V1}/hrd/employee-evaluations`, auth, p);
}

export function listEvaluationCriteria(auth, params = {}) {
	const p = { ...getTaggedParams("hrd:evaluation-criteria:list"), ...params };
	return authGet(`${API_V1}/hrd/evaluation-criteria`, auth, p);
}

export function listEvaluationGroups(auth, params = {}) {
	const p = { ...getTaggedParams("hrd:evaluation-groups:list"), ...params };
	return authGet(`${API_V1}/hrd/evaluation-groups`, auth, p);
}

export function listRecruitmentRequests(auth, params = {}) {
	const p = { ...getTaggedParams("hrd:recruitment:list"), ...params };
	return authGet(`${API_V1}/hrd/recruitment-requests`, auth, p);
}

export function listRecruitmentApplicants(auth, params = {}) {
	const p = { ...getTaggedParams("hrd:applicants:list"), ...params };
	return authGet(`${API_V1}/hrd/applicants`, auth, p);
}

export function listSalaryStructures(auth, params = {}) {
	const p = { ...getTaggedParams("hrd:salary:list"), ...params };
	return authGet(`${API_V1}/hrd/salary`, auth, p);
}