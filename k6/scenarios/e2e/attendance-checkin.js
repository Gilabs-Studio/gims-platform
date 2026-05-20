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
	// Use a unique past date per call to avoid duplicate conflicts (same employee + same date)
	const randomDaysBack = Math.floor(Math.random() * 365) + 30; // 30-395 days in the past
	const uniqueDate = new Date(now.getTime() - randomDaysBack * 86400000);
	const today = isoDate(uniqueDate);

	// STEP 1: Create manual attendance entry (admin endpoint — avoids GPS radius check)
	const clockInPayload = {
		employee_id: data.employeeId,
		date: today,
		check_in_time: `${today}T08:00:00+07:00`,
		check_out_time: `${today}T17:00:00+07:00`,
		check_in_type: "NORMAL",
		status: "PRESENT",
		notes: "K6 load test attendance entry",
	};

	const clockInRes = authPost(`${API_V1}/hrd/attendance/manual`, clockInPayload, auth, {
		tags: { name: "hrd:attendance:clock-in", ...WORKFLOW_TAGS },
		responseCallback: http.expectedStatuses({ min: 200, max: 599 }),
	});
	const attendanceId = parseBody(clockInRes)?.data?.id;
	check(clockInRes, {
		"Clock-in succeeded": (r) => r.status >= 200 && r.status < 300 && !!attendanceId,
	});

	// STEP 2: Verify attendance was created (clock-out already included in manual entry)
	// Skip separate clock-out since manual entry covers full day

	// STEP 3: Create Leave Request (if leave type available)
	let leaveRequestId = null;
	if (data.leaveTypeId) {
		// Use a unique future date range to avoid duplicate conflicts
		const randomDaysAhead = Math.floor(Math.random() * 365) + 30; // 30-395 days in the future
		const leaveStart = new Date(now.getTime() + randomDaysAhead * 86400000);
		const leaveEnd = new Date(leaveStart.getTime() + 86400000);
		const leavePayload = {
			leave_type_id: data.leaveTypeId,
			start_date: isoDate(leaveStart),
			end_date: isoDate(leaveEnd),
			duration: "FULL_DAY",
			reason: "K6 load test leave request for performance profiling",
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