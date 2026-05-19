# Architecture

> File structure, module roles, and data flow

[← Back to README](./README.md) | [Methodology →](./METHODOLOGY.md)

---

## Directory Structure

```
k6/
├── docs/                              # 📖 Documentation
│   ├── README.md                      # Entry point, quick start
│   ├── ARCHITECTURE.md                # This file
│   ├── METHODOLOGY.md                 # Profiling approach
│   ├── SCENARIOS.md                   # API scenario docs
│   ├── WORKFLOWS.md                   # E2E workflow docs
│   ├── CONFIGURATION.md              # Config reference
│   ├── REPORTING.md                   # Report analyzer docs
│   ├── implementation journey/     # Implementation history
│   │   ├── K6_COVERAGE_GAP.md            # Coverage checklist
│   │   ├── K6_COVERAGE_PLAN.md           # Implementation plan
│   │   ├── K6_ENDPOINT_PROFILER_PRD.md   # Original PRD
│   │   └── VERIFY_RESULTS.md             # Verification results
│
├── tests/                             # 🧪 Test entry points
│   └── endpoint-profiler.js           # Main profiler (setup + default + options)
│
├── scenarios/                         # 📦 Reusable scenario modules
│   ├── apis/                          # Per-module API functions
│   │   ├── core.js                    # Payment terms, bank accounts, leave types
│   │   ├── crm.js                     # Leads, deals, contacts, activities
│   │   ├── finance.js                 # COA, journals, assets, reconciliation
│   │   ├── geographic.js              # Countries, provinces, cities
│   │   ├── hrd.js                     # Attendance, leave, evaluations, recruitment
│   │   ├── inventory.js               # Stock, movements, metrics
│   │   ├── master-data.js             # Users, roles, products, customers
│   │   ├── misc.js                    # AI, travel planner, feedback
│   │   ├── organization.js            # Companies, business units, outlets
│   │   ├── pos.js                     # POS orders, sessions, config
│   │   ├── product.js                 # Categories, brands, types, UoM
│   │   ├── public-endpoints.js        # Health, ping, version (no auth)
│   │   ├── purchase.js                # PO, GR, requisitions, invoices
│   │   ├── report.js                  # Sales overview, product analysis
│   │   ├── sales.js                   # SQ, SO, DO, invoices, payments
│   │   ├── stock-opname.js            # Physical inventory counts
│   │   └── supporting.js              # Notifications, loyalty, supplier extras
│   └── e2e/                           # End-to-end business workflows
│       ├── revenue-cycle.js           # SQ → SO → DO → Invoice → Payment
│       ├── purchase-cycle.js          # PO → Submit → Approve → GR → Confirm
│       ├── journal-entry.js           # Create → Post
│       ├── attendance-checkin.js      # Manual entry + Leave request
│       └── dashboard-overview.js      # Dashboard aggregation
│
├── lib/                               # 🔧 Shared libraries
│   ├── endpoint-registry.js           # Declarative endpoint catalog + tagging
│   ├── helpers.js                     # parseBody, isoDate, pickWorkflowTarget
│   ├── error-handler.js               # ErrorHandler class
│   └── metrics.js                     # Custom k6 metrics (recordEndpointLatency)
│
├── data/                              # 📊 Test data
│   └── multi-tenant-credentials.js   # 4 user accounts (round-robin per VU)
│
├── scripts/                           # 🛠️ Post-processing
│   └── analyze-report.js             # Node.js report analyzer
│
├── reports/                           # 📈 Generated output (gitignored)
│   ├── profiler-YYYYMMDD-HHMMSS.json # Raw k6 JSON output
│   └── profiler-*-analyzed.json      # Processed report
│
├── config.js                          # ⚙️ Shared configuration
└── auth-helper.js                     # 🔐 Authentication (CSRF + JWT)
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        endpoint-profiler.js                       │
│                                                                   │
│  setup()                                                          │
│  ├── Authenticate (auth-helper.js)                               │
│  ├── Fetch prerequisite IDs (products, customers, COA, etc.)     │
│  └── Return shared data for all VUs                              │
│                                                                   │
│  default(data)  ← runs per VU per iteration                      │
│  ├── Authenticate VU (multi-tenant-credentials.js)               │
│  ├── Call all API scenarios (scenarios/apis/*.js)                 │
│  │   └── Each call tagged via endpoint-registry.js               │
│  └── Run E2E workflows every 5th iteration (scenarios/e2e/*.js)  │
│                                                                   │
│  options                                                          │
│  └── Thresholds per tier (config.js)                             │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼  --out json=reports/profiler-*.json
┌─────────────────────────────────────────────────────────────────┐
│                      analyze-report.js                            │
│                                                                   │
│  1. Parse k6 JSON output (streaming line-by-line)                │
│  2. Group metrics by {endpoint, module, tier} tags               │
│  3. Compute p50/p95/p99, error rate, req/s per endpoint          │
│  4. Flag severity: 🟢 (ok) 🟡 (2x threshold) 🔴 (>2x)          │
│  5. Output terminal table + JSON report                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Roles

### `tests/endpoint-profiler.js`
**Role**: Test orchestrator. The single entry point that k6 executes.

- Defines k6 `options` (scenarios, thresholds)
- `setup()`: authenticates, collects prerequisite IDs for workflows
- `default()`: calls all API scenarios + E2E workflows per VU iteration
- Imports from all scenario files and wires them together

### `config.js`
**Role**: Single source of configuration.

- Base URL, credentials, API endpoint templates
- Profiler workload stages (ramping VU profile)
- Tier-based thresholds (CRUD/List/Workflow)
- RELAXED mode for local development

### `auth-helper.js`
**Role**: Authentication abstraction.

- CSRF token fetch → Login → JWT token
- Token caching per VU (avoids re-login per iteration)
- Authenticated HTTP helpers: `authGet`, `authPost`, `authPatch`, `authDelete`

### `lib/endpoint-registry.js`
**Role**: Declarative endpoint catalog.

- Every profiled endpoint defined with: name, method, path, module, tier
- `getTaggedParams(name)` returns k6 request params with tags pre-applied
- Tags enable k6's sub-metric filtering for per-tier thresholds
- Single source of truth — adding an endpoint = one object

### `scenarios/apis/*.js`
**Role**: Reusable API call functions.

- One file per module (sales.js, finance.js, crm.js, etc.)
- Each function makes one HTTP call with proper tagging
- Functions are imported by the profiler and called in sequence
- Pure GET/list operations — no side effects

### `scenarios/e2e/*.js`
**Role**: Multi-step business workflow simulation.

- Each file implements a complete business process
- Creates real data (SQ, PO, journals, etc.)
- Validates each step with k6 `check()`
- Run every 5th iteration to avoid overwhelming the DB

### `data/multi-tenant-credentials.js`
**Role**: Multi-user load distribution.

- 4 user accounts with different roles
- Round-robin assignment per VU (`getCredentialForVU(__VU)`)
- Tests permission boundaries under load

### `scripts/analyze-report.js`
**Role**: Post-processing and visualization.

- Parses k6 JSON output (streaming, handles large files)
- Computes percentiles per endpoint
- Generates terminal table with emoji severity flags
- Outputs JSON report for historical comparison

---

## Key Design Decisions

1. **Single test file** — One `endpoint-profiler.js` orchestrates everything. No need to run multiple test types for profiling.

2. **Tagged requests** — Every HTTP call carries `{endpoint, module, tier}` tags. This enables k6's built-in threshold system to enforce per-tier SLAs.

3. **Scenario separation** — API calls are in `scenarios/apis/`, workflows in `scenarios/e2e/`. The profiler imports and composes them.

4. **Registry pattern** — `endpoint-registry.js` is the single source of truth. Adding a new endpoint requires one object in the registry + one function in the scenario file.

5. **Setup/default split** — `setup()` runs once (auth + data collection), `default()` runs per VU iteration. Shared data avoids redundant API calls.

6. **Progressive load** — Ramping from 1 → 50 VUs reveals how each endpoint degrades as concurrency increases.

---

## Related Docs

- [Methodology](./METHODOLOGY.md) — How the profiling approach works
- [Scenarios](./SCENARIOS.md) — Detailed scenario file documentation
- [Configuration](./CONFIGURATION.md) — All config options explained
