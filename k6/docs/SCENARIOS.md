# Scenarios

> API scenario files and endpoint coverage

[← Methodology](./METHODOLOGY.md) | [Workflows →](./WORKFLOWS.md)

---

## Overview

Scenario files live in `k6/scenarios/apis/` and contain reusable functions that make tagged HTTP requests. Each file covers one backend module.

**Pattern:**
```javascript
export function listSomething(auth, params = {}) {
    const p = { ...getTaggedParams("module:entity:list"), ...params };
    return authGet(`${API_V1}/module/entity`, auth, p);
}
```

Every function:
- Accepts `auth` (token object) and optional `params`
- Applies tags from the endpoint registry
- Returns the raw k6 HTTP response
- Is a pure GET/list operation (no side effects)

---

## Scenario Files

### `core.js` — Core Master Data

| Function | Endpoint | Tier |
|----------|----------|------|
| `listPaymentTerms` | `GET /master-data/payment-terms` | list |
| `listBankAccounts` | `GET /finance/bank-accounts` | list |
| `listLeaveTypes` | `GET /master-data/leave-types` | list |
| `listCourierAgencies` | `GET /master-data/courier-agencies` | list |
| `listSOSources` | `GET /master-data/so-sources` | list |

---

### `organization.js` — Organization Structure

| Function | Endpoint | Tier |
|----------|----------|------|
| `listCompanies` | `GET /organization/companies` | list |
| `listBusinessUnits` | `GET /organization/business-units` | list |
| `listDivisions` | `GET /organization/divisions` | list |
| `listOutlets` | `GET /organization/outlets` | list |
| `listAreas` | `GET /organization/areas` | list |
| `listOrgEmployees` | `GET /organization/employees` | list |
| `listJobPositions` | `GET /organization/job-positions` | list |
| `listBusinessTypes` | `GET /organization/business-types` | list |

---

### `sales.js` — Sales Module

| Function | Endpoint | Tier |
|----------|----------|------|
| `listQuotations` | `GET /sales/sales-quotations` | list |
| `createQuotation` | `POST /sales/sales-quotations` | crud |
| `listOrders` | `GET /sales/sales-orders` | list |
| `listDeliveryOrders` | `GET /sales/delivery-orders` | list |
| `listInvoices` | `GET /sales/customer-invoices` | list |
| `listPayments` | `GET /sales/payments` | list |
| `listSalesReturns` | `GET /sales/returns` | list |
| `listSalesTargets` | `GET /sales/sales-targets` | list |
| `listSalesVisits` | `GET /sales/sales-visits` | list |
| `listInvoiceDownPayments` | `GET /sales/customer-invoice-down-payments` | list |
| `listReceivablesRecap` | `GET /sales/receivables-recap` | list |

---

### `purchase.js` — Purchase Module

| Function | Endpoint | Tier |
|----------|----------|------|
| `listPurchaseOrders` | `GET /purchase/purchase-orders` | list |
| `listGoodsReceipts` | `GET /purchase/goods-receipt` | list |
| `listPurchaseRequisitions` | `GET /purchase/purchase-requisitions` | list |
| `listPurchaseReturns` | `GET /purchase/returns` | list |
| `listPurchasePayments` | `GET /purchase/payments` | list |
| `listSupplierInvoices` | `GET /purchase/supplier-invoices` | list |
| `listSupplierInvoiceDownPayments` | `GET /purchase/supplier-invoice-down-payments` | list |
| `listPayableRecap` | `GET /purchase/payable-recap` | list |

---

### `finance.js` — Finance Module

