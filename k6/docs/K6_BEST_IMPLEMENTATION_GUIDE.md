# K6 Best Implementation Guide & K6 for QA

**Generated:** 2026-05-17
**Sources:** Grafana k6 official docs, community best practices, real-world enterprise patterns

---

## 1. What is K6?

[Grafana k6](https://k6.io) is a modern, developer-centric **load testing tool** built in **Go** with test scripts written in **JavaScript (ES6)**. Key characteristics:

| Feature | Detail |
|---------|--------|
| **Runtime** | Embedded Goja (ES6 JS engine) — NOT Node.js. Limited npm compat. |
| **Load generation** | Single-machine up to 30K+ req/s; distributed via k6-operator |
| **Protocols** | HTTP/1.1, HTTP/2, WebSocket, gRPC, Browser (xk6-browser), Kafka (xk6) |
| **Test-as-code** | Git-versioned, modular, reusable scripts |
| **Extensibility** | xk6 extensions (SQL, Redis, Kafka, etc.) |
| **CI/CD native** | CLI-first, non-zero exit on threshold failure |

### Architecture Overview

```
┌──────────────────────────────────────┐
│          k6 binary (Go)              │
│  ┌────────────────────────────────┐  │
│  │   Goja JS Runtime (ES6)        │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │  init stage (once/VU)    │  │  │
│  │  │  setup() → data → VUs    │  │  │
│  │  │  default() / scenarios   │  │  │
│  │  │  teardown()              │  │  │
│  │  │  handleSummary()         │  │  │
│  │  └──────────────────────────┘  │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │   Core Engine (Go)             │  │
│  │   • Schedulers / Executors     │  │
│  │   • Metrics Engine             │  │
│  │   • HTTP/gRPC/WS Clients       │  │
│  │   • Thresholds Evaluator       │  │
│  └────────────────────────────────┘  │
│  Output: stdout, JSON, CSV, Cloud,   │
│          InfluxDB, Prometheus, etc.  │
└──────────────────────────────────────┘
```

---

## 2. Best Implementation Patterns

### 2.1 Project Structure

The recommended structure separates **shared infrastructure** from **test scenarios**:

```
k6/
├── config.js              # Shared: URLs, credentials, thresholds, workloads, endpoints
├── auth-helper.js         # Shared: authentication flow (CSRF+JWT, token cache)
├── lib/                   # Shared: reusable modules
│   ├── api-client.js      # API client abstraction (REST/GraphQL)
│   ├── error-handler.js   # Error logging wrapper
│   └── metrics.js         # Custom metric definitions
├── scenarios/             # Reusable VU logic modules
│   ├── e2e/
│   │   ├── checkout.js
│   │   └── browse-products.js
│   └── apis/
│       ├── account.js
│       └── finance.js
├── tests/                 # Test entry points (compose scenarios + workloads)
│   ├── smoke-test.js
│   ├── load-test.js
│   ├── stress-test.js
│   ├── spike-test.js
│   ├── soak-test.js
│   ├── transaction-test.js
│   └── pre/
│       └── stress-checkout-test.js
├── data/                  # Test data (JSON fixtures, CSVs)
│   └── users.json
├── reports/               # Benchmark artifacts
│   └── generate-report.js
└── docs/                  # Documentation
    ├── K6_PRD.md
    ├── K6_MATURITY_ROADMAP.md
    └── K6_TEST_SUITE_ARCHITECTURE.md
```

**Key principle:** Separate concerns. Configuration, auth, scenarios, and test definitions live in different files. Tests compose them via imports.

### 2.2 Modular Configuration

Single source of truth for all environment-dependent settings. Environment variables drive behavior.

```javascript
// config.js — NOT the full file, see k6/config.js for the real one

export const BASE_URL = __ENV.BASE_URL || "http://localhost:8081";

// Thresholds: pass/fail criteria
export const THRESHOLDS = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<500", "p(99)<1000"],
};

// Stricter for CI/CD
export const CRITICAL_THRESHOLDS = {
  http_req_failed: ["rate<0.005"],
  http_req_duration: ["p(95)<300", "p(99)<800"],
};

// Workload presets — swap with __ENV.WORKLOAD
export const WORKLOAD = {
  smoke:   { executor: "shared-iterations", vus: 1, iterations: 5, maxDuration: "90s" },
  average: { executor: "ramping-vus", stages: [
    { duration: "1m", target: 20 },
    { duration: "3m", target: 20 },
    { duration: "1m", target: 0 },
  ]},
  stress:  { executor: "ramping-vus", stages: [
    { duration: "1m", target: 50 },
    { duration: "2m", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "2m", target: 100 },
    { duration: "1m", target: 0 },
  ]},
  soak:    { executor: "ramping-vus", stages: [
    { duration: "2m", target: 30 },
    { duration: "28m", target: 30 },
    { duration: "2m", target: 0 },
  ]},
};

// Endpoint registry — single source of truth
export const AUTH_ENDPOINTS = {
  login: `${API_V1}/auth/login`,
  customers: `${API_V1}/customer/customers`,
  orders: `${API_V1}/sales/sales-orders`,
  // ...
};
```

**Pattern:** Tests pick workload via `__ENV.WORKLOAD`, thresholds autodetect CI via `process.env.CI`.

### 2.3 Reusable Test Scenarios

Scenarios (VU logic) should be **decoupled from workload configuration** so they can be reused across environments.

```javascript
// scenarios/account.js — reusable scenario module
import { check } from "k6";
import { authGet, authPost } from "../auth-helper.js";

export function accountScenario(auth, baseUrl) {
  return {
    getAccounts: () => {
      const res = authGet(`${baseUrl}/finances/chart-of-accounts`, auth);
      check(res, { "accounts returned": (r) => r.status === 200 });
      return res;
    },
    createJournal: (data) => {
      const res = authPost(`${baseUrl}/finances/journal-entries`, data, auth);
      check(res, { "journal created": (r) => r.status === 201 });
      return res;
    },
  };
}
```

```javascript
// tests/smoke-finance-test.js — compose scenario + workload
import { accountScenario } from "../scenarios/account.js";
import { getAuthToken } from "../auth-helper.js";
import { WORKLOAD, THRESHOLDS, AUTH_ENDPOINTS } from "../config.js";

export const options = {
  scenarios: { smoke: WORKLOAD.smoke },
  thresholds: THRESHOLDS,
};

export function setup() {
  return { auth: getAuthToken(), baseUrl: AUTH_ENDPOINTS.coa };
}

export default function (data) {
  const scenario = accountScenario(data.auth, data.baseUrl);
  scenario.getAccounts();
}
```

### 2.4 API Client Pattern (Object-Oriented Models)

Encapsulate API calls behind a client class. When APIs change, only the client updates — not every test.

```javascript
// lib/api-client.js
export class APIClient {
  constructor(token, baseUrl, addCheck) {
    this.token = token;
    this.baseUrl = baseUrl;
    this.addCheck = addCheck;
  }

  create(type, data, options) {
    const res = http.post(`${this.baseUrl}/${type}`, JSON.stringify(data), {
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      ...options,
    });
    this.addCheck(res, { [`${type} created`]: (r) => r.status === 201 });
    return { data: res.json(), res };
  }

  find(type, id, options) { /* ... */ }
  update(type, id, data, options) { /* ... */ }
  remove(type, id, options) { /* ... */ }
}
```

**Benefit:** New test writers don't need to know API specs or k6 HTTP APIs — they call `client.create("products", {...})`.

### 2.5 Error Handling Wrapper

During high-load tests, failures can number hundreds of thousands. Plan what to store.

```javascript
// lib/error-handler.js
export class ErrorHandler {
  constructor(logErrorDetails) {
    this.logErrorDetails = logErrorDetails; // callback receiving {url, status, message, traceId}
  }

  logError(isError, res, tags = {}) {
    if (!isError) return;
    const traceparentHeader = res.request.headers["Traceparent"];
    this.logErrorDetails({
      url: res.url,
      status: res.status,
      message: res.body?.substring(0, 500),
      traceId: traceparentHeader,
      ...tags,
    });
  }
}
```

**Storage choices:**
- Log → Grafana Loki (for searchable trace correlation)
- Custom counter metric → Prometheus (aggregated, not per-failure)
- JSON output → local file (post-test analysis)

> **Warning:** At 10K failures, storing full response bodies per failure can exhaust memory. Prefer aggregation.

### 2.6 Test Lifecycle

Every k6 test goes through exactly these stages, in order:

```
┌──────────┐     ┌──────────┐     ┌──────────────────┐     ┌──────────┐
│ 1. init  │ ──► │ 2. setup │ ──► │ 3. VU code (loop) │ ──► │ 4. teardown│
│          │     │          │     │                    │     │          │
│ Load     │     │ Prepare  │     │ Execute default()  │     │ Cleanup  │
│ files    │     │ test env │     │ or scenario funcs  │     │ webhook  │
│ Import   │     │ Call API │     │ repeatedly         │     │ validate │
│ modules  │     │ once     │     │                    │     │ once     │
│ Define   │     │ only     │     │ per VU per iter    │     │ only     │
│ options  │     │          │     │                    │     │          │
└──────────┘     └──────────┘     └──────────────────┘     └──────────┘
                                                          ┌──────────────┐
                                                          │ handleSummary│
                                                          │ (optional)   │
                                                          └──────────────┘
```

| Stage | Runs | Can make HTTP? | Purpose |
|-------|------|----------------|---------|
| **init** | Once per VU | ❌ No | Import modules, load files, declare functions |
| **setup** | Once (total) | ✅ Yes | Prepare test environment, fetch auth tokens |
| **VU code** | Per iteration × N VUs | ✅ Yes | The actual test logic |
| **teardown** | Once (total) | ✅ Yes | Cleanup, send webhook |
| **handleSummary** | Once (total) | ❌ No | Customize summary output (JSON, HTML) |

**Critical pattern:** Do expensive initialization in `setup()` and pass data to VUs. Example:

```javascript
export function setup() {
  // Runs ONCE — authenticate, fetch test data
  const auth = getAuthToken(CREDENTIALS);
  const products = apiGet(`${API_V1}/products`, auth).json().data;
  return { auth, products };  // passed to each VU
}

export default function (data) {
  // Each VU gets data from setup() — no re-auth needed
  const product = data.products[Math.floor(Math.random() * data.products.length)];
  http.get(`${API_V1}/products/${product.id}`, {
    headers: { Authorization: `Bearer ${data.auth}` },
  });
}
```

### 2.7 Executors — How to Model Load

k6's **executors** control how VUs and iterations are scheduled. Choosing the right one matters.

| Executor | Model | Best For |
|----------|-------|----------|
| `shared-iterations` | Fixed total iterations shared across VUs | Smoke tests, quick validation |
| `per-vu-iterations` | Each VU runs exactly N iterations | Warm-up, specific counts |
| `constant-vus` | Fixed number of VUs for duration | Sustained load testing |
| `ramping-vus` | VUs ramp up/down in stages | Stress, breakpoint testing |
| `constant-arrival-rate` | Fixed RPS (open model) | SLO validation at specific throughput |
| `ramping-arrival-rate` | Ramping RPS (open model) | Realistic traffic simulation |

**Open vs Closed models:**
- **Closed** (VU-based): New iteration starts ONLY after previous finishes — like a user that waits for response before next action.
- **Open** (arrival-rate-based): New iteration starts on schedule regardless of responses — like real traffic arriving independently.

For realistic QA scenarios, **arrival-rate executors** better simulate actual user traffic because real users don't slow down when the server slows down.

```javascript
// Open model example: 100 req/s for 5 minutes
scenarios: {
  constant_load: {
    executor: "constant-arrival-rate",
    rate: 100,
    timeUnit: "1s",
    duration: "5m",
    preAllocatedVUs: 20,
    maxVUs: 50,
  },
}
```

### 2.8 Checks vs Thresholds — Two Different Things

| | **Checks** | **Thresholds** |
|---|---|---|
| **Purpose** | Assert correctness of individual responses | Assert aggregate performance criteria |
| **Scope** | Per-request validation | Whole-test evaluation |
| **Fails?** | Logged as failed check (non-fatal) | Exits non-zero, can `abortOnFail` |
| **Example** | `check(res, {"status is 200": r => r.status === 200})` | `http_req_duration: ["p(95)<500"]` |

```javascript
import { check } from "k6";

export const options = {
  thresholds: {
    http_req_failed: ["rate<0.01"],           // ≤1% errors → pass/fail
    http_req_duration: ["p(95)<500"],         // 95th percentile < 500ms
    "http_req_duration{type:login}": ["p(99)<300"], // tag-specific
  },
};

export default function () {
  const res = http.get("https://api.example.com/items");
  check(res, {
    "status is 200": (r) => r.status === 200,
    "body has items": (r) => r.json().data?.length > 0,
  });
}
```

**Important:** Checks affect the `checks` metric; thresholds affect exit code. Use checks for functional validation, thresholds for SLO gates.

### 2.9 Custom Metrics

```javascript
import { Trend, Counter, Rate, Gauge } from "k6/metrics";

const loginLatency = new Trend("login_latency");       // Percentile distribution
const failedLogins = new Counter("failed_logins");      // Running count
const successRate = new Rate("login_success_rate");      // Ratio
const activeUsers = new Gauge("active_users");           // Point-in-time value

export default function () {
  const res = http.post("https://api.example.com/login");
  loginLatency.add(res.timings.duration);
  successRate.add(res.status === 200);
  if (res.status !== 200) failedLogins.add(1);
}
```

Custom metrics also work in thresholds:
```javascript
thresholds: {
  "login_latency": ["p(95)<300"],
  "login_success_rate": ["rate>0.95"],
}
```

### 2.10 Hybrid Testing (Protocol + Browser)

| Approach | Tool | CPU/Memory per VU | Use Case |
|----------|------|-------------------|----------|
| **Protocol** | `k6/http` | Low (~1MB RAM) | API load, 1000+ VUs |
| **Browser** | `k6/browser` | High (~20-50MB RAM) | Frontend UX, visual regressions |
| **Hybrid** | Both | Medium | Majority protocol load + few browser VUs for real UX metrics |

```javascript
import http from "k6/http";
import { browser } from "k6/browser";

export const options = {
  scenarios: {
    api_load: {
      executor: "constant-vus", vus: 100, duration: "5m",
      exec: "apiScenario",
    },
    browser_check: {
      executor: "constant-vus", vus: 2, duration: "5m",
      exec: "browserScenario",
    },
  },
};

export async function browserScenario() {
  const page = await browser.newPage();
  await page.goto("https://app.example.com");
  await page.screenshot({ path: "screenshots/home.png" });
  await page.close();
}

export function apiScenario() {
  http.get("https://api.example.com/data");
}
```

**Best practice:** 95% protocol VUs + 5% browser VUs. Browser VUs validate real user experience; protocol VUs generate the bulk of load without burning resources.

---

## 3. K6 for QA — Quality Assurance Patterns

### 3.1 Test Type Taxonomy

Every QA load testing strategy should include these test types, each with a distinct purpose:

| Type | Purpose | Load Profile | Typical Duration | CI/CD Role |
|------|---------|-------------|------------------|------------|
| **Smoke** | Verify system is alive; catch script errors | 1 VU, 5 iterations | < 2 min | PR gate (every commit) |
| **Average Load** | Performance under normal traffic | 20-50 VUs constant | 5-15 min | Release gate |
| **Stress** | Find breaking point & degradation pattern | Ramping to 200+ VUs | 10-20 min | Major release, capacity planning |
| **Spike** | Validate recovery from sudden burst | 10 → 200 VUs in 10s | 5-10 min | Pre-sale events, flash traffic |
| **Soak** | Detect memory leaks, connection drift | 30 VUs sustained | 60+ min | Weekly confidence check |
| **Breakpoint** | Find exact VU count where SLOs break | Progressive ramp until abort | Until failure | Capacity modeling |
| **Transaction** | Validate multi-step workflow correctness | 3-5 VUs | 5-15 min | Pre-merge for critical modules |

### 3.2 Quality Gates in CI/CD

The holy grail: block bad code from reaching production using k6 thresholds.

```yaml
# .github/workflows/performance-gates.yml
name: Performance Gates
on:
  pull_request:
    types: [opened, synchronize]
  push:
    tags: ["v*"]

jobs:
  smoke:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - run: k6 run k6/tests/smoke-test.js --threshold-abort-on-fail
      - name: Check exit code
        if: failure()
        run: exit 1

  load:
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - run: k6 run k6/tests/load-test.js --out json=load-summary.json
      - uses: actions/upload-artifact@v4
        with:
          name: load-test-summary
          path: load-summary.json
```

**Gate strategy:**
```
PR opened → Smoke (2 min) → PASS? → merge allowed
                            → FAIL? → merge blocked, comment on PR with details

Tag pushed → Load (6 min)  → PASS? → deploy to staging
                            → FAIL? → release blocked, notify engineering
```

**Golden rule:** Start conservative with thresholds. A flaky gate that blocks all PRs will get disabled. Tune for 2 weeks before making blocking.

Common false positive pattern: `p(95) < 300ms` on local dev network → fails when CI runs against staging with realistic network latency. **Always test thresholds against the target environment.**

### 3.3 Transaction Correctness Testing

Beyond performance — does the system maintain data integrity under load?

**Pattern:** Execute multi-step business workflows and assert the final state is correct.

```javascript
// Example: Sales Order workflow
export default function (data) {
  group("Create Sales Quotation", () => {
    const quotation = apiPost(data.auth, `${API_V1}/sales/sales-quotations`, {
      customer_id: data.customerId,
      items: [{ product_id: data.productId, quantity: 10 }],
      valid_until: isoDate(addDays(new Date(), 30)),
    });
    check(quotation, { "quotation created": (r) => r.status === 201 });
    data.quotationId = quotation.json().data.id;
  });

  group("Convert to Sales Order", () => {
    const order = apiPost(data.auth,
      `${API_V1}/sales/sales-quotations/${data.quotationId}/convert`, {});
    check(order, { "order created": (r) => r.status === 201 });
    data.orderId = order.json().data.id;
  });

  group("Create Delivery Order", () => {
    const delivery = apiPost(data.auth, `${API_V1}/sales/delivery-orders`, {
      sales_order_id: data.orderId,
      items: [{ product_id: data.productId, quantity: 10 }],
    });
    check(delivery, { "delivery created": (r) => r.status === 201 });
    data.deliveryId = delivery.json().data.id;
  });

  group("Create Invoice", () => {
    const invoice = apiPost(data.auth, `${API_V1}/sales/invoices`, {
      delivery_order_id: data.deliveryId,
    });
    check(invoice, { "invoice created": (r) => r.status === 201 });
  });
}
```

**What this catches:**
- API contract breakage (missing fields, changed routes)
- State machine violations (can't transition order from wrong status)
- Missing foreign keys / validation bugs
- JSON serialization errors in nested payloads

### 3.4 Concurrency & Race Condition Testing

ERP systems have high write contention. Validate that locking works.

```javascript
// Pattern: 2 VUs update the same resource simultaneously
let globalState = new SharedArray("state", () => [{ updatedBy: null, startTime: null }]);

export default function () {
  const vuId = __VU;
  const resourceId = "shared-resource-1";

  // Both VUs attempt to update the same resource
  const res = http.patch(`${API_V1}/resources/${resourceId}`,
    JSON.stringify({ value: vuId, version: 1 }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (res.status === 200) {
    // This VU won the race
    console.log(`VU ${vuId}: UPDATE SUCCEEDED`);
  } else if (res.status === 409) {
    // Conflict — another VU already updated
    console.log(`VU ${vuId}: CONFLICT detected (correct)`);
  } else {
    console.error(`VU ${vuId}: UNEXPECTED status ${res.status}`);
  }
}
```

**What to validate:**
- No lost updates (final DB state matches only the winning write)
- 409 Conflict responses when using optimistic locking
- Deadlock detection (if using pessimistic locking via `FOR UPDATE`)
- No silent overwrites

### 3.5 Rate Limiting Validation

```javascript
export const options = {
  scenarios: {
    burst: {
      executor: "constant-arrival-rate",
      rate: 100,           // Hit the API faster than rate limit allows
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 10,
      maxVUs: 20,
    },
  },
};

export default function () {
  const res = http.get(`${API_V1}/public/endpoint`);

  if (res.status === 429) {
    // Verify rate limit response structure
    check(res, {
      "429 has Retry-After header": (r) => r.headers["Retry-After"] !== undefined,
      "429 has error message": (r) => r.json().error !== undefined,
    });
  }
}
```

### 3.6 Multi-Tenant Isolation Testing

In SaaS/ERP systems, tenants must never see each other's data.

```javascript
const tenants = [
  { email: "admin@tenant1.com", token: null, expectedCompany: "Tenant 1" },
  { email: "admin@tenant2.com", token: null, expectedCompany: "Tenant 2" },
];

export function setup() {
  return tenants.map((t) => ({
    ...t,
    token: getAuthToken({ email: t.email, password: "secret" }),
  }));
}

export default function (tenants) {
  const tenant = tenants[__VU % tenants.length];  // round-robin

  const res = apiGet(tenant.token, `${API_V1}/users/me`);
  const company = res.json().data.company.name;

  check(res, {
    "tenant isolation verified": () => company === tenant.expectedCompany,
  });
}
```

### 3.7 Regression Baselines

Without baselines, you can't detect regressions. Store results and compare.

```
reports/
├── 20260510-baseline.json    # {"smoke": {"p95": 86, "errors": 0}, "load": {"p95": 79, ...}}
├── 20260515-pr-1234.json     # {"smoke": {"p95": 320, "errors": 0.02}}
└── compare.js                # Compare two reports, flag regressions
```

```javascript
// reports/compare.js — regression detection script
const baseline = JSON.parse(open("./reports/20260510-baseline.json"));
const current = JSON.parse(open(`./reports/${__ENV.RUN_ID}.json`));

for (const [test, metrics] of Object.entries(current)) {
  const base = baseline[test];
  if (!base) continue;

  if (metrics.p95 > base.p95 * 1.2) {
    console.error(`REGRESSION: ${test} p95 ${metrics.p95}ms vs baseline ${base.p95}ms (+${((metrics.p95/base.p95 - 1)*100).toFixed(1)}%)`);
  }
  if (metrics.error_rate > base.error_rate * 2) {
    console.error(`REGRESSION: ${test} error rate ${metrics.error_rate} vs baseline ${base.error_rate}`);
  }
}
```

### 3.8 SLO-Driven Thresholds

Map business Service Level Objectives to k6 thresholds.

| Business SLO | k6 Threshold | Rationale |
|-------------|-------------|-----------|
| "99% of API requests complete within 500ms" | `http_req_duration: ["p(99)<500"]` | Direct SLO mapping |
| "Login must never take > 1s" | `http_req_duration{endpoint:login}: ["max<1000"]` | Tag-filtered |
| "Error rate must stay below 0.1% for finance" | `http_req_failed{module:finance}: ["rate<0.001"]` | Per-module |
| "Checkout flow must succeed 99.9% of time" | `checkout_success_rate: ["rate>0.999"]` | Custom metric |

**Module-level SLOs** (as implemented in GIMS k6):

```javascript
export const MODULE_SLOS = {
  finance:   { p95: 200, error_rate: 0.5 },   // Critical: month-end closing
  sales:     { p95: 150, error_rate: 0.5 },   // High: real-time dashboard
  hrd:       { p95: 300, error_rate: 1.0 },   // Medium: batch processing OK
  inventory: { p95: 250, error_rate: 0.8 },   // Medium: frequent updates
  purchase:  { p95: 250, error_rate: 0.8 },   // Medium: PO throughput
  product:   { p95: 100, error_rate: 0.5 },   // High: master data lookups
};
```

---

## 4. Maturity Model for K6 in QA

The GIMS k6 implementation follows a proven 5-phase maturity model:

```
Phase 1: Baseline Measurement     ✅ COMPLETE
  └─ Smoke + Load + Stress tests, centralized config, auth helper

Phase 1.5: Enhanced Test Suite    🔴 IN PROGRESS (BLOCKING Phase 2)
  └─ Transaction workflows, multi-tenant, concurrency, rate-limit, spike/soak

Phase 2: CI/CD Integration        📋 PLANNED
  └─ GitHub Actions gates, module-level SLOs, regression runbook

Phase 3: Production Observability 📋 PLANNED
  └─ Synthetic monitoring 24/7, custom KPI metrics, Grafana dashboards

Phase 4: Resilience Validation    📋 FUTURE
  └─ Fault injection, chaos engineering, graceful degradation testing

Phase 5: Enterprise Scale         📋 FUTURE
  └─ k6-operator, distributed testing, multi-region, capacity planning
```

**Critical insight from the GIMS PRD:** Jumping straight to CI/CD gates (Phase 2) without Phase 1.5 is dangerous — you'll only catch performance regressions, but miss correctness bugs, race conditions, and multi-tenant isolation issues that are more destructive than slowness.

---

## 5. Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| **One giant test script** | Hard to read, impossible to reuse, no separation of concerns | Split into config + auth + scenarios + tests |
| **Hardcoded credentials/URLs** | Can't run against staging/prod without code changes | Use `__ENV` + config.js |
| **Mixing smoke + load + stress in one script** | Results are confusing; no clear pass/fail per test type | Separate scripts per test type |
| **No thresholds** | Test always "passes" — no quality gate | Define `thresholds` aligned with SLOs |
| **Checks without thresholds** | Failed checks are logged but test exits 0 — silent failures | Use both; checks for detail, thresholds for gating |
| **Ignoring setup/teardown** | Auth repeated per VU, test environment not cleaned up | Use `setup()` for auth, `teardown()` for cleanup |
| **No `abortOnFail` on critical thresholds** | Test continues after SLO breach — wastes time, misleading results | `http_req_failed: [{ threshold: "rate>0.01", abortOnFail: true }]` |
| **Sleep-based timing assumptions** | Flaky tests in CI due to timing | Use `check` for eventual consistency, not `sleep(5)` |
| **No output/artifact strategy** | Results lost after run; can't compare trends | Always export JSON + generate comparison reports |
| **Browser VUs for bulk load** | 50MB RAM per browser VU → generator machine OOMs at scale | Use protocol VUs (HTTP/gRPC) for bulk load; browser for UX sampling only |
| **NPM modules in k6** | k6 uses Goja, not Node.js — most npm packages fail | Use k6's built-in modules or browserify/webpack compatible libs only |

---

## 6. Quick Reference: Key Commands

```bash
# Run a test
k6 run k6/tests/smoke-test.js

# Override environment variables
k6 run -e BASE_URL=https://staging.example.com -e VUS=50 k6/tests/load-test.js

# Export results
k6 run --out json=results.json k6/tests/load-test.js
k6 run --out csv=results.csv k6/tests/load-test.js
k6 run --out influxdb=http://localhost:8086/k6 k6/tests/load-test.js

# Abort on threshold failure (CI/CD)
k6 run --threshold-abort-on-fail k6/tests/smoke-test.js

# Run with config file
k6 run --config k6/config.json k6/tests/load-test.js

# List available options
k6 run --help
k6 options
```

---

## 7. Ecosystem & Extensions

| Extension | Purpose | Install |
|-----------|---------|---------|
| **xk6-browser** | Browser-level testing (Playwright-like API) | Built into k6 ≥0.43 |
| **xk6-sql** | Direct database queries | `xk6 build --with github.com/grafana/xk6-sql` |
| **xk6-redis** | Redis operations | `xk6 build --with github.com/grafana/xk6-redis` |
| **xk6-output-prometheus** | Export metrics to Prometheus | `xk6 build --with github.com/grafana/xk6-output-prometheus-remote` |
| **xk6-dashboard** | Real-time web UI for test results | `xk6 build --with github.com/grafana/xk6-dashboard` |
| **xk6-chaos** | Fault injection / chaos engineering | `xk6 build --with github.com/grafana/xk6-chaos` |
| **k6-operator** | Kubernetes-native distributed testing | `kubectl apply -f https://github.com/grafana/k6-operator` |

---

## 8. Comparison: K6 vs Other Load Testing Tools

| Tool | Language | Model | Best For | Weakness |
|------|----------|-------|----------|----------|
| **k6** | JavaScript (Go) | Code as test | CI/CD-native, DevOps teams, API/cloud | Limited protocol support (no JDBC, LDAP) |
| **JMeter** | GUI / Groovy | Thread-per-user | Legacy systems, many protocols | Heavy resource usage, complex CI integration |
| **Gatling** | Scala / Java / Kotlin | Async event-driven | Enterprise Java shops | Steep learning curve |
| **Locust** | Python | Coroutine-based | Python-centric teams | Lower raw throughput than k6 |
| **Artillery** | JS / YAML | Event-driven | Serverless, quick YAML configs | Less flexible than k6 for complex scenarios |

**k6 advantages for QA:**
- 15-20x faster than Locust, 10x faster than Gatling (single machine throughput)
- Native CI/CD integration (non-zero exit codes)
- Grafana Cloud for managed execution + dashboards
- JavaScript → accessible to frontend and full-stack engineers
- Single binary, no JVM, no Python venv

---

## Summary

The best k6 implementation for QA follows these principles:

1. **Separate concerns:** config, auth, scenarios, and test definitions live in different files
2. **Reuse scenarios:** same VU logic runs across smoke, load, stress — only workload differs
3. **API client pattern:** encapsulate HTTP calls so API changes don't break all tests
4. **Error handling:** log or aggregate errors; don't let failures go silent
5. **Thresholds = SLOs:** every test has pass/fail criteria that map to business objectives
6. **CI/CD gates:** smoke on every PR, load on every release, results exported as artifacts
7. **Transaction testing:** validate multi-step workflows under load, not just endpoint latency
8. **Don't skip Phase 1.5:** correctness testing catches bugs that performance-only tests miss
9. **Regression baselines:** store results and compare; 20% latency increase = alert
10. **Maturity model:** evolve from baseline → CI/CD → observability → resilience → scale

---

**References:**
- [Grafana k6 Documentation](https://grafana.com/docs/k6/latest)
- [Organizing your k6 testing suite (Grafana Blog)](https://grafana.com/blog/2024/04/30/organizing-your-grafana-k6-performance-testing-suite-best-practices-to-get-started)
- [Setting up k6 with JavaScript tools (Grafana Blog)](https://grafana.com/blog/2024/05/02/setting-up-your-grafana-k6-performance-testing-suite-javascript-tools-shared-libraries-and-more)
- [k6 GitHub Repository](https://github.com/grafana/k6)
- [k6 test types guide](https://grafana.com/docs/k6/latest/testing-guides/test-types)
