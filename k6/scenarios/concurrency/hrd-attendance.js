// k6/scenarios/concurrency/hrd-attendance.js
// Domain-concurrency scenario: HRD attendance under concurrent writes.
// Validates that employees are not double-checked-in during concurrent
// attendance creation for the SAME employee + SAME date.
//
// Why the manual endpoint: the live GPS clock-in endpoint enforces a
// "working day" rule (and returns 500 on non-working days — a separate backend
// finding). To deterministically test the no-duplicate invariant regardless of
// the calendar, this scenario uses POST /hrd/attendance/manual with a fixed
// target date that all concurrent VUs contend for.
//
// Business invariant tested:
// - For a given (employee, date), at most ONE attendance record can exist.
// - Concurrent creates for the same (employee, date): exactly one succeeds,
//   the rest are rejected with 409/422 (NOT 500, NOT a duplicate).

import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { API_V1 } from '../../config.js';
import { authGet, authPost } from '../../auth-helper.js';
import { parseBody, isoDate } from '../../lib/helpers.js';
import { conflictRate } from '../../lib/metrics.js';

const attendanceDoubleClockIn = new Counter('gims_attendance_double_clock_in');
const attendanceInvariantPass = new Rate('gims_attendance_invariant_pass');
// Backend returns 500 for an already-exists duplicate instead of 409 (improper
// error code, but the invariant itself is held). Tracked separately.
const improperErrorHandling = new Counter('gims_improper_error_handling');

const DUP_MESSAGE = 'already exists';

// All VUs in a run contend for the SAME target date so duplicates are forced.
// Use a fixed past weekday offset so it is deterministic within a run.
function contentionDate() {
  // 60 days back — safely in the past, avoids "future date" validation.
  const d = new Date(Date.now() - 60 * 86400000);
  return isoDate(d);
}

/**
 * Attempt to create a manual attendance entry for a shared (employee, date).
 * Concurrent callers contend for the same slot — only one should win.
 */
export function concurrentManualAttendance(auth, setupData, targetDate) {
  const tags = { name: 'concurrency:hrd:manual', endpoint: 'hrd:attendance:manual', module: 'hrd', tier: 'crud' };

  const payload = {
    employee_id: setupData.employeeId,
    date: targetDate,
    check_in_time: `${targetDate}T08:00:00+07:00`,
    check_out_time: `${targetDate}T17:00:00+07:00`,
    check_in_type: 'NORMAL',
    status: 'PRESENT',
    notes: `k6-concurrency-${__VU}-${__ITER}`,
  };

  const res = authPost(`${API_V1}/hrd/attendance/manual`, payload, auth, { tags });
  const status = res.status;
  const body = parseBody(res);

  // Detect the "already exists" duplicate rejection regardless of status code.
  const errDetail = JSON.stringify(body?.error || {}).toLowerCase();
  const isDuplicateReject = errDetail.includes(DUP_MESSAGE);

  // Invariant: success, or a duplicate-rejection (any code). A 5xx that is NOT
  // a duplicate rejection is a genuine server error.
  check(res, {
    'attendance: success or duplicate-reject': () =>
      (status >= 200 && status < 300) || status === 409 || status === 422 || isDuplicateReject,
  });

  if (status >= 200 && status < 300) {
    // First writer won
    attendanceInvariantPass.add(1);
  } else if (status === 409 || status === 422) {
    // Correct: duplicate (employee, date) rejected with proper code
    conflictRate.add(1);
    attendanceInvariantPass.add(1);
  } else if (isDuplicateReject) {
    // Duplicate correctly prevented, but wrong status code (500 instead of 409).
    // Invariant HELD; flag the improper error code separately.
    conflictRate.add(1);
    attendanceInvariantPass.add(1);
    if (status >= 500) {
      improperErrorHandling.add(1, { endpoint: 'hrd:attendance:manual' });
    }
  } else if (status >= 500) {
    // Genuine server error, not a duplicate — invariant may be broken
    attendanceInvariantPass.add(0);
  } else {
    // 400 etc. — clean validation, invariant not violated
    attendanceInvariantPass.add(1);
  }

  return { status, success: status >= 200 && status < 300, id: body?.data?.id || null };
}

/**
 * Full attendance contention simulation with invariant verification.
 * After concurrent creates, verifies the list shows at most ONE record for
 * the target (employee, date).
 */
export function attendanceRush(auth, setupData) {
  const targetDate = contentionDate();

  // 1. Read current attendance (read pressure)
  const listRes = authGet(`${API_V1}/hrd/attendance`, auth, {
    tags: { name: 'concurrency:hrd:list', endpoint: 'hrd:attendance:list', module: 'hrd', tier: 'list' },
  });
  check(listRes, {
    'attendance-list: status 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  // 2. Attempt to create a manual entry for the shared contention date
  concurrentManualAttendance(auth, setupData, targetDate);

  // 3. Verify invariant: no more than one record for this (employee, date)
  const verifyRes = authGet(
    `${API_V1}/hrd/attendance?employee_id=${setupData.employeeId}&date=${targetDate}`,
    auth,
    { tags: { name: 'concurrency:hrd:verify', endpoint: 'hrd:attendance:list', module: 'hrd', tier: 'list' } }
  );

  if (verifyRes.status >= 200 && verifyRes.status < 300) {
    const verifyBody = parseBody(verifyRes);
    if (verifyBody?.data) {
      const items = Array.isArray(verifyBody.data) ? verifyBody.data : verifyBody.data.items || [];
      const sameSlot = items.filter(r => {
        const recDate = (r.date || r.check_in_time || '').substring(0, 10);
        const empId = r.employee_id || r.employeeId;
        return recDate === targetDate && empId === setupData.employeeId;
      });

      if (sameSlot.length > 1) {
        attendanceDoubleClockIn.add(1);
        attendanceInvariantPass.add(0);
        console.error(`[INVARIANT VIOLATION] ${sameSlot.length} attendance records for employee ${setupData.employeeId} on ${targetDate}`);
      }
    }
  }

  sleep(0.2);
}
