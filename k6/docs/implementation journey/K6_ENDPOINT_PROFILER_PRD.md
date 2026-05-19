# PRD: GIMS ERP K6 Endpoint Profiler

## Problem Statement

The GIMS ERP platform has multiple modules (Sales, Purchase, Finance, HRD, Inventory, Master Data) with dozens of API endpoints, but there is no systematic way to identify which endpoints are slow, which degrade under load, and which modules have the worst performance characteristics. The existing k6 test suite (smoke, load, stress, soak, spike, transaction tests) measures overall system health but does not attribute latency to specific endpoints. Without per-endpoint profiling, performance optimization is guesswork.

## Solution

Build a **single ramping endpoint profiler** that hits every GIMS API endpoint with tagged requests (`{module, endpoint, tier, method}`), collects per-endpoint latency (p50/p95/p99), error rate, and throughput, then produces a ranked report flagging slow endpoints with 🔴🟡🟢 severity based on tier-based thresholds. This replaces the need to run multiple separate test types for profiling — one progressive run reveals the latency curve per endpoint as load increases.

The profiler reuses existing k6 infrastructure (auth-helper, config, scenarios) and adds two new modules:
1. **Endpoint Registry** — declarative mapping of every GIMS endpoint to its module, tier, and threshold
2. **Report Analyzer** — Node.js script that parses k6 JSON output into a terminal table + JSON report

## User Stories

1. As a **performance engineer**, I want to run a single k6 command and get a ranked report of all endpoints by p95 latency, so that I can immediately see which endpoints need optimization.
2. As a **performance engineer**, I want endpoints tagged by module (sales, purchase, finance, hrd, inventory, master-data) so I can identify which module has the most performance problems.
3. As a **performance engineer**, I want endpoints classified by tier (CRUD < 200ms, List < 500ms, Workflow < 1000ms) so that slow endpoints are flagged relative to their expected complexity.
4. As a **backend developer**, I want to see p50/p95/p99 latency per endpoint so I can identify whether an endpoint is slow for most requests or just at the tail.
5. As a **backend developer**, I want to see error rate per endpoint so I can distinguish "slow but reliable" from "fast but failing".
6. As a **DevOps engineer**, I want throughput (req/s) per endpoint so I can understand which endpoints carry the most load.
7. As a **DevOps engineer**, I want the profiler configurable via environment variables (BASE_URL, VUS, DURATION) so I can run it against local, staging, or production-like environments.
8. As a **QA engineer**, I want multi-tenant authentication per VU so that load is distributed across tenants and per-tenant isolation bugs are caught during profiling.
9. As a **QA engineer**, I want E2E workflows (revenue cycle, purchase cycle, journal entry, attendance) profiled alongside individual API endpoints so I can see end-to-end latency vs individual request latency.
10. As a **team lead**, I want JSON report output so I can diff profiling runs over time and track whether performance improves or regresses.
11. As a **team lead**, I want a terminal table with emoji indicators (🔴🔴🟡🟢) so I can see the performance summary at a glance in CI output.
12. As a **performance engineer**, I want a single ramping profile (1→50 VUs over 10 minutes) so I can observe how each endpoint degrades as load increases.
13. As a **backend developer**, I want the endpoint registry to be a single declarative file so adding new endpoints to the profiler is a one-line change.
14. As a **performance engineer**, I want the profiler to reuse existing scenario functions (sales, purchase, finance, hrd APIs and E2E workflows) so I don't duplicate test logic.
15. As a **QA engineer**, I want setup() to create required test data (products, customers, suppliers) if it doesn't exist, so profiling tests don't fail due to missing prerequisites.
16. As a **DevOps engineer**, I want the test data creation to use existing seed data first and only create what's missing, so profiling works in both fresh and pre-seeded environments.
17. As a **performance engineer**, I want the report analyzer to group results by module so I can compare module-level performance.
18. As a **backend developer**, I want the profiler to use `--out json` for detailed output so I can do ad-hoc analysis beyond the standard report.
19. As a **team lead**, I want profiling runs to produce reproducible results (seeded random data, configurable VU count and duration) so I can compare apples-to-apples across runs.
20. As a **performance engineer**, I want the profiler to export `http_req_duration` tagged by `{endpoint, module, tier}` so k6's built-in thresholds can beleveraged for CI pass/fail.

## Implementation Decisions

### Module 1: Endpoint Registry (`k6/lib/endpoint-registry.js`)

A declarative registry mapping every GIMS API endpoint to its metadata:

```javascript
// Endpoint shape:
{
  name: "sales:quotations:list",     // unique identifier
  method: "GET",                      // HTTP method
  path: "/api/v1/sales/sales-quotations", // path (may contain :id placeholders)
  module: "sales",                    // module grouping
  tier: "list",                       // tier: "crud" | "list" | "workflow"
  threshold: { p95: 500, p99: 1000 }, // per-tier defaults, overridable per-endpoint
  authenticated: true,                // requires auth?
}
```

