# CRM Module — E2E Scenario Design

> Status: ⏳ Pending — Needs backend research

[← Back to E2E README](./README.md)

---

## Proposed Workflows (to be validated against backend code)

### Happy Paths
1. **Lead to Deal** — Create lead → qualify → convert to deal → close won
2. **Activity Flow** — Create activity → complete → log visit report
3. **Schedule Flow** — Create schedule → assign → complete

### Error Cases
4. **Convert unqualified lead** — Validate lead must be qualified before conversion
5. **Close deal without activities** — Validate deal requirements
6. **Duplicate lead detection** — Same contact/company

---

## Status: Waiting for backend research

Will be populated after Purchase module is implemented and tested.
