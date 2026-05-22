# Master Data Module — E2E Scenario Design

> Status: ⏳ Pending — Needs backend research

[← Back to E2E README](./README.md)

---

## Proposed Workflows (to be validated against backend code)

### Happy Paths
1. **Product Creation Flow** — Create product → set category/brand/type → set UoM → set pricing → assign to warehouse
2. **Customer Onboarding** — Create customer → set type → assign sales rep → set credit limit
3. **Supplier Onboarding** — Create supplier → set type → add bank details → verify

### Error Cases
4. **Duplicate product SKU** — Same SKU already exists (expect rejection)
5. **Delete product with active stock** — Cannot delete product that has inventory
6. **Create customer with invalid NPWP** — Tax ID validation
7. **Assign non-existent warehouse** — Foreign key validation

---

## Status: Waiting for backend research

Will be populated after Stock module is implemented and tested.
