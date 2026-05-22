// k6/scenarios/e2e/hrd.js
// HRD Module E2E Workflows — Attendance, leave requests, overtime.
//
// Exports:
//   - attendanceFlow(auth, data)       → Manual attendance entry
//   - leaveRequestFlow(auth, data)     → Create leave request (self-service)
//   - errorDoubleAttendance(auth, data) → Duplicate attendance for same date

import { check } from "k6";
import http from "k6/http";
import { API_V1 } from "../../config.js";
import { authPost } from "../../auth-helper.js";
import { parseBody, isoDate } from "../../lib/helpers.js";

const TAGS = { module: "hrd", tier: "workflow" };

function tag(endpoint) {
	return { tags: { name: endpoint, endpoint, ...TAGS }, responseCallback: http.expectedStatuses({ min: 200, max: 599 }) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW 1: Attendance Flow (manual entry)
// ═══════════════════════════════════════════════════════════════════════════════
export function attendanceFlow(auth, data) {
	if (data.employeeId === "SETUP_MISSING") return null;

	// Use random past date to avoid collisions
	const randomDaysBack = Math.floor(Math.random() * 365) + 30;
	const attendanceDate = new Date(Date.now() - randomDaysBack * 86400000);
	const dateStr = isoDate(attendanceDate);

	const payload = {
		employee_id: data.employeeId,
		date: dateStr,
		check_in_time: dateStr + "T08:00:00+07:00",
		check_out_time: dateStr + "T17:00:00+07:00",
		check_in_type: "NORMAL",
		status: "PRESENT",
		notes: "K6 E2E attendance test",
	};

	const res = authPost(`${API_V1}/hrd/attendance/manual`, payload, auth, tag("hrd:attendance:manual"));
	const attendance = parseBody(res)?.data;
	check(res, { "Attendance created": (r) => r.status >= 200 && r.status < 300 && !!attendance?.id });

	return { attendanceId: attendance?.id };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW 2: Leave Request Flow (self-service)
// ═══════════════════════════════════════════════════════════════════════════════
export function leaveRequestFlow(auth, data) {
	if (!data.leaveTypeId) return null;

	// Use random future date to avoid collisions
	const randomDaysAhead = Math.floor(Math.random() * 365) + 30;
	const leaveStart = new Date(Date.now() + randomDaysAhead * 86400000);
	const leaveEnd = new Date(leaveStart.getTime() + 86400000);

	const payload = {
		leave_type_id: data.leaveTypeId,
		start_date: isoDate(leaveStart),
		end_date: isoDate(leaveEnd),
		duration: "FULL_DAY",
		reason: "K6 E2E leave request for performance testing workflow",
	};

	const res = authPost(`${API_V1}/hrd/leave-requests/self`, payload, auth, tag("hrd:leave:create-self"));
	const leave = parseBody(res)?.data;
	check(res, { "Leave request created": (r) => r.status >= 200 && r.status < 300 });

	return { leaveId: leave?.id };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CASE 3: Double attendance (same employee + same date)
// ═══════════════════════════════════════════════════════════════════════════════
export function errorDoubleAttendance(auth, data) {
	if (data.employeeId === "SETUP_MISSING") return null;

	// Use a fixed date far in the past for this test
	const fixedDate = "2024-01-15";

	const payload = {
		employee_id: data.employeeId,
		date: fixedDate,
		check_in_time: fixedDate + "T08:00:00+07:00",
		check_out_time: fixedDate + "T17:00:00+07:00",
		check_in_type: "NORMAL",
		status: "PRESENT",
		notes: "K6 double attendance test",
	};

	// First entry
	authPost(`${API_V1}/hrd/attendance/manual`, payload, auth, tag("hrd:error:first-attendance"));

	// Second entry same date (should fail)
	const secondRes = authPost(`${API_V1}/hrd/attendance/manual`, payload, auth, tag("hrd:error:double-attendance"));
	check(secondRes, {
		"Double attendance rejected": (r) => r.status >= 400,
	});

	return { rejected: secondRes.status >= 400 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER: Execute all HRD workflows (called by profiler)
// ═══════════════════════════════════════════════════════════════════════════════
export function runHRDWorkflows(auth, data) {
	if (data.employeeId === "SETUP_MISSING") return;

	attendanceFlow(auth, data);
	leaveRequestFlow(auth, data);
	errorDoubleAttendance(auth, data);
}