- Three tiers: `crud` (single-entity GET/POST/PATCH, p95<200ms), `list` (paginated collection, p95<500ms), `workflow` (multi-step E2E, p95<1000ms)
- Every endpoint in `AUTH_ENDPOINTS` from config.js gets an entry
- E2E workflows (revenue-cycle, purchase-cycle, journal-entry, attendance-checkin) get `tier: "workflow"`
- Adding a new endpoint = one object in the registry array
- Registry exports a function `getTaggedParams(name)` that returns k6 request params with `{endpoint, module, tier}` tags pre-applied

### Module 2: Endpoint Profiler Test (`k6/tests/endpoint-profiler.js`)

The main test entry point:

- Uses a single `ramping-vus` executor: 1→10→25→50 VUs over ~10 minutes
- `setup()` authenticates with multi-tenant credentials and creates missing test data (products, customers, suppliers, COA entries)
- Each VU iteration hits ALL registered endpoints (per-module API lists + E2E workflows) in sequence
- Every `http.get/post/patch/delete` call is tagged with `{endpoint: name, module: module, tier: tier}`
- Uses `authGet/authPost/authPatch` from existing auth-helper.js
- Thresholds configured per-tier using k6's sub-metric filtering:
  ```javascript
  thresholds: {
    'http_req_duration{tier:crud}': ['p95<200'],
    'http_req_duration{tier:list}': ['p95<500'],
    'http_req_duration{tier:workflow}': ['p95<1000'],
    'http_req_failed': ['rate<0.01'],
  }
  ```
- Environment variables: `BASE_URL` (default: localhost:8081), `PROFILER_VUS` (default: 50), `PROFILER_DURATION` (default: 10m), `RELAXED` (disable strict thresholds)

### Module 3: Report Analyzer (`k6/scripts/analyze-report.js`)

Node.js script (not k6 — uses `fs` and `readline`):

- Reads k6 JSON output (`--out json=results.json`)
- Groups `http_req_duration` `Point` entries by `{endpoint, module, tier}` tags
- Computes p50/p95/p99, error rate, and req/s per endpoint
- Flags each endpoint with severity: 🟢 (within threshold), 🟡 (within 2x threshold), 🔴 (exceeds 2x threshold)
- Outputs:
  1. **Terminal table**: sorted by p95 descending, with emoji flags, grouped by module
  2. **JSON report file**: `results-analyzed.json` with all computed metrics for diffing
- Tier threshold defaults (overridable via CLI flags):
  - `crud`: p95 < 200ms
  - `list`: p95 < 500ms
  - `workflow`: p95 < 1000ms

### Module 4: Config Extension (`k6/config.js`)

Extend existing `config.js` with:

- `PROFILER_THRESHOLDS` object mapping tier names to threshold configs
- `PROFILER_WORKLOAD` object with the ramping profile config
- `PROFILER_VUS` and `PROFILER_DURATION` env var overrides
- Endpoint registry import and `getTaggedParams` export

### Reuse of Existing Modules

| Existing Module | Reuse |
|---|---|
| `auth-helper.js` | `getAuthToken()`, `authGet()`, `authPost()`, `authPatch()` — all profiler requests use these |
| `config.js` | `BASE_URL`, `API_V1`, `AUTH_ENDPOINTS`, `CREDENTIALS` — extended with profiler-specific config |
| `data/multi-tenant-credentials.js` | `getCredentialForVU()` — VU-round-robin multi-tenant auth |
| `data/product-fixtures.js` | `generateProductCode()`, `generateProductName()` — for setup data creation |
| `lib/helpers.js` | `parseBody()`, `firstItem()`, `isoDate()`, `requiredId()` — for response parsing |
| `lib/error-handler.js` | `ErrorHandler` class — for aggregating errors |
| `lib/metrics.js` | Custom business KPIs — `recordWorkflowDuration()`, `recordModuleLatency()` |
| `lib/api-client.js` | `GIMSClient` class — for typed API calls |
| `scenarios/apis/*` | All per-module API functions (list, create, update) — called by the profiler per VU |
| `scenarios/e2e/*` | E2E workflow functions — called by the profiler per VU |

### Authentication Flow

- Each VU authenticates via `getAuthToken(getCredentialForVU(__VU))`
- Token cached per VU across iterations (existing `tokenCache` in auth-helper.js)
- Round-robin across 4 tenants (admin, finance, sales, warehouse)
- CSRF token fetched once per login, reused for all POST/PATCH/DELETE

### Test Data Strategy

