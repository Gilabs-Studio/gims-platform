# GIMS k6 Industry-Standard Performance Suite Plan

## Status

Accepted plan. Implementation pending.

See also: `docs/adr/0001-adopt-industry-grade-k6-performance-suite.md`.

## Purpose

GIMS already has an endpoint profiler. This plan upgrades k6 from endpoint profiling into a full performance engineering suite for release confidence, security-performance validation, concurrency risk discovery, and capacity planning.

## Current Baseline

Existing assets:

- `k6/tests/endpoint-profiler.js`
- `k6/scenarios/apis/*`
- `k6/scenarios/e2e/*`
- `k6/auth-helper.js`
- `k6/config.js`
- `k6/lib/*`
- `k6/scripts/analyze-report.js`
- npm scripts: `k6:profiler`, `k6:profiler:local`, `k6:analyze`

Known gaps:

- backend-down verification produced no meaningful performance baseline
- setup data can resolve to `SETUP_MISSING`
- empty DB can skip E2E workflows
- no dedicated rate-limit abuse scenario
- no dedicated CSRF negative scenario
- no dedicated IDOR / tenant-isolation negative scenario
- no explicit spike profile
- no explicit soak profile
- no breakpoint capacity profile
- no k6 browser profile for Next.js dashboard
- no production safety guard for destructive/high-load profiles
- no complete release gate model

## Target Suite

| Profile | Purpose | Target Environment | Release Role |
|---|---|---|---|
| Smoke | verify API alive and core auth/dashboard works | local, staging, production | main branch + production sanity |
| Load | validate expected traffic within SLO | staging | release gate |
| Stress | push beyond expected traffic | staging | manual/weekly diagnostic |
| Spike | sudden burst and recovery | staging | manual/weekly diagnostic |
| Soak | long-running stability | staging | weekly/manual |
| Breakpoint | find capacity ceiling | staging | capacity planning |
| Security-negative | validate abuse rejection under load | staging | nightly gate |
| Domain-concurrency | validate high-risk business race conditions | staging | release candidate gate |
| Browser-dashboard | validate frontend dashboard loading behavior | local, staging | UX performance signal |

## Environment Ladder

### Local

Allowed:

- relaxed thresholds
- destructive writes
- seed creation
- short runs

Use for developer feedback and script validation.

### Staging

Allowed:

- strict thresholds
- destructive writes only against isolated test tenants/data
- seed creation
- full profile suite

Use as primary release gate and baseline source.

### Production

Allowed by default:

- smoke-only
- low VUs
- read-only or safe checks

Blocked by default:

- seed creation
- destructive writes
- load/stress/spike/soak/breakpoint/domain-concurrency

High-load production execution requires explicit unlock, for example `ALLOW_PROD_LOAD=1`, and must remain opt-in.

## Seed Data Strategy

Use idempotent API-based seed creation for local and staging.

Required seeded entities:

- companies / tenants
- users and roles
- employees
- customers
- suppliers
- products
- warehouses
- chart of accounts
- POS store / terminal prerequisites
- HRD shift / attendance prerequisites
- finance posting prerequisites
- inventory stock prerequisites

Planned files:

- `k6/scripts/seed-test-data.js`
- `k6/data/seeds/*`
- `k6/data/generated/seed-state.json`
- `k6/lib/test-data.js`

Rules:

- seed script is idempotent
- seed script is environment-aware
- production seed creation is forbidden
- k6 setup must fail fast when required seed state is missing unless profile explicitly supports degraded mode
- E2E workflows must not silently skip critical paths because data is missing

## Threshold Model

### Smoke

- `http_req_failed`: `rate==0`
- checks: `rate==1`
- p95: `<500ms`

### Load

- CRUD p95: `<300ms`
- list p95: `<800ms`
- report p95: `<1500ms`
- workflow p95: `<2000ms`
- `http_req_failed`: `rate<0.01`
- p99 tracked, not phase-one gate

### Stress

- goal: identify degradation point
- no latency pass/fail by default
- must not corrupt data
- must fail gracefully with 429/503 where expected
- service must recover after run

### Spike

- p95 recovers within 2 minutes after spike
- error rate during spike `<5%`
- no stuck workers or permanent degradation

### Soak

- p95 drift `<20%`
- `http_req_failed`: `rate<0.01`
- no memory, goroutine, DB connection, or Redis connection growth trend

### Security-negative

- missing auth rejected consistently
- invalid CSRF rejected consistently
- cross-tenant access rejected consistently
- abusive public endpoint traffic reaches 429 before API/DB degradation

## Domain Risk Priority

### Phase 1 — Auth and Security Foundation

