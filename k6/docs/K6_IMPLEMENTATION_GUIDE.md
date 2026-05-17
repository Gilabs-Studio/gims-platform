# K6 Implementation Guide for GIMS ERP

**Document Version**: 1.1
**Date**: 2026-05-17
**Status**: Implemented (reflects actual file structure)
**Owner**: QA / Performance Engineering Team

> **Guide Type**: This is a GIMS-specific implementation guide, not a generic k6 tutorial. It describes the actual file structure, scripts, and patterns implemented in this repository. For a general k6 introduction, see the [official k6 docs](https://grafana.com/docs/k6/latest/).

---

## 1. Architecture Overview

The k6 test suite follows a **3-layer architecture** that separates concerns and enables reuse:

```
k6/
├── config.js              # Layer 1: Shared configuration (URLs, thresholds, endpoints, workloads)
├── auth-helper.js         # Layer 1: Authentication (CSRF+JWT, token caching)
│
├── lib/                   # Layer 2: Reusable libraries
│   ├── api-client.js      #   OOP API client wrapper (GIMS + generic)
│   ├── error-handler.js   #   Error aggregation + custom metrics
│   └── metrics.js         #   Custom business KPI metrics
│
├── scenarios/             # Layer 2: VU logic (reusable across test types)
│   ├── apis/              #   Per-module API scenarios
│   │   ├── public-endpoints.js   #   Health, ping, API root, CSRF
│   │   ├── master-data.js        #   Products, customers, suppliers, warehouses, currencies
│   │   ├── finance.js            #   COA, journals, budgets, bank accounts
│   │   ├── hrd.js                 #   Attendance, leaves, employees
│   │   ├── sales.js               #   Quotations, orders, DO, invoices, payments
│   │   ├── purchase.js            #   Purchase orders, goods receipts
│   │   └── inventory.js           #   Stock, stock opnames
│   └── e2e/                 #   End-to-end business workflows
│       ├── revenue-cycle.js       #   SQ → SO → DO → Invoice → Payment
│       └── dashboard-overview.js  #   Dashboard + billing (every-login lightweight)
│
├── data/                  # Layer 2: Test data fixtures
│   ├── product-fixtures.js      #   Product names and code generators
│   └── multi-tenant-credentials.js  #   Multi-tenant credential arrays (Phase 1.5)
│
├── tests/                 # Layer 3: Test entry points (compose scenarios + workloads)
│   ├── smoke-test.js      #   PR gate (< 2 min, 1 VU, 5 iterations)
│   ├── load-test.js       #   Release gate (20-50 VUs, 5-15 min)
│   ├── stress-test.js     #   Capacity planning (ramp to 200+ VUs)
│   ├── spike-test.js      #   Flash traffic / marketing events
│   ├── soak-test.js       #   Weekly health check (60 min sustained)
│   ├── concurrent-mutation-test.js  #   Lock contention / race conditions
│   └── rate-limit-test.js #   Redis rate limiter validation
│
├── transaction-test.js    # Legacy (Phase 1): Full revenue cycle with state machine
├── smoke-test.js          # Legacy (Phase 1): Original root-level smoke
├── load-test.js           # Legacy (Phase 1): Original root-level load
├── stress-test.js         # Legacy (Phase 1): Original root-level stress
│
├── reports/               # Benchmark artifacts
│   ├── <timestamp>-*.json #   Raw JSON results per test run
│   ├── <timestamp>-*.md   #   Human-readable summary reports
│   └── generate-baseline-report.js  #   Report generator script
│
└── docs/                  # Documentation
    ├── K6_PRD.md          #   Product requirements document
    ├── K6_MATURITY_ROADMAP.md  #   5-phase implementation plan
    ├── K6_TEST_SUITE_ARCHITECTURE.md  #   Architecture decision record
    ├── PHASE1.5_ENHANCED_TEST_SUITE.md  #   Phase 1.5 implementation details
    ├── PHASE2_QUICKSTART.md  #   CI/CD integration plan
    └── K6_BEST_IMPLEMENTATION_GUIDE.md  #   This guide
```

### Why This Structure

| Layer | What | Why |
|-------|------|-----|
| **Config** | `config.js`, `auth-helper.js` | Single source of truth for URLs, credentials, thresholds, auth flow. Change here → reflects everywhere. |
| **Libraries** | `lib/` | Error handling, custom metrics, API clients. Reusable across all tests without duplication. |
| **Scenarios** | `scenarios/` | VU logic separated from workload configuration. Same `master-data.js` used in smoke, load, AND stress tests. |
| **Test Entry Points** | `tests/` | Only layer that changes per test type. Composes scenarios with specific workload configs. |
| **Legacy Files** | `transaction-test.js`, `*-test.js` at root | Phase 1 files remain for reference; new tests use `tests/` directory. |

### The Core Principle

```
Test entry point (tests/smoke-test.js)
  └─ imports scenarios (scenarios/apis/master-data.js)
      └─ imports libraries (lib/error-handler.js)
          └─ imports config (config.js)

Test entry point (tests/load-test.js)
  └─ imports SAME scenarios (scenarios/apis/master-data.js)
      └─ imports SAME libraries (lib/error-handler.js)
          └─ imports SAME config (config.js)
```

**Same scenario, different workload.** This is the key pattern that makes the suite maintainable.

---

## 2. Layer 1 — Shared Configuration

### config.js

Single source of truth for all environment-dependent settings. All tests import from here.

```javascript
// k6/config.js (excerpt — see full file for complete endpoint registry)

export const BASE_URL = __ENV.BASE_URL || "http://localhost:8081";
export const API_V1 = `${BASE_URL}/api/v1`;

// Credentials — override via environment variables:
//   k6 run -e TEST_EMAIL=admin@example.com -e TEST_PASSWORD=secret ...
export const CREDENTIALS = {
  email: __ENV.TEST_EMAIL || "admin@example.com",
  password: __ENV.TEST_PASSWORD || "admin123",
};

// Thresholds — pass/fail criteria (non-zero exit on failure)
export const THRESHOLDS = {
  http_req_failed: ["rate<0.01"],           // ≤1% errors
  http_req_duration: ["p(95)<500", "p(99)<1000"],  // P95 < 500ms
};

export const CRITICAL_THRESHOLDS = { /* stricter values for CI */ };

// Workload presets — swap with __ENV.WORKLOAD
export const SMOKE_WORKLOAD = {
  executor: "shared-iterations", vus: 1, iterations: 5, maxDuration: "90s",
};

export const AVERAGE_LOAD_WORKLOAD = {
  executor: "ramping-vus", stages: [
    { duration: "1m", target: 20 },
    { duration: "3m", target: 20 },
    { duration: "1m", target: 0 },
  ],
};

// Endpoint registry — single source of truth
export const AUTH_ENDPOINTS = {
  login: `${API_V1}/auth/login`,
  customers: `${API_V1}/customer/customers`,
  products: `${API_V1}/product/products`,
  orders: `${API_V1}/sales/sales-orders`,
  coa: `${API_V1}/finance/chart-of-accounts`,
  // ... all modules
};

// Response validation helpers
export function checkSuccess(check, res, extraChecks = {}) { /* ... */ }
export function checkList(check, res) { /* ... */ }
```

### auth-helper.js

GIMS-specific authentication using CSRF double-submit cookie + JWT (HttpOnly cookies):

```
GET /api/v1/auth/csrf          → Sets gims_csrf_token cookie + X-CSRF-Token header
POST /api/v1/auth/login         → Sends X-CSRF-Token header + credentials
                                  Returns: gims_access_token + gims_refresh_token (HttpOnly cookies)
All subsequent requests         → Authorization: Bearer <token>
```

Token caching prevents re-authentication on every iteration (major performance improvement):

```javascript
// k6/auth-helper.js (key exports)

export function getAuthToken(credentials) { /* cached, reuses token */ }
export function authGet(url, auth, params) { /* helper for GET */ }
export function authPost(url, body, auth, params) { /* helper for POST */ }
export function authPatch(url, body, auth, params) { /* helper for PATCH */ }
```

**Why Bearer over cookies?** `Bearer` requests are CSRF-exempt (per `csrf.go`). This is why we extract the token from the `Set-Cookie` header rather than relying on k6's cookie jar for subsequent requests.

---

## 3. Layer 2 — Reusable Libraries

### lib/helpers.js

Shared utility functions used across all scenarios and test entry points:

| Function | Purpose |
|----------|--------|
| `parseBody(res)` | Parse k6 response JSON safely (returns `{success, data, error}`) |
| `firstItem(listRes)` | Extract first item from paginated list response |
| `extractFieldErrors(res)` | Extract `field_errors` array from error responses |
| `isoDate(date)` | Format Date to ISO date string (`YYYY-MM-DD`) |
| `addDays(date, n)` | Add days to a Date object |
| `randomPick(arr)` | Random element from array |
| `requiredId(name, value)` | Throw if ID is null/undefined (used in setup) |
| `pickBatchId(auth, warehouseId, productId, quantity, apiV1)` | Call `/sales/delivery-orders/select-batches` to pick FIFO batch |
| `collectBatchableProducts(auth, warehouseId, apiV1, limit)` | Find products with inventory batches |
| `findBatchableProduct(auth, warehouseId, apiV1)` | Find one product with available batches |

### lib/error-handler.js

At 10K+ VUs, failures number in the hundreds of thousands. Don't log everything — aggregate:

```javascript
import { errorCounter, fieldErrorCounter } from "../lib/error-handler.js";

// Usage: wrap any response
const eh = new ErrorHandler();
eh.handle(res, { endpoint: "sales:orders" });

// Automatically emits:
//   - gims_errors{endpoint, status, error_type} counter
//   - gims_field_errors{endpoint, field} counter (for GIMS 422 responses)

// For smoke tests (debugging): enable detailed logging
const eh = new ErrorHandler({ logDetails: true });
```

### lib/metrics.js

Custom business KPI metrics that go beyond HTTP latency:

```javascript
import {
  invoiceSuccessRate,
  paymentSuccessRate,
  soConversionRate,
  conflictRate,
  recordWorkflowDuration,
} from "../lib/metrics.js";

// Usage
invoiceSuccessRate.add(!!invoiceId);
soConversionRate.add(!!soId);
recordWorkflowDuration("sales-revenue-cycle", Date.now() - startTime);
conflictRate.add(isConflict ? 1 : 0, { type: "batch-selection" });
```

These metrics appear in test output and can be exported to Prometheus/Grafana:

```
http_req_duration ....................... avg=45ms  min=2ms   med=32ms   max=892ms  p(90)=68ms  p(95)=79ms  p(99)=134ms
  ✓ gims_workflow_duration_ms ........... avg=2341ms
  ✓ gims_invoice_success_rate ............ 100.00%
  ✓ gims_so_conversion_rate .............. 100.00%
  ✓ gims_conflict_rate .................... 2.40%
```

---

## 4. Layer 2 — Reusable Scenarios

### Directory Structure

```
scenarios/
├── apis/          # Per-module, function-based scenarios
│   ├── public-endpoints.js   # health(), ping(), apiRoot(), csrfToken()
│   ├── master-data.js        # listProducts(), getProductDetail(), createProduct()
│   ├── finance.js            # listChartOfAccounts(), listJournals()
│   ├── hrd.js                # listAttendance(), listLeaveRequests()
│   ├── sales.js              # listQuotations(), listOrders(), listDeliveryOrders()
│   ├── purchase.js           # listPurchaseOrders(), listGoodsReceipts()
│   └── inventory.js          # listStock(), listStockOpnames()
└── e2e/           # End-to-end business workflows
    ├── revenue-cycle.js      # revenueCycle(auth, data, options) — 10-step workflow
    └── dashboard-overview.js # dashboardOverview(), billingSubscription()
```

### Usage Pattern

```javascript
// In a test entry point:
import * as masterData from "../scenarios/apis/master-data.js";
import * as sales from "../scenarios/apis/sales.js";
import * as dashboard from "../scenarios/e2e/dashboard-overview.js";

export default function (data) {
  const { auth } = data;

  masterData.listProducts(auth);
  sales.listOrders(auth);
  dashboard.dashboardOverview(auth);
}
```

**Why function-based, not classes?** k6's Goja runtime has limited class support. Functions with exported named exports are more reliable and easier to import:

```javascript
// ✅ Recommended
import * as masterData from "../scenarios/apis/master-data.js";
masterData.listProducts(auth);

// ✅ Also works
import { listProducts } from "../scenarios/apis/master-data.js";
listProducts(auth);

// ❌ Classes may fail in Goja
import { MasterDataScenario } from "../scenarios/apis/master-data.js"; // risky
```

### revenue-cycle.js — Sales Revenue Cycle (SQ → SO → DO → Invoice → Payment)

10-step workflow validating the most critical business flow in GIMS ERP.
Uses `pickBatchId()` for FIFO inventory allocation, tests payment idempotency.

### purchase-cycle.js — Purchase Order → Goods Receipt

4-step workflow: Create PO → Submit → Approve → Create & Confirm GR.
Uses GIMS action endpoints (`POST /submit`, `POST /approve`) instead of status patching.

### journal-entry.js — Finance Journal (Debit/Credit Atomicity)

Creates balanced journal entries with `lines` (not `items`), `chart_of_account_id`
(not `coa_id`), and `company_id` (required field). Verifies debit=credit balance.

### attendance-checkin.js — HRD Attendance (Timezone-Aware)

Uses `POST /hrd/attendance/clock-in` and `POST /hrd/attendance/clock-out` endpoints.
Requires `check_in_type` field ("NORMAL", "WFH", or "FIELD_WORK").
Leave requests use `/hrd/leave-requests/self` (self-service endpoint).
Leave types are at `/master-data/leave-types` (not `/hrd/leave-types`).

### ⚠️ Auth Argument Order Convention

All `auth-helper.js` functions take arguments in this order:

| Function | Signature |
|----------|----------|
| `authGet` | `(url, auth, params)` |
| `authPost` | `(url, body, auth, params)` |
| `authPatch` | `(url, body, auth, params)` |

**auth is always 2nd for GET, 3rd for POST/PATCH** — never first.
This is different from many auth wrapper patterns where auth comes first.
Get this wrong and you'll get `invalid URL` errors at runtime.

The most important scenario: validates the full sales revenue lifecycle under load:

```
1. Create Sales Quotation (POST /sales/sales-quotations)
2. SQ status: sent → approved
3. Convert SQ → Sales Order (POST /sales/sales-orders/convert-from-quotation)
4. SO status: submitted → approved
5. Create Delivery Order with inventory batch selection
6. DO status: sent → approved → prepared → ship → deliver
7. Create Invoice with due_date and line items
8. Invoice status: submitted → approved
9. Create + confirm Payment (idempotency check)
10. [Optional] Concurrent payment rejection (2nd payment on same invoice → 409)
```

```javascript
import { revenueCycle } from "../scenarios/e2e/revenue-cycle.js";

// Usage in a test
export default function (data) {
  const result = revenueCycle(data.auth, data.setupData, {
    withConcurrencyCheck: true,  // validates 2nd payment rejection
  });
}
```

---

## 5. Layer 3 — Test Entry Points

### Directory Structure

```
tests/
├── smoke-test.js               # PR gate: 1 VU, 5 iterations, < 2 min
├── load-test.js               # Release gate: 20-50 VUs, 5-15 min
├── stress-test.js             # Capacity: ramp to 200+ VUs, auto-abort
├── spike-test.js              # Flash traffic: 5 → 40 VUs in 5 seconds
├── soak-test.js               # Weekly health: 30 VUs, 60 min sustained
├── concurrent-mutation-test.js  # Lock contention: 5 VUs fighting over same resource
└── rate-limit-test.js         # Redis rate limiter: 10 → 200 req/s burst
```

### smoke-test.js — Composition Example

```javascript
import { SMOKE_WORKLOAD, THRESHOLDS } from "../config.js";
import { getAuthToken } from "../auth-helper.js";
import { healthCheck, ping, apiRoot, csrfToken } from "../scenarios/apis/public-endpoints.js";
import * as masterData from "../scenarios/apis/master-data.js";
import * as finance from "../scenarios/apis/finance.js";
import * as hrd from "../scenarios/apis/hrd.js";
import * as sales from "../scenarios/apis/sales.js";
import * as purchase from "../scenarios/apis/purchase.js";
import * as dashboard from "../scenarios/e2e/dashboard-overview.js";

export const options = {
  thresholds: THRESHOLDS,
  scenarios: { smoke: SMOKE_WORKLOAD },
};

export function setup() {
  return { auth: getAuthToken() };  // Run once, share to all VUs
}

export default function (data) {
  // Groups match the test output tags
  group("1. Public endpoints", () => { healthCheck(); ping(); apiRoot(); });
  group("2. Auth endpoints", () => { csrfToken(); });
  group("3. Master data", () => { masterData.listUsers(auth); masterData.listProducts(auth); ... });
  group("4. Finance", () => { finance.listChartOfAccounts(auth); finance.listJournals(auth); });
  group("5. HRD", () => { hrd.listAttendance(auth); hrd.listLeaveRequests(auth); });
  group("6. Sales", () => { sales.listQuotations(auth); sales.listOrders(auth); });
  group("7. Purchase", () => { purchase.listPurchaseOrders(auth); });
  group("8. Dashboard", () => { dashboard.dashboardOverview(auth); dashboard.billingSubscription(auth); });
}
```

### All Test Types — Quick Reference

| Test | Command | VUs | Duration | Pass Gate |
|------|---------|-----|----------|-----------|
| **Smoke** | `pnpm k6:smoke` | 1 | ~1 min | 0 failed checks, error rate < 1% |
| **Load Baseline** | `pnpm k6:load:baseline` | 20 | 10 min | p95 < 500ms, p99 < 1000ms, errors < 1% |
| **Load Peak** | `pnpm k6:load:peak` | 50 | 15 min | No sustained 5xx, errors < 1% |
| **Stress Quick** | `pnpm k6:stress:quick` | 20 | ~40s | No threshold abort, no runaway failures |
| **Stress Full** | `pnpm k6:stress:full` | 200 | ~10 min | Identify first SLO breach point |
| **Spike** | `pnpm k6:spike` | 40 (burst) | ~2 min | Graceful recovery, no cascading failures |
| **Soak** | `pnpm k6:soak:weekly` | 30 | 60 min | Stable p95, 0 memory leaks, errors < 0.5% |
| **Concurrent** | `pnpm k6:concurrent` | 5 | 3 min | 409s present = locking works; 0 = problem |
| **Rate Limit** | `pnpm k6:rate-limit` | 20 (burst) | ~1 min | 429 structure correct, reset works |
| **Transaction** | `pnpm k6:transaction` | 3 | 3 min | All 10 steps succeed, 2nd payment rejected |

---

## 6. Running Tests

### Local Development

```bash
# Start GIMS API
pnpm dev:local

# Run tests against local
pnpm k6:smoke          # quick validation
pnpm k6:smoke:local   # relaxed thresholds (no latency gate)
pnpm k6:load:baseline  # normal traffic
pnpm k6:stress:quick   # fast sanity check
```

### Environment Overrides

```bash
# Staging target
k6 run -e BASE_URL=https://staging.gilabs.com k6/tests/smoke-test.js

# Custom load profile
k6 run -e VUS=50 -e DURATION=15m k6/tests/load-test.js

# Relaxed smoke (local dev with noisy latency)
k6 run -e RELAXED=1 k6/tests/smoke-test.js

# Full stress (200 VUs)
k6 run -e MAX_VUS=200 k6/tests/stress-test.js

# Concurrent mutation test
k6 run -e VUS=5 -e DURATION=3m k6/tests/concurrent-mutation-test.js

# Rate limit test
k6 run k6/tests/rate-limit-test.js
```

### Output Options

```bash
# JSON (for dashboards / post-analysis)
k6 run --out json=results.json k6/tests/load-test.js

# CSV
k6 run --out csv=results.csv k6/tests/load-test.js

# InfluxDB + Grafana
k6 run --out influxdb=http://localhost:8086/k6 k6/tests/load-test.js

# Grafana Cloud (requires k6 cloud token)
k6 run --out cloud k6/tests/load-test.js

# Abort on threshold failure (CI/CD)
k6 run --threshold-abort-on-fail k6/tests/smoke-test.js
```

---

## 7. Phase 1.5 — What's New

Phase 1.5 adds correctness testing (not just performance) to enable reliable CI/CD gates in Phase 2.

### New Test Scripts

| File | Purpose | Key Metric |
|------|---------|-----------|
| `tests/spike-test.js` | Flash traffic validation | Graceful recovery after spike subsides |
| `tests/soak-test.js` | Long-run stability | p95 stable over 60 min, 0 memory leaks |
| `tests/concurrent-mutation-test.js` | Lock contention detection | 409 Conflict = FOR UPDATE works; 0 = bug |
| `tests/rate-limit-test.js` | Rate limiter validation | 429 structure + Retry-After header correct |

### New Libraries

| File | Purpose |
|------|---------|
| `lib/error-handler.js` | Aggregated error metrics (not per-failure logging) |
| `lib/metrics.js` | Business KPI metrics (invoice success, payment success, conversion rate) |
| `data/multi-tenant-credentials.js` | Multi-tenant credential arrays (admin, finance, sales, warehouse) |

### Multi-Tenant Load Distribution (Planned)

```javascript
import { multiTenantCredentials, getCredentialForVU } from "../data/multi-tenant-credentials.js";

export function setup() {
  return multiTenantCredentials.map((creds) => ({
    ...creds,
    auth: getAuthToken(creds),
  }));
}

export default function (tenants) {
  const tenant = tenants[(__VU - 1) % tenants.length];
  // VUs round-robin across admin/finance/sales/warehouse credentials
}
```

### Concurrent Mutation Testing Pattern

```javascript
// tests/concurrent-mutation-test.js — validates FOR UPDATE locking
const CONTENTION_GROUP_SIZE = 5;

// All VUs fight over the same resource
const groupIndex = (__VU - 1) % CONTENTION_GROUP_SIZE;

// Expect: one succeeds, others get 409 Conflict
if (res.status === 409) {
  conflictRate.add(1);  // Good — locking works
}
```

---

## 8. Interpreting Results

### Test Output Example

```
✓ smoke .................... 2.91s  1026 calls  0 failed  (checks: 196/196 ok)

  █ http_req_duration ...... avg=45ms  min=2ms   med=32ms   max=892ms  p(90)=68ms  p(95)=79ms  p(99)=134ms
  █ http_req_failed ........ 0.00%
  █ checks ................. 100.00%

  Tags:
  █ master:products:list ...... avg=42ms  p(95)=68ms
  █ finance:coa:list .......... avg=38ms  p(95)=61ms
  █ hrd:attendance:list ....... avg=51ms  p(95)=89ms
```

### Threshold Interpretation

| Threshold | Meaning | What to Do If Failed |
|-----------|---------|----------------------|
| `http_req_failed: rate<0.01` | ≤1% errors | Check backend logs, look for 5xx patterns |
| `http_req_duration: p(95)<500` | 95th percentile < 500ms | Profile slow endpoints, check DB indexes |
| `http_req_duration: p(99)<1000` | 99th percentile < 1000ms | Check connection pool, GC pauses |
| `abortOnFail: true` | Stop test on threshold breach | Don't remove — find the root cause |

### Baseline Comparison (reports/generate-baseline-report.js)

```bash
# Generate a baseline comparison report
node k6/reports/generate-baseline-report.js

# Output: markdown report comparing current run vs stored baseline
# Flags regressions: p95 increase > 20% = warning, > 50% = critical
```

---

## 9. Adding New Tests

### Pattern: Add a New Module Scenario

1. Create `k6/scenarios/apis/new-module.js`:
```javascript
import { authGet } from "../../auth-helper.js";
import { AUTH_ENDPOINTS, checkSuccess } from "../../config.js";

export function listItems(auth, params = {}) {
  const res = authGet(AUTH_ENDPOINTS.newItems, auth, {
    tags: { name: "module:items:list" },
    ...params,
  });
  checkSuccess(check, res);
  return res;
}

export function getItemDetail(auth, itemId, params = {}) {
  const res = authGet(`${AUTH_ENDPOINTS.newItems}/${itemId}`, auth, {
    tags: { name: "module:items:detail" },
    ...params,
  });
  checkSuccess(check, res);
  return res;
}
```

2. Import in any test entry point:
```javascript
import * as newModule from "../scenarios/apis/new-module.js";

export default function (data) {
  newModule.listItems(data.auth);
}
```

### Pattern: Add a New Test Type

1. Create `k6/tests/new-type-test.js`:
```javascript
import { SMOKE_WORKLOAD, THRESHOLDS } from "../config.js";
import { getAuthToken } from "../auth-helper.js";

export const options = {
  thresholds: THRESHOLDS,
  scenarios: { new_type: SMOKE_WORKLOAD },
};

export function setup() {
  return { auth: getAuthToken() };
}

export default function (data) {
  // test logic here
}
```

2. Add to `package.json` scripts:
```json
"k6:new-type": "k6 run k6/tests/new-type-test.js"
```

---

## 10. Legacy Files vs. New Structure

| Legacy File (root) | Status | Replacement |
|-------------------|--------|-------------|
| `k6/smoke-test.js` | Legacy (Phase 1) | `k6/tests/smoke-test.js` |
| `k6/load-test.js` | Legacy (Phase 1) | `k6/tests/load-test.js` |
| `k6/stress-test.js` | Legacy (Phase 1) | `k6/tests/stress-test.js` |
| `k6/transaction-test.js` | Active (Phase 1.5) | Keep — implements full revenue cycle |

**Migration path:**
- Phase 1 files at root → kept for reference
- Phase 1.5+ files → `tests/` directory
- Scenario libraries → `scenarios/` directory
- Libraries → `lib/` directory

Over time, the root-level test files will be deprecated in favor of `tests/` entry points that compose scenarios.

---

## 11. File Inventory

| Path | Lines | Purpose |
|------|-------|---------|
| `k6/config.js` | ~180 | Shared config: URLs, credentials, thresholds, workloads, endpoint registry |
| `k6/auth-helper.js` | ~170 | CSRF+JWT auth with token caching (Goja-compatible) |
| `k6/lib/api-client.js` | ~80 | GIMSClient + generic APIClient (OOP wrapper) |
| `k6/lib/error-handler.js` | ~110 | ErrorHandler + checked() + custom counter metrics |
| `k6/lib/metrics.js` | ~60 | Business KPI metrics (invoice success, workflow latency, etc.) |
| `k6/scenarios/apis/public-endpoints.js` | ~40 | health, ping, apiRoot, csrfToken |
| `k6/scenarios/apis/master-data.js` | ~120 | Users, roles, products, customers, suppliers, warehouses, currencies |
| `k6/scenarios/apis/finance.js` | ~40 | COA, journals, budgets, bank accounts |
| `k6/scenarios/apis/hrd.js` | ~30 | Attendance, leave requests, employees |
| `k6/scenarios/apis/sales.js` | ~50 | Quotations, orders, DO, invoices, payments |
| `k6/scenarios/apis/purchase.js` | ~20 | Purchase orders, goods receipts |
| `k6/scenarios/apis/inventory.js` | ~20 | Stock, stock opnames |
| `k6/lib/helpers.js` | ~150 | Shared utilities (parseBody, pickBatchId, collectBatchableProducts, etc.) |
| `k6/scenarios/e2e/revenue-cycle.js` | ~320 | 10-step sales revenue workflow with idempotency check |
| `k6/scenarios/e2e/purchase-cycle.js` | ~110 | PO → Goods Receipt workflow |
| `k6/scenarios/e2e/journal-entry.js` | ~100 | Balanced JE with debit/credit atomicity |
| `k6/scenarios/e2e/attendance-checkin.js` | ~90 | Clock-in/clock-out + leave request |
| `k6/scenarios/e2e/dashboard-overview.js` | ~25 | Dashboard + billing (every-login) |
| `k6/data/product-fixtures.js` | ~35 | Product names SharedArray + code generator |
| `k6/data/multi-tenant-credentials.js` | ~50 | Multi-tenant credential arrays |
| `k6/tests/smoke-test.js` | ~90 | PR gate entry point |
| `k6/tests/load-test.js` | ~140 | Release gate entry point |
| `k6/tests/stress-test.js` | ~80 | Capacity test entry point |
| `k6/tests/spike-test.js` | ~130 | Spike test entry point |
| `k6/tests/soak-test.js` | ~110 | Soak test entry point |
| `k6/tests/concurrent-mutation-test.js` | ~200 | Lock contention test |
| `k6/tests/rate-limit-test.js` | ~130 | Rate limiter validation |
| `k6/tests/transaction-test.js` | ~185 | All 4 E2E workflows (revenue, purchase, JE, attendance) |
| `k6/transaction-test.js` | ~380 | Legacy (Phase 1): Full revenue cycle |

---

**References:**
- [Grafana k6 Documentation](https://grafana.com/docs/k6/latest)
- [K6_MATURITY_ROADMAP.md](./K6_MATURITY_ROADMAP.md)
- [K6_PRD.md](./K6_PRD.md)
- [PHASE1.5_ENHANCED_TEST_SUITE.md](./PHASE1.5_ENHANCED_TEST_SUITE.md)
- [PHASE2_QUICKSTART.md](./PHASE2_QUICKSTART.md)