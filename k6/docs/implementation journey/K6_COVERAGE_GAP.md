# K6 Endpoint Coverage Gap Analysis

> Generated: 2026-05-18 | Updated: 2026-05-19

## Summary

The GIMS ERP backend has **29 modules** in `apps/api/internal/`. The k6 profiler now covers **~140 endpoints** across **24 modules** via 12 scenario files.

## Complete Module Inventory

### 1. Finance (27 routers) — ✅ Covered (26/27)

- [x] chart_of_account_routers.go
- [x] journal_entry_routers.go
- [x] budget_routers.go
- [x] asset_routers.go
- [x] asset_category_routers.go
- [x] asset_location_routers.go
- [x] bank_reconciliation_routers.go
- [x] bank_transfer_routers.go
- [x] cash_bank_journal_routers.go
- [x] cash_bank_transaction_routers.go
- [x] finance_report_routers.go
- [x] finance_settings_routers.go
- [x] financial_closing_routers.go
- [x] fiscal_year_routers.go
- [x] inventory_settings_routers.go
- [x] journal_line_routers.go
- [x] non_trade_payable_routers.go
- [x] opening_balance_routers.go
- [x] payment_routers.go
- [x] system_account_mapping_routers.go
- [x] tax_configuration_routers.go
- [x] tax_invoice_routers.go
- [x] transfer_routers.go (via arap-reconciliation)
- [x] up_country_cost_routers.go
- [x] aging_report_routers.go (via arap-reconciliation)
- [x] arap_reconciliation_routers.go
- [ ] legacy_route_bridges.go — ⏭️ Skipped (internal compatibility layer)

---

### 2. CRM (15 routers) — ✅ Covered (15/15)

- [x] activity_router.go
- [x] activity_type_router.go
- [x] area_capture_router.go
- [x] area_mapping_router.go
- [x] contact_role_router.go
- [x] contact_router.go
- [x] deal_router.go
- [x] lead_automation_router.go
- [x] lead_router.go
- [x] lead_source_router.go
- [x] lead_status_router.go
- [x] pipeline_stage_router.go
- [x] schedule_router.go
- [x] task_router.go
- [x] visit_report_router.go

---

### 3. HRD (11 routers) — ✅ Covered (11/11)

- [x] attendance_record_router.go
- [x] employee_evaluation_router.go
- [x] evaluation_criteria_router.go
- [x] evaluation_group_router.go
- [x] holiday_router.go
- [x] leave_request_router.go
- [x] overtime_request_router.go
- [x] recruitment_applicant_router.go
- [x] recruitment_request_router.go
- [x] salary_structure_router.go
- [x] work_schedule_router.go

---

### 4. Sales (10 routers) — ✅ Covered (10/10)

- [x] sales_quotation_router.go
- [x] sales_order_router.go
- [x] delivery_order_router.go
- [x] customer_invoice_router.go
- [x] customer_invoice_down_payment_router.go
- [x] sales_payment_routers.go
- [x] sales_return_router.go
- [x] sales_target_router.go
- [x] sales_visit_router.go
- [x] receivables_recap_routers.go

---

### 5. Purchase (8 routers) — ✅ Covered (8/8)

- [x] purchase_order_routers.go
- [x] goods_receipt_routers.go
- [x] purchase_requisition_routers.go
- [x] purchase_return_router.go
- [x] purchase_payment_routers.go
- [x] supplier_invoice_routers.go
- [x] supplier_invoice_down_payment_routers.go
- [x] payable_recap_routers.go

---

### 6. Product (8 routers) — ✅ Covered (8/8)

- [x] product_router.go (via master-data.js)
- [x] product_category_router.go
- [x] product_brand_router.go
- [x] product_segment_router.go
- [x] product_type_router.go
- [x] unit_of_measure_router.go
- [x] packaging_router.go
- [x] procurement_type_router.go

---

### 7. Organization (8 routers) — ✅ Covered (8/8)

- [x] company_routers.go
- [x] business_unit_routers.go
- [x] division_routers.go
- [x] outlet_routers.go
- [x] area_routers.go
- [x] employee_routers.go
- [x] job_position_routers.go
- [x] business_type_routers.go

---

### 8. POS (7 routers) — ⚠️ Partial (4/7)

- [x] floor_plan_router.go
- [x] pos_config_router.go
- [x] pos_order_router.go
- [x] pos_session_router.go
- [ ] midtrans_config_router.go — ⏭️ Skipped (no midtrans testing)
- [ ] pos_payment_router.go — ⏭️ Skipped (needs order ID)
- [ ] public_pos_router.go — ⏭️ Skipped (different auth mechanism)

---

### 9. Core (7 routers) — ✅ Covered (6/7)

- [x] payment_terms_router.go
- [x] bank_account_router.go
- [x] leave_type_router.go
- [x] courier_agency_router.go
- [x] so_source_router.go
- [x] currency_router.go (via master-data.js)
- [ ] export_job_router.go — ⏭️ Skipped (no list endpoint, only GET by ID + download)

---

### 10. Geographic (6 routers) — ✅ Covered (6/6)

- [x] country_routers.go
- [x] province_routers.go
- [x] city_routers.go
- [x] district_routers.go
- [x] village_routers.go
- [x] map_data_router.go

---

### 11. Report (5 routers) — ✅ Covered (5/5)

- [x] sales_overview_router.go
- [x] product_analysis_router.go
- [x] geo_performance_router.go
- [x] customer_research_router.go
- [x] supplier_research_router.go

