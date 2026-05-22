# POS Module — E2E Scenario Design

> Status: ⏳ Pending — Needs backend research

[← Back to E2E README](./README.md)

---

## Proposed Workflows (to be validated against backend code)

### Happy Paths
1. **POS Session Flow** — Open session → create orders → close session (reconcile cash)
2. **POS Order Flow** — Create order → add items → apply discount → payment → receipt
3. **Split Payment** — Order with multiple payment methods (cash + card)

### Error Cases
4. **Close session with unbalanced cash** — Cash count ≠ expected
5. **Create order on closed session** — Session must be open
6. **Payment exceeds order total** — Change calculation

---

## Status: Waiting for backend research

Will be populated after CRM module is implemented and tested.
