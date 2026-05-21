# Finance Module — E2E Scenario Design

> Status: ⏳ Pending — Needs backend research

[← Back to E2E README](./README.md)

---

## Proposed Workflows (to be validated against backend code)

### Happy Paths
1. **Journal Entry Flow** — Create journal → post → verify balanced
2. **Bank Reconciliation** — Import statement → match transactions → reconcile
3. **Financial Closing** — Period close → verify all journals posted
4. **Asset Management** — Create asset → depreciation → disposal

### Error Cases
5. **Unbalanced journal** — Debit ≠ credit (expect rejection)
6. **Post to closed period** — Journal in closed fiscal period
7. **Use restricted COA** — Trade control accounts in manual journal
8. **Double-post journal** — Post already-posted journal

---

## Status: Waiting for backend research

Will be populated after POS module is implemented and tested.