| Function | Endpoint | Tier |
|----------|----------|------|
| `listChartOfAccounts` | `GET /finance/chart-of-accounts` | list |
| `listJournalEntries` | `GET /finance/journal-entries` | list |
| `createJournalEntry` | `POST /finance/journal-entries` | crud |
| `listBudgets` | `GET /finance/budget` | list |
| `listAssets` | `GET /finance/assets` | list |
| `listAssetCategories` | `GET /finance/asset-categories` | list |
| `listAssetLocations` | `GET /finance/asset-locations` | list |
| `listBankReconciliations` | `GET /finance/bank-reconciliations` | list |
| `listBankTransfers` | `GET /finance/bank-transfers` | list |
| `listCashBankJournals` | `GET /finance/cash-bank` | list |
| `listCashBankTransactions` | `GET /finance/cash-bank-transactions` | list |
| `listFinanceReports` | `GET /finance/reports` | list |
| `getFinanceSettings` | `GET /finance/settings` | crud |
| `listFinancialClosings` | `GET /finance/closing` | list |
| `listFiscalYears` | `GET /finance/fiscal-years` | list |
| `getInventorySettings` | `GET /finance/inventory-settings` | crud |
| `listJournalLines` | `GET /finance/journal-lines` | list |
| `listNonTradePayables` | `GET /finance/non-trade-payables` | list |
| `listOpeningBalances` | `GET /finance/opening-balance` | list |
| `listFinancePayments` | `GET /finance/payments` | list |
| `listSystemAccountMappings` | `GET /finance/settings/account-mappings` | list |
| `listTaxConfigurations` | `GET /finance/taxes` | list |
| `listTaxInvoices` | `GET /finance/tax-invoices` | list |
| `listUpCountryCosts` | `GET /finance/up-country-cost` | list |
| `listARAPReconciliations` | `GET /finance/reconciliation/arap` | list |
| `listDepreciation` | `GET /finance/depreciation` | list |

---

### `hrd.js` — Human Resources

| Function | Endpoint | Tier |
|----------|----------|------|
| `listAttendance` | `GET /hrd/attendance` | list |
| `listLeaveRequests` | `GET /hrd/leave-requests` | list |
| `listEmployees` | `GET /organization/employees` | list |
| `listWorkSchedules` | `GET /hrd/work-schedules` | list |
| `listHolidays` | `GET /hrd/holidays` | list |
| `listOvertimeRequests` | `GET /hrd/overtime` | list |
| `listEmployeeEvaluations` | `GET /hrd/employee-evaluations` | list |
| `listEvaluationCriteria` | `GET /hrd/evaluation-criteria` | list |
| `listEvaluationGroups` | `GET /hrd/evaluation-groups` | list |
| `listRecruitmentRequests` | `GET /hrd/recruitment-requests` | list |
| `listRecruitmentApplicants` | `GET /hrd/applicants` | list |
| `listSalaryStructures` | `GET /hrd/salary` | list |

---

### `product.js` — Product Master Data

| Function | Endpoint | Tier |
|----------|----------|------|
| `listProductCategories` | `GET /product/product-categories` | list |
| `listProductBrands` | `GET /product/product-brands` | list |
| `listProductSegments` | `GET /product/product-segments` | list |
| `listProductTypes` | `GET /product/product-types` | list |
| `listUnitsOfMeasure` | `GET /product/units-of-measure` | list |
| `listPackaging` | `GET /product/packagings` | list |
| `listProcurementTypes` | `GET /product/procurement-types` | list |

---

### `crm.js` — Customer Relationship Management

| Function | Endpoint | Tier |
|----------|----------|------|
| `listLeads` | `GET /crm/leads` | list |
| `listDeals` | `GET /crm/deals` | list |
| `listContacts` | `GET /crm/contacts` | list |
| `listActivities` | `GET /crm/activities` | list |
| `listActivityTypes` | `GET /crm/activity-types` | list |
| `listTasks` | `GET /crm/tasks` | list |
| `listSchedules` | `GET /crm/schedules` | list |
| `listVisitReports` | `GET /crm/visits` | list |
| `listPipelineStages` | `GET /crm/pipeline-stages` | list |
| `listAreaMappings` | `GET /crm/area-mapping` | list |
| `listLeadSources` | `GET /crm/lead-sources` | list |
| `listLeadStatuses` | `GET /crm/lead-statuses` | list |
| `listContactRoles` | `GET /crm/contact-roles` | list |
| `listLeadAutomations` | `GET /crm/leads/automation` | list |
| `listAreaCaptures` | `GET /crm/area-mapping/map` | list |

---

### `pos.js` — Point of Sale

| Function | Endpoint | Tier |
|----------|----------|------|
| `listPOSOrders` | `GET /pos/orders` | list |
| `listPOSSessions` | `GET /pos/sessions` | list |
| `listFloorPlans` | `GET /pos/floor-plans` | list |
| `getPOSConfig` | `GET /pos/config/outlet/:outletId` | crud |

