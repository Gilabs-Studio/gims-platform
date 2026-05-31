# Backend Findings from k6 Performance Suite

**Date:** 2026-05-31
**Environment:** local (`http://localhost:8081`), `env=development`
**Source:** GIMS k6 performance suite (smoke, load, security-negative, domain-concurrency)
**Backend commit/state:** live local backend, seeded dataset

These are backend issues surfaced while validating the k6 suite against a live backend. They are **not** k6 suite bugs — the suite is working as intended by detecting them. Each finding includes the exact reproduction, the observed vs expected behavior, root cause in code, and suggested fix.

---

## Summary

| # | Issue | Severity | Area | Problem | HTTP Now | HTTP Expected |
|---|-------|----------|------|---------|----------|---------------|
| 1 | [#445](https://github.com/Gilabs-Studio/gims-platform/issues/445) | Medium | Error mapping | `GET /customer/customers/{id}` not-found returns 500 | 500 | 404 |
| 2 | [#446](https://github.com/Gilabs-Studio/gims-platform/issues/446) | Medium | Error mapping | `GET /supplier/suppliers/{id}` not-found returns 500 | 500 | 404 |
| 3 | [#447](https://github.com/Gilabs-Studio/gims-platform/issues/447) | Medium | Auth | `POST /auth/refresh-token` with no token returns 500 | 500 | 401 |
| 4 | [#448](https://github.com/Gilabs-Studio/gims-platform/issues/448) | Medium | HRD error mapping | Duplicate manual attendance returns 500 | 500 | 409 |
| 5 | [#449](https://github.com/Gilabs-Studio/gims-platform/issues/449) | Low | HRD error mapping | Clock-in on non-working day returns 500 (live GPS path) | 500 | 422 |
| 6 | [#450](https://github.com/Gilabs-Studio/gims-platform/issues/450) | High | Concurrency | Mixed concurrent write load intermittently fails PO creation | varies | stable |

Findings 1–5 share a common root cause class: **unregistered error codes / raw errors falling through to `InternalServerErrorResponse`**, which the central `ErrorResponse` maps to HTTP 500. Finding 6 is a genuine transaction-contention issue.

---

## Finding 1 — Customer not-found returns 500 instead of 404

**Reproduce:**
```bash
# With a valid Bearer token:
curl -H "Authorization: Bearer <token>" \
  http://localhost:8081/api/v1/customer/customers/00000000-0000-0000-0000-000000000001
```

**Observed:**
```json
{"success":false,"error":{"code":"INTERNAL_SERVER_ERROR",
 "message":"An internal server error occurred. Our team has been notified",
 "details":{"customer_id":"00000000-0000-0000-0000-000000000001"}}}
HTTP 500
```

**Expected:** `HTTP 404` with code `CUSTOMER_NOT_FOUND`.

**Root cause:**
The handler does map to the right code (`apps/api/internal/customer/presentation/handler/customer_handler.go`):
```go
result, err := h.uc.GetByID(c.Request.Context(), id)
if err != nil {
    errors.ErrorResponse(c, "CUSTOMER_NOT_FOUND", map[string]interface{}{"customer_id": id}, nil)
    return
}
```
But `CUSTOMER_NOT_FOUND` is **not registered** in `ErrorCodeMap` (`apps/api/internal/core/errors/errors.go`). The central handler falls back to 500:
```go
errorInfo, exists := ErrorCodeMap[code]
if !exists {
    errorInfo = ErrorCodeMap["INTERNAL_SERVER_ERROR"]
    code = "INTERNAL_SERVER_ERROR"
}
```

**Suggested fix:** Register `CUSTOMER_NOT_FOUND` (and audit all `*_NOT_FOUND` codes referenced by handlers) in `ErrorCodeMap` with `HTTPStatus: http.StatusNotFound`.

---

## Finding 2 — Supplier not-found returns 500 instead of 404

**Reproduce:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8081/api/v1/supplier/suppliers/00000000-0000-0000-0000-000000000001
```

**Observed:** `HTTP 500` (`INTERNAL_SERVER_ERROR`).
**Expected:** `HTTP 404` with code `SUPPLIER_NOT_FOUND`.

**Root cause:** Same class as Finding 1. The handler (`apps/api/internal/supplier/presentation/handler/supplier_handler.go`) emits `SUPPLIER_NOT_FOUND`, which is not registered in `ErrorCodeMap`.

**Suggested fix:** Register `SUPPLIER_NOT_FOUND` as a 404.

---

## Finding 3 — Refresh-token with no token returns 500 instead of 401

**Reproduce:**
```bash
curl -X POST -H "Content-Type: application/json" -d "{}" \
  http://localhost:8081/api/v1/auth/refresh-token
```

**Observed:**
```json
{"success":false,"error":{"code":"INTERNAL_SERVER_ERROR",
 "message":"An internal server error occurred. Our team has been notified"}}
HTTP 500
```

**Expected:** `HTTP 401` with code `REFRESH_TOKEN_REQUIRED` (or `400`).

**Root cause:**
The handler (`apps/api/internal/auth/presentation/handler/auth_handler.go`) does:
```go
if refreshToken == "" {
    errors.ErrorResponse(c, "REFRESH_TOKEN_REQUIRED", nil, nil)
    return
}
```
`REFRESH_TOKEN_REQUIRED` is **not registered** in `ErrorCodeMap` (note: `REFRESH_TOKEN_INVALID` IS registered as 401, but the "required" variant is not), so it falls back to 500.

**Security relevance:** Negative-path auth requests should never produce 5xx. A 500 here leaks "unhandled path" signal and pollutes error dashboards.

**Suggested fix:** Register `REFRESH_TOKEN_REQUIRED` with `HTTPStatus: http.StatusUnauthorized`.

---

## Finding 4 — Duplicate manual attendance returns 500 instead of 409

**Reproduce:**
```bash
# Create a manual attendance entry for an employee+date, then repeat the same call:
curl -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -X POST \
  -d '{"employee_id":"<emp>","date":"2026-04-01",
       "check_in_time":"2026-04-01T08:00:00+07:00",
       "check_out_time":"2026-04-01T17:00:00+07:00",
       "check_in_type":"NORMAL","status":"PRESENT"}' \
  http://localhost:8081/api/v1/hrd/attendance/manual
```

**Observed (2nd call):**
```json
{"success":false,"error":{"code":"INTERNAL_SERVER_ERROR",
 "details":{"error_id":"attendance record already exists for this date"}}}
HTTP 500
```

**Expected:** `HTTP 409 CONFLICT` (or `422`) — the duplicate is correctly detected, only the status code is wrong.

**Important:** The business invariant **holds** — no duplicate record is created (verified by re-listing). This is purely an error-code/HTTP-status defect.

**Root cause:**
- Usecase (`apps/api/internal/hrd/domain/usecase/attendance_record_usecase.go`):
  ```go
  existing, err := u.attendanceRepo.FindByEmployeeAndDate(ctx, req.EmployeeID, date)
  if err == nil && existing != nil {
      return nil, errors.New("attendance record already exists for this date")
  }
  ```
- Handler (`apps/api/internal/hrd/presentation/handler/attendance_record_handler.go`, `CreateManualEntry`) maps **all** errors to 500:
  ```go
  record, err := h.attendanceUC.CreateManualEntry(...)
  if err != nil {
      errors.InternalServerErrorResponse(c, err.Error())
      return
  }
  ```

**Suggested fix:** Introduce a sentinel error (e.g. `ErrAttendanceAlreadyExists`) in the usecase and map it to `409 CONFLICT` (register `ATTENDANCE_ALREADY_EXISTS` or reuse `CONFLICT`).

---

## Finding 5 — Live clock-in on a non-working day returns 500

**Reproduce:** Call the GPS clock-in endpoint on a non-working day (e.g., Sunday):
```bash
curl -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -X POST \
  -d '{"latitude":-6.2088,"longitude":106.8456,"check_in_type":"NORMAL"}' \
  http://localhost:8081/api/v1/hrd/attendance/clock-in
```

**Observed:**
```json
{"success":false,"error":{"code":"INTERNAL_SERVER_ERROR",
 "details":{"message":"Today is not a working day"}}}
HTTP 500
```

**Expected:** `HTTP 422` with code `NOT_WORKING_DAY` (the handler already has a `case usecase.ErrNotWorkingDay` branch that maps to `NOT_WORKING_DAY`).

**Root cause:** The "not a working day" condition reaches the handler as a **raw error string** rather than the typed `usecase.ErrNotWorkingDay` sentinel, so it falls into the `default → InternalServerErrorResponse` branch. (The typed-sentinel branch exists but isn't being hit in this code path.)

**Suggested fix:** Ensure the working-day check returns the typed `ErrNotWorkingDay` sentinel so the existing handler mapping applies. Also confirm `NOT_WORKING_DAY` is registered in `ErrorCodeMap` with a 4xx status.

---

## Finding 6 — Purchase order creation intermittently fails under mixed concurrent write load

**Severity:** High (data-path reliability)

**Observed:**
- In isolation, PO creation always succeeds (`HTTP 201`).
- 8 concurrent PO-only creates: all succeed.
- Under the **load profile** (mixed concurrent writes: SQ→SO→Invoice→Payment + PO + Journal + Attendance across multiple VUs), PO creation intermittently fails (e.g., 6/7 pass, 5/6 pass) while `http_req_failed` for the underlying HTTP stays 0% — i.e. the failure manifests as a non-2xx business response, not a transport error.

**Hypothesis:** Transaction contention / lock ordering across the shared sequence/code generator (`PO-YYYYMMDD-NNNN`) or fiscal-year/company rows when multiple write-heavy workflows commit concurrently. Needs DB-level investigation (deadlock logs, `FOR UPDATE` ordering).

**Repro via k6:**
```bash
pnpm k6:load            # watch "PO created" check ratio under 2+ VUs
pnpm k6:concurrency     # purchaseWorkflowConcurrency scenario
```

**Suggested next step:** Capture Postgres logs (`log_lock_waits=on`, deadlock logs) during a load run, and review row-locking order in the PO create transaction and the code/sequence generator.

---

## Cross-cutting recommendation

Findings 1–5 are all instances of the same anti-pattern:

> Handlers emit a specific error code or raw error string, but the code is **not registered** in `ErrorCodeMap` (or the error isn't a typed sentinel), so `ErrorResponse` / `InternalServerErrorResponse` defaults it to **HTTP 500**.

**Systemic fixes:**
1. Audit every `errors.ErrorResponse(c, "<CODE>", ...)` call site and ensure `<CODE>` exists in `ErrorCodeMap`. Consider a startup assertion or unit test that scans for unregistered codes.
2. Replace `errors.InternalServerErrorResponse(c, err.Error())` catch-alls with typed-sentinel mapping (not-found → 404, duplicate/conflict → 409, validation → 422).
3. Add a negative-path test tier (the k6 `security-negative` profile already exercises some of these) to CI so 5xx-on-negative-path regressions are caught.

---

## How these were found

| Profile | Findings surfaced |
|---------|-------------------|
| `pnpm k6:smoke` | (none — clean) |
| `pnpm k6:load` | #4 origin (attendance), #6 (PO contention) |
| `pnpm k6:security` | #3 (refresh-token 500), tenant-isolation 500s (#1) |
| `pnpm k6:concurrency` | #1, #4, #5 (via invariant + improper-error-handling metrics) |

Custom k6 metrics added to make these visible in reports:
- `gims_improper_error_handling` — counts negative-path 5xx that should be 4xx
- `gims_*_invariant_pass` / `gims_*_double_*` — confirm business invariants hold despite wrong status codes
