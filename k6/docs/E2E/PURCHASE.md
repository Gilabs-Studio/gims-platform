# Purchase Module — E2E Scenario Design

> Status: ⏳ Pending — Needs backend research

[← Back to E2E README](./README.md)

---

## Proposed Workflows (to be validated against backend code)

### Happy Paths
1. **Purchase Cycle** — PR → approve → convert to PO → submit → approve → GR → confirm
2. **Purchase Requisition** — Create PR → submit → approve → convert to PO
3. **Purchase Return** — Create return → submit → confirm
4. **Supplier Invoice** — Create from GR → submit → approve (triggers AP journal)

### Error Cases
5. **Approve PO exceeding budget** — Budget control validation
6. **Create GR with quantity > PO quantity** — Over-receipt validation
7. **Approve PO without submitting** — Invalid state transition
8. **Supplier invoice approve → verify AP journal** — Finance integration

---

## Status: Waiting for backend research

Will be populated after Sales module is implemented and tested.