---

### 12. Supplier (3 routers) — ✅ Covered (3/3)

- [x] supplier_routers.go (via master-data.js)
- [x] supplier_type_routers.go
- [x] bank_routers.go

---

### 13. AI (3 routers) — ✅ Covered (2/3)

- [x] session_router.go
- [x] admin_router.go
- [ ] chat_router.go — ⏭️ Skipped (interactive/streaming, not suitable for profiling)

---

### 14. General (2 routers) — ✅ Covered (2/2)

- [x] dashboard_router.go
- [x] onboarding_router.go

---

### 15. Customer (2 routers) — ✅ Covered (2/2)

- [x] customer_routers.go (via master-data.js)
- [x] customer_type_routers.go (via master-data.js)

---

### 16. Inventory — ✅ Covered

- [x] stock, movements, stock-metrics (via inventory.js)

---

### 17. Warehouse (1 router) — ✅ Covered

- [x] warehouse_routers.go (via master-data.js)

---

### 18. User (1 router) — ✅ Covered

- [x] user_routers.go (via master-data.js + /users/me in setup)

---

### 19. Travel Planner (1 router) — ✅ Covered

- [x] travel_plan_routers.go

---

### 20. Tenant (1 router) — ⏭️ Skipped

- [ ] system_admin_router.go — Internal admin route, different auth scope

---

### 21. Stock Opname (1 router) — ✅ Covered

- [x] stock_opname_router.go

---

### 22. Role (1 router) — ✅ Covered

- [x] role_routers.go (via master-data.js)

---

### 23. Permission (1 router) — ⏭️ Skipped

- [ ] permission_routers.go — Internal admin, rarely changes

---

### 24. Password Reset (1 router) — ⏭️ Skipped

- [ ] password_reset_routers.go — Not suitable for load testing

---

### 25. Notification (1 router) — ✅ Covered

- [x] notification_router.go

---

### 26. Loyalty (1 router) — ✅ Covered

- [x] loyalty_router.go (programs + members)

---

### 27. Feedback (1 router) — ✅ Covered

- [x] feedback_router.go

---

### 28. Auth (1 router) — ✅ Covered

- [x] auth_routers.go (login, CSRF via auth-helper.js)

---

### 29. Refresh Token (no router) — ⏭️ N/A

- Handled internally by auth module

---

## Router Count Summary

| Module | Routers | K6 Status |
|--------|---------|-----------|
| Finance | 27 | ✅ Covered (26/27) |
| CRM | 15 | ✅ Covered (15/15) |
| HRD | 11 | ✅ Covered (11/11) |
| Sales | 10 | ✅ Covered (10/10) |
| Purchase | 8 | ✅ Covered (8/8) |
| Product | 8 | ✅ Covered (8/8) |
| Organization | 8 | ✅ Covered (8/8) |
| POS | 7 | ⚠️ Partial (4/7, 3 skipped) |
| Core | 7 | ✅ Covered (6/7, 1 skipped) |
| Geographic | 6 | ✅ Covered (6/6) |
| Report | 5 | ✅ Covered (5/5) |
| Supplier | 3 | ✅ Covered (3/3) |
| AI | 3 | ✅ Covered (2/3, 1 skipped) |
| General | 2 | ✅ Covered (2/2) |
| Customer | 2 | ✅ Covered (2/2) |
| Warehouse | 1 | ✅ Covered |
| User | 1 | ✅ Covered |
| Travel Planner | 1 | ✅ Covered |
| Tenant | 1 | ⏭️ Skipped (internal admin) |
| Stock Opname | 1 | ✅ Covered |
| Role | 1 | ✅ Covered |
| Permission | 1 | ⏭️ Skipped (internal admin) |
| Password Reset | 1 | ⏭️ Skipped (not load-testable) |
| Notification | 1 | ✅ Covered |
| Loyalty | 1 | ✅ Covered |
| Feedback | 1 | ✅ Covered |
| Auth | 1 | ✅ Covered |
| Inventory | — | ✅ Covered |
| Refresh Token | — | ⏭️ N/A |

**Total: 133 router files across 29 modules. K6 covers ~140 endpoints (some routers have multiple sub-endpoints).**

**Intentionally skipped (7 routers):**
- legacy_route_bridges.go (internal compatibility)
- midtrans_config_router.go (no midtrans testing)
- pos_payment_router.go (needs order ID)
- public_pos_router.go (different auth)
- export_job_router.go (no list endpoint)
- chat_router.go (streaming/interactive)
- system_admin_router.go, permission_routers.go, password_reset_routers.go (internal admin / not load-testable)

---

## Critical Gaps Causing Workflow Failures — ✅ RESOLVED

1. ~~**`paymentTermsId`** — never fetched in setup()~~ → ✅ Fixed: fetched from `GET /api/v1/master-data/payment-terms`
2. ~~**`bankAccountId`** — never fetched in setup()~~ → ✅ Fixed: fetched from `GET /api/v1/finance/bank-accounts`
3. ~~**`companyId` / `businessUnitId`** — fetched from `/users/me` but may be null~~ → ✅ Fixed: fallback from Organization endpoints

---

## File References

- Backend routers: `apps/api/internal/<module>/presentation/router/`
- K6 API scenarios: `k6/scenarios/apis/`
- K6 E2E scenarios: `k6/scenarios/e2e/`
- Endpoint registry: `k6/lib/endpoint-registry.js`
- Profiler test: `k6/tests/endpoint-profiler.js`
