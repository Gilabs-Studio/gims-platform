// k6/scenarios/e2e/attendance-checkin.js
// HRD Attendance Check-In workflow with timezone-aware timestamps.

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authGet, authPost } from "../../auth-helper.js";
import { parseBody, isoDate } from "../../lib/helpers.js";

const WORKFLOW_TAGS = { endpoint: "e2e:attendance-checkin", module: "hrd", tier: "workflow" };

export function attendanceCheckinCycle(auth, data) {
	const now = new Date();
	const today = isoDate(now);

	// STEP 1: Clock In
	const clockInPayload = {
		employee_id: data.employeeId,
		date: today,
		check_in_type: "NORMAL",
	};

	const clockInRes = authPost(`${API_V1}/hrd/attendance/clock-in`, clockInPayload, auth, {
		tags: { name: "hrd:attendance:clock-in", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	const attendanceId = parseBody(clockInRes)?.data?.id;
	check(clockInRes, {
		"Clock-in succeeded": (r) => r.status >= 200 && r.status < 300 && !!attendanceId,
	});

	// STEP 2: Clock Out
	if (attendanceId) {
		const clockOutRes = authPost(`${API_V1}/hrd/attendance/clock-out`, {
			attendance_id: attendanceId,
		}, auth, {
			tags: { name: "hrd:attendance:clock-out", ...WORKFLOW_TAGS },
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		});
		check(clockOutRes, { "Clock-out succeeded": (r) => r.status >= 200 && r.status < 300 });
	}

	// STEP 3: Create Leave Request (if leave type available)
	let leaveRequestId = null;
	if (data.leaveTypeId) {
		const leavePayload = {
			employee_id: data.employeeId,
			leave_type_id: data.leaveTypeId,
			start_date: today,
			end_date: isoDate(new Date(now.getTime() + 86400000)),
			reason: "K6 load test leave request",
		};
		const leaveRes = authPost(`${API_V1}/hrd/leave-requests/self`, leavePayload, auth, {
			tags: { name: "hrd:leaves:create", ...WORKFLOW_TAGS },
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		});
		leaveRequestId = parseBody(leaveRes)?.data?.id;
		check(leaveRes, { "Leave request created": (r) => r.status >= 200 && r.status < 300 });
	}

	return { attendanceId, leaveRequestId };
}