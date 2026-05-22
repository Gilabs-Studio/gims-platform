# HRD Module — E2E Scenario Design

> Status: ⏳ Pending — Needs backend research

[← Back to E2E README](./README.md)

---

## Proposed Workflows (to be validated against backend code)

### Happy Paths
1. **Attendance Flow** — Clock-in → clock-out → verify working hours calculated
2. **Leave Request Flow** — Create leave → approve → verify balance deducted
3. **Recruitment Flow** — Create request → post → receive applicant → interview → hire
4. **Employee Evaluation** — Create evaluation → assign criteria → score → submit
5. **Overtime Flow** — Create request → approve → verify hours logged

### Error Cases
6. **Double clock-in** — Clock in when already clocked in (expect rejection)
7. **Leave exceeds balance** — Request more days than available
8. **Approve own leave** — Self-approval not allowed
9. **Clock-in outside GPS radius** — Location validation

---

## Status: Waiting for backend research

Will be populated after Finance module is implemented and tested.