---

### `geographic.js` — Geographic Data

| Function | Endpoint | Tier |
|----------|----------|------|
| `listCountries` | `GET /geographic/countries` | list |
| `listProvinces` | `GET /geographic/provinces` | list |
| `listCities` | `GET /geographic/cities` | list |
| `listDistricts` | `GET /geographic/districts` | list |
| `listVillages` | `GET /geographic/villages` | list |
| `getMapData` | `GET /geographic/map-data` | crud |

---

### `report.js` — Reports

| Function | Endpoint | Tier |
|----------|----------|------|
| `getSalesOverview` | `GET /reports/sales-overview` | list |
| `getProductAnalysis` | `GET /reports/product-analysis` | list |
| `getGeoPerformance` | `GET /reports/geo-performance` | list |
| `getCustomerResearch` | `GET /reports/customer-research` | list |
| `getSupplierResearch` | `GET /reports/supplier-research` | list |

---

### `inventory.js` — Inventory & Stock

| Function | Endpoint | Tier |
|----------|----------|------|
| `listStock` | `GET /stock/inventory` | list |
| `getStockMetrics` | `GET /stock/inventory/metrics` | crud |
| `listMovements` | `GET /stock/movements` | list |

---

### `stock-opname.js` — Physical Inventory

| Function | Endpoint | Tier |
|----------|----------|------|
| `listStockOpnames` | `GET /stock-opnames` | list |

---

### `supporting.js` — Supporting Modules

| Function | Endpoint | Tier |
|----------|----------|------|
| `listNotifications` | `GET /notifications` | list |
| `listLoyaltyPrograms` | `GET /loyalty/programs` | list |
| `listLoyaltyMembers` | `GET /loyalty/members` | list |
| `getOnboardingStatus` | `GET /general/onboarding` | crud |
| `listSupplierTypes` | `GET /supplier/supplier-types` | list |
| `listSupplierBanks` | `GET /supplier/banks` | list |

---

### `misc.js` — Low-Priority Modules

| Function | Endpoint | Tier |
|----------|----------|------|
| `listAISessions` | `GET /ai/sessions` | list |
| `listAIAdminActions` | `GET /ai/admin/actions` | list |
| `listAIAdminIntents` | `GET /ai/admin/intents` | list |
| `listTravelPlans` | `GET /travel/travel-planner/plans` | list |
| `listFeedbackForms` | `GET /feedback/forms` | list |

---

### `master-data.js` — Master Data (Users, Roles, etc.)

| Function | Endpoint | Tier |
|----------|----------|------|
| `listUsers` | `GET /users` | list |
| `listRoles` | `GET /roles` | list |
| `listProducts` | `GET /product/products` | list |
| `createProduct` | `POST /product/products` | crud |
| `listCustomers` | `GET /customer/customers` | list |
| `listSuppliers` | `GET /supplier/suppliers` | list |
| `listWarehouses` | `GET /warehouse/warehouses` | list |
| `listCurrencies` | `GET /master-data/currencies` | list |

---

### `public-endpoints.js` — Public (No Auth)

| Function | Endpoint | Tier |
|----------|----------|------|
| `healthCheck` | `GET /health` | crud |
| `pingCheck` | `GET /ping` | crud |
| `apiVersion` | `GET /version` | crud |

---

## Adding a New Endpoint

1. Add entry to `k6/lib/endpoint-registry.js`:
```javascript
{ name: "module:entity:list", method: "GET", path: "/module/entity", module: "module", tier: "list", authenticated: true },
```

2. Add function to the appropriate `k6/scenarios/apis/<module>.js`:
```javascript
export function listEntity(auth, params = {}) {
    const p = { ...getTaggedParams("module:entity:list"), ...params };
    return authGet(`${API_V1}/module/entity`, auth, p);
}
```

3. Import and call in `k6/tests/endpoint-profiler.js`:
```javascript
import { listEntity } from "../scenarios/apis/module.js";
// In default():
listEntity(auth);
```

---

## Related Docs

- [Architecture](./ARCHITECTURE.md) — Where files live
- [Workflows](./WORKFLOWS.md) — E2E workflow documentation
- [Methodology](./METHODOLOGY.md) — Tagging and tier system