Scope:

- smoke profile
- load profile skeleton
- environment guard
- thresholds helper
- API seeder
- CSRF negative scenario
- rate-limit abuse scenario
- tenant isolation negative scenario

### Phase 2 — POS, Finance, HRD Concurrency

Scope:

- POS order/payment burst
- finance posting and approval contention
- journal entry concurrency
- HRD attendance rush
- HRD leave approval under load
- timezone-sensitive attendance checks

### Phase 3 — Inventory, Sales, Purchase Workflows

Scope:

- stock movement contention
- stock opname workflow
- sales revenue cycle
- purchase cycle
- warehouse/product contention

### Phase 4 — Reports, Browser, Capacity

Scope:

- heavy report/dashboard reads
- browser dashboard profile
- soak
- spike
- stress
- breakpoint
- capacity report

## Planned File Structure

```text
k6/
├── profiles/
│   ├── smoke.js
│   ├── load.js
│   ├── stress.js
│   ├── spike.js
│   ├── soak.js
│   ├── breakpoint.js
│   ├── security-negative.js
│   ├── domain-concurrency.js
│   └── browser-dashboard.js
├── scripts/
│   ├── seed-test-data.js
│   └── analyze-report.js
├── lib/
│   ├── environment-guard.js
│   ├── thresholds.js
│   ├── test-data.js
│   ├── api-client.js
│   ├── endpoint-registry.js
│   ├── error-handler.js
│   ├── helpers.js
│   └── metrics.js
├── data/
│   ├── seeds/
│   └── generated/
│       └── seed-state.json
└── docs/
    ├── INDUSTRY_STANDARD_PLAN.md
    ├── ENVIRONMENT_SAFETY.md
    ├── SEED_DATA_STRATEGY.md
    ├── THRESHOLDS.md
    └── CI_RELEASE_GATES.md
```

## npm Script Plan

Add scripts:

```json
{
  "k6:inspect": "k6 inspect k6/tests/endpoint-profiler.js && k6 inspect k6/profiles/smoke.js",
  "k6:seed": "node k6/scripts/seed-test-data.js",
  "k6:smoke": "k6 run k6/profiles/smoke.js",
  "k6:load": "k6 run --out json=k6/reports/load-$(date +%Y%m%d-%H%M%S).json k6/profiles/load.js",
  "k6:stress": "k6 run --out json=k6/reports/stress-$(date +%Y%m%d-%H%M%S).json k6/profiles/stress.js",
  "k6:spike": "k6 run --out json=k6/reports/spike-$(date +%Y%m%d-%H%M%S).json k6/profiles/spike.js",
  "k6:soak": "k6 run --out json=k6/reports/soak-$(date +%Y%m%d-%H%M%S).json k6/profiles/soak.js",
  "k6:breakpoint": "k6 run --out json=k6/reports/breakpoint-$(date +%Y%m%d-%H%M%S).json k6/profiles/breakpoint.js",
  "k6:security": "k6 run --out json=k6/reports/security-$(date +%Y%m%d-%H%M%S).json k6/profiles/security-negative.js",
  "k6:concurrency": "k6 run --out json=k6/reports/domain-concurrency-$(date +%Y%m%d-%H%M%S).json k6/profiles/domain-concurrency.js",
  "k6:browser": "K6_BROWSER_ENABLED=true k6 run k6/profiles/browser-dashboard.js"
}
```

## CI Gate Plan

| Trigger | k6 Action | Blocks? |
|---|---|---|
| Pull request | inspect, syntax, seed dry-run | yes |
| Main branch | smoke | yes |
| Nightly | load, security-negative | yes for nightly health |
| Release candidate | smoke, load, domain-concurrency | yes |
| Weekly/manual | stress, spike, soak, breakpoint | no by default; creates capacity report |

## Implementation Acceptance Criteria

- all new k6 profiles pass `k6 inspect`
- production guard blocks forbidden profiles by default
- seed script creates required local/staging data or fails with actionable error
- smoke passes against running local backend
- load profile emits tagged metrics by module, endpoint, tier, and scenario
- security-negative validates CSRF, auth, rate-limit, and tenant isolation rejection
- domain-concurrency covers at least HRD attendance, finance posting, and POS/payment contention
- reports are written under `k6/reports/`
- docs explain how to run each profile and interpret result

## Open Questions Before Code

- exact production hostname and staging hostname
- existing test credentials for each tenant/role
- whether a dedicated test tenant/company already exists
- whether seed APIs allow idempotent upsert by stable codes/names
- whether POS payment can be mocked without external payment provider
- whether browser profile should target web app through localhost:3000 or deployed staging URL
