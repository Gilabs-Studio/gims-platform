// k6/scenarios/e2e/attendance-checkin.js
// HRD Attendance Check-In workflow with timezone-aware timestamps.
//
// Correct GIMS API paths (from router/attendance_record_router.go):
//   POST /hrd/attendance/clock-in         → Check in (NOT POST /hrd/attendance)
//   POST /hrd/attendance/clock-out        → Check out (NOT PATCH /hrd/attendance/:id)
//   POST /hrd/attendance/manual            → Manual entry (admin)
//   GET  /hrd/attendance                   → List attendance records
//   POST /hrd/leave-requests/self          → Create leave request (self-service)
//   POST /hrd/leave-requests/self/:id/cancel → Cancel leave request
//
// Leave request routes (from router/leave_request_router.go):
//   POST /hrd/leave-requests              → Create (admin)
//   POST /hrd/leave-requests/self          → Create (self-service)
//   GET  /hrd/leave-requests/self          → List own leave requests
//   POST /hrd/leave-requests/:id/approve  → Approve

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authGet, authPost } from "../../auth-helper.js";
import { parseBody, isoDate, addDays, firstItem, requiredId } from "../../lib/helpers.js";

export function attendanceCheckinCycle(auth, data) {
	const now = new Date();
	const today = isoDate(now);

	// STEP 1: Clock In (POST /hrd/attendance/clock-in)
	const clockInPayload = {
		employee_id: data.employeeId,
		date: today,
		check_in_type: "NORMAL", // Required field: NORMAL, WFH, or FIELD_WORK
		// Timezone-aware: in production, timestamps should use apptime.NowForCompany(companyID)
	};

	const clockInRes = authPost(`${API_V1}/hrd/attendance/clock-in`, clockInPayload, auth, {
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	const attendanceId = parseBody(clockInRes)?.data?.id;
	check(clockInRes, {
		"Clock-in succeeded": (r) => r.status >= 200 && r.status < 300 && !!attendanceId,
	});
	if (!attendanceId) {
		console.error(`Clock-in failed: ${clockInRes.status} body=${clockInRes.body?.substring(0, 300)}`);
	}

	// STEP 2: Clock Out (POST /hrd/attendance/clock-out)
	if (attendanceId) {
		const clockOutRes = authPost(`${API_V1}/hrd/attendance/clock-out`, {
			attendance_id: attendanceId,
		}, auth, {
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		});
		check(clockOutRes, { "Clock-out succeeded": (r) => r.status >= 200 && r.status < 300 });
	}

	// STEP 3: Create Leave Request (if leave type available)
	let leaveRequestId = null;
	if (data.leaveTypeId) {
		const leavePayload = {
			leave_type_id: data.leaveTypeId,
			start_date: isoDate(addDays(now, 7)),
			end_date: isoDate(addDays(now, 9)),
			reason: "K6 load test - annual leave",
		};

		// Use self-service endpoint (POST /hrd/leave-requests/self)
		const leaveRes = authPost(`${API_V1}/hrd/leave-requests/self`, leavePayload, auth, {
			responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
		});
		leaveRequestId = parseBody(leaveRes)?.data?.id;
		check(leaveRes, { "Leave request created": (r) => r.status >= 200 && r.status < 300 && !!leaveRequestId });
	}

	return { attendanceId, leaveRequestId };
}

export function attendanceCheckinSetup(auth) {
	const employee = firstItem(authGet(`${API_V1}/organization/employees?per_page=1`, auth));
	const leaveTypesBody = parseBody(authGet(`${API_V1}/master-data/leave-types?per_page=10`, auth));
	const leaveTypeItems = Array.isArray(leaveTypesBody?.data)
		? leaveTypesBody.data
		: Array.isArray(leaveTypesBody?.data?.items)
			? leaveTypesBody.data.items
			: [];
	const leaveType = leaveTypeItems[0] || null;

	return {
		auth,
		employeeId: requiredId("employeeId", employee?.id),
		leaveTypeId: leaveType?.id || null,
	};
}