# Stock Module — E2E Scenario Design

> Status: ⏳ Pending — Needs backend research

[← Back to E2E README](./README.md)

---

## Proposed Workflows (to be validated against backend code)

### Happy Paths
1. **Stock Opname Flow** — Create opname → assign warehouse → count items → submit → approve → adjust stock
2. **Stock Movement** — Transfer between warehouses → verify source deducted, target added
3. **Stock Adjustment** — Manual adjustment → verify journal created

### Error Cases
4. **Submit opname with uncounted items** — All items must be counted
5. **Transfer exceeds available stock** — Cannot transfer more than available
6. **Approve opname with variance** — Large variance requires manager approval

---

## Status: Waiting for backend research

Will be populated after HRD module is implemented and tested.
