# Phase 5 QA Test Guide: Stock & Inventory Stabilization

> Module: Stock & Inventory Management
> Phase: 5 - Stabilization & Reporting
> Audience: QA and UAT teams
> Last Updated: April 2026

---

## Objective

Validate that phase 5 monitoring/reporting is stable and that stock opname workflow remains correct after journal auto-post behavior changes.

---

## Test Data Prerequisites

Prepare:
- At least 1 company and 2 warehouses.
- Products with mixed stock levels (normal, low, out-of-stock).
- Stock movements (GR, GI, transfer) across multiple days.
- At least 1 stock opname with non-zero variance and 1 with zero variance.

---

## Critical Acceptance Rules

1. Journal status may be posted before stock opname status is posted.
2. Stock opname status moves to posted only after Post action succeeds.
3. Inventory quantity updates only at Post action.
4. Negative resulting stock must be blocked.
5. Monitoring/report endpoints return consistent values with posted operational data.

---

## Test Matrix

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| Q5-01 | Submit stock opname with non-zero variance | Journal is created and posted; stock opname moves to pending |
| Q5-02 | Approve stock opname | Status changes to approved; no inventory quantity change yet |
| Q5-03 | Post approved stock opname | Inventory adjustment applied; stock opname changes to posted |
| Q5-04 | Post with variance causing negative stock | Request is rejected with clear validation error |
| Q5-05 | Submit and post zero-variance opname | Workflow succeeds without invalid journal requirement errors |
| Q5-06 | Health dashboard reflects latest posted data | KPI values and counts match underlying records |
| Q5-07 | Variance report drilldown | Item-level variance values are consistent and traceable |
| Q5-08 | Movement audit log integrity | All movement types are queryable and ordered correctly |

---

## Detailed Test Cases

### Q5-01 Submit with Variance

Steps:
1. Create stock opname in draft.
2. Save items with at least one non-zero variance.
3. Submit for approval.

Checks:
- Response success true.
- Stock opname status becomes pending.
- Linked journal exists and status is posted.

### Q5-02 Approve After Submit

Steps:
1. Approve the pending stock opname.

Checks:
- Stock opname status becomes approved.
- On-hand inventory quantity is unchanged from pre-post state.

### Q5-03 Post Approved Opname

Steps:
1. Execute Post action on approved stock opname.

Checks:
- Stock movements are created from variance lines.
- Inventory quantities are updated correctly.
- Stock opname status becomes posted.

### Q5-04 Negative Quantity Guard

Steps:
1. Prepare stock so current quantity is lower than outgoing variance impact.
2. Execute Post action.

Checks:
- API rejects request.
- Error message indicates running quantity would be negative.
- No partial movement/journal corruption.

### Q5-05 Zero Variance Path

Steps:
1. Create stock opname where all variance values are zero.
2. Submit, approve, and post.

Checks:
- No forced manual adjustment workflow errors.
- Status transitions remain valid.
- Final status is posted.

---

## Reporting and Monitoring Checks

### Dashboard Consistency

1. Open inventory health dashboard for selected company and period.
2. Compare summary counts with direct list endpoints.
3. Verify low stock, out-of-stock, and variance counters.

### Variance and Reconciliation

1. Open variance report and filter by warehouse.
2. Verify variance thresholds and status filtering.
3. Confirm reconciliation queue includes unresolved items.

### Audit Log

1. Trigger multiple movements from different source transactions.
2. Query movement audit log by date range and type.
3. Validate user, timestamp, quantity, and reference integrity.

---

## Non-Functional Checks

- Pagination: verify max per_page behavior.
- Permissions: unauthorized roles cannot access restricted endpoints.
- Idempotency: repeated read/report calls produce stable results.
- Timezone: timestamps align with application timezone expectations.

---

## Exit Criteria

Phase 5 QA is accepted when:
- All critical scenarios Q5-01 to Q5-08 pass.
- No blocker defects in stock opname submit/approve/post path.
- Monitoring values are reproducible and auditable.
- No data integrity regressions in inventory movement and status transitions.

---

## Related Documents

- phase-5-stock-inventory-stabilization.md
- phase-5-stock-inventory-developer-reference.md
