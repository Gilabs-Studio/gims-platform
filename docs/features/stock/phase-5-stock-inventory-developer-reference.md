# Phase 5 Developer Reference: Stock & Inventory Stabilization

> Module: Stock & Inventory Management
> Phase: 5 - Stabilization & Reporting
> Audience: Backend and Frontend Engineers
> Last Updated: April 2026

---

## Purpose

This document provides implementation-level guidance for phase 5 stock-inventory stabilization features. It complements the functional document in phase-5-stock-inventory-stabilization.md.

---

## Scope Boundaries

Phase 5 is monitoring and stabilization only.

Included:
- Health dashboards and monitoring endpoints.
- Variance and reconciliation detection.
- Reporting consistency checks.
- Auditability and operational visibility.

Not included:
- New stock transaction types.
- Alternate posting workflows.
- Bypassing stock opname approval/post stages.

---

## Current Workflow Clarification

Current stock opname workflow remains:

1. Draft
2. Pending approval
3. Approved
4. Posted

Important behavior:
- Journal for stock opname adjustment can be auto-generated and auto-posted during submit/generate stage.
- Stock opname still requires explicit Post action to execute inventory quantity adjustments.
- Journal posted state does not imply stock opname posted state.

---

## Backend Integration Notes

### Key Usecases

- stock_opname usecase:
  - GenerateJournal
  - SubmitApproval
  - Approve
  - Post

- inventory usecase:
  - AdjustStockFromOpname

- finance journal usecase:
  - PostOrUpdateJournal

### Design Constraints

- Inventory movement execution must happen in stock opname Post stage.
- Negative resulting quantity must be rejected.
- Journal posting and inventory movement posting are related but separate concerns.
- Idempotent behavior should be preserved for repeated trigger calls.

### Error Semantics

Map expected operational errors clearly:
- Running quantity would be negative -> business validation error.
- Journal workflow unavailable -> dependency/configuration error.
- Invalid status transition -> state machine protection.

---

## Frontend Integration Notes

- Keep explicit Post action/button when status is Approved.
- Do not infer stock posted state from journal status.
- Surface backend validation errors directly for reconciliation investigation.
- Keep loading and disabled states strict during submit/approve/post mutations.

---

## Observability and Logging

Recommended minimum logs:
- Stock opname ID, warehouse ID, and actor ID for submit/approve/post.
- Number of adjusted items and count of zero-variance skips.
- Journal ID generated/linked for each stock opname.
- Negative quantity validation failures with product ID and requested variance.

---

## Technical Checklist

- Use apptime for timestamps.
- Keep API response format compliant with global standard.
- Enforce per_page max 100 on monitoring/reporting endpoints.
- Ensure permission checks in handlers are explicit.
- Avoid business logic in handlers and frontend components.

---

## Regression Risk Hotspots

- SubmitApproval still trying manual adjustment approval path.
- Post stage skipping inventory adjustment when journal already exists.
- Zero-variance stock opname incorrectly blocked.
- Race conditions between approval and post causing stale quantities.

---

## Suggested Automated Tests

1. Submit stock opname with variance creates posted journal.
2. Approve stock opname does not force re-post journal.
3. Post stock opname applies inventory adjustment and changes opname status to posted.
4. Post stock opname rejects when running quantity would be negative.
5. Zero-variance opname can complete lifecycle without journal requirement failures.

---

## Related Documents

- phase-5-stock-inventory-stabilization.md
- phase-5-stock-inventory-qa-test-guide.md
- ../cash-bank/phase-5-stabilization-reporting.md