- `setup()` calls existing API functions to look up required IDs (products, customers, warehouses, suppliers, COA, employees)
- If IDs not found (empty DB), `setup()` creates minimum viable test data
- IDs shared across VUs via k6's `SharedArray` mechanism
- `teardown()` does NOT delete data (profiler is non-destructive, test data is idempotent)

### Output and Reporting

```bash
# Run profiler
k6 run --out json=k6/reports/profiler-$(date +%Y%m%d-%H%M%S).json k6/tests/endpoint-profiler.js

# Analyze results
node k6/scripts/analyze-report.js k6/reports/profiler-latest.json
```

Terminal output example:
```
╔══════════════════════════════════════════════════════════════════════╗
║  GIMS ERP Endpoint Profiler Report                                  ║
║  Run: 2026-05-18T01:30:00Z | VUs: 1→50 | Duration: 10m             ║
╠══════════════════════════════════════════════════════════════════════╣
║ Module   | Endpoint               | Tier     | p50  | p95  | p99  | Err% | req/s ║
║──────────|─────────────────────────|──────────|──────|──────|──────|─────|──────║
║ 🟢 finance | chart-of-accounts:list | list    | 45ms | 120ms | 280ms | 0.0% | 12.4 ║
║ 🟡 sales   | sales-quotations:create| crud    | 80ms | 350ms | 890ms | 0.2% |  8.1 ║
║ 🔴 hrd     | attendance:clock-in    | crud    | 150ms| 980ms | 2400ms| 1.5% |  5.2 ║
╚══════════════════════════════════════════════════════════════════════╝
```

JSON report: `profiler-latest-analyzed.json` with full metric breakdown per endpoint.

## Testing Decisions

### What makes a good test for this feature

- **Profiling test passes** if k6 can run the endpoint-profiler.js without syntax errors and produce JSON output (`--out json`).
- **Report analyzer passes** if `analyze-report.js` can parse the JSON output and produce both terminal and JSON report.
- **Dry-run validation**: `k6 run --dry-run k6/tests/endpoint-profiler.js` should succeed even with backend down (validates script syntax and import resolution).
- **Threshold enforcement**: k6's built-in threshold system validates per-tier thresholds. If any tier exceeds its p95 threshold, the test exits with non-zero code — suitable for CI.
- Tests should NOT require a running backend for syntax validation (dry-run mode).

### Which modules will be tested

1. **`k6/lib/endpoint-registry.js`** — unit test: verify all endpoints have required fields (name, method, path, module, tier), no duplicates, thresholds match tier defaults.
2. **`k6/tests/endpoint-profiler.js`** — integration test: dry-run validates syntax; live run validates endpoint coverage and threshold enforcement.
3. **`k6/scripts/analyze-report.js`** — unit test: parse a fixture JSON file, assert correct p50/p95/p99 computation, correct 🟢🟡🔴 flagging.

### Prior art in the codebase

- `k6/tests/smoke-test.js` — minimally validates auth + basic endpoints
- `k6/tests/load-test.js` — existing ramping-VU pattern
- `k6/tests/stress-test.js` — existing threshold pattern
- `k6/lib/metrics.js` — existing custom metric pattern
- `k6/scenarios/apis/sales.js` — pattern for per-module API functions

## Out of Scope

- **Capacity planning sweet-spot analysis** — future work after profiling data is available
- **Real-time dashboards (Grafana/InfluxDB)** — out of scope; JSON output + terminal report is sufficient
- **Automated regression detection** — comparing profiler runs over time is left for future tooling
- **CI/CD integration** — profiler can be run in CI but CI pipeline config is out of scope
- **Load testing against production** — only local and staging environments
- **Database query analysis (EXPLAIN ANALYZE)** — backend profiling is a separate concern
- **Frontend performance testing** — API-only
- **New E2E scenarios** — reuse existing revenue-cycle, purchase-cycle, journal-entry, attendance-checkin
- **WebSocket or gRPC testing** — HTTP REST API only

## Further Notes

- The profiled endpoints cover all 7 modules: Sales, Purchase, Finance, HRD, Inventory, Master Data, Public
- E2E workflows are profiled as single `workflow` tier entries (the profiler measures total iteration duration, not just individual HTTP calls within the workflow)
- The `RELAXED` env var disables strict thresholds for local development testing (sets all thresholds to `p95<5000`)
- The endpoint registry is the single source of truth — adding a new API endpoint requires adding one object to the registry, no other file changes needed
- Report analyzer supports `--thresholds` CLI flag to override tier thresholds: `node analyze-report.js results.json --thresholds crud=300,list=800,workflow=2000`
- The profiler produces two output files: k6's native JSON (detailed HTTP metrics) and the analyzed JSON (per-endpoint summary). Both should be committed to `k6/reports/` for historical comparison.