# K6 Endpoint Profiler — Documentation

> GIMS ERP Performance Profiling Suite

## Quick Links

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | File structure, module roles, data flow |
| [Methodology](./METHODOLOGY.md) | Profiling approach, tier system, thresholds |
| [Scenarios](./SCENARIOS.md) | API scenario files and endpoint coverage |
| [Workflows](./WORKFLOWS.md) | E2E business workflow documentation |
| [Configuration](./CONFIGURATION.md) | Config, credentials, environment variables |
| [Reporting](./REPORTING.md) | Analyzer, report format, interpreting results |
| [Capacity Planning](./CAPACITY_PLANNING.md) | Sweet spot analysis, VPS sizing workflow |
| [System Requirements](./SYSTEM_REQUIREMENTS.md) | Infrastructure specs, cost, scaling triggers |
| [Optimization Solutions](./OPTIMIZATION_SOLUTIONS.md) | Performance fixes for slow endpoints |
| [Coverage Gap](./implementation%20journey/K6_COVERAGE_GAP.md) | Module-by-module coverage checklist |
| [Coverage Plan](./implementation%20journey/K6_COVERAGE_PLAN.md) | Implementation plan and performance results |
| [PRD](./implementation%20journey/K6_ENDPOINT_PROFILER_PRD.md) | Original product requirements document |

---

## Big Picture

### The Problem

GIMS ERP has 29 modules with 133+ API endpoints. Without systematic profiling, there's no way to know:
- Which endpoints are slow
- Which degrade under load
- Which modules have the worst performance characteristics

### The Solution

A **single ramping endpoint profiler** that:
1. Hits every GIMS API endpoint with tagged requests
2. Collects per-endpoint latency (p50/p95/p99), error rate, and throughput
3. Produces a ranked report flagging slow endpoints with severity indicators
4. Runs E2E business workflows to measure real-world transaction performance

### Goals

1. **Per-endpoint visibility** — Know exactly which endpoints are slow and how they degrade as load increases
2. **Tier-based severity** — Classify endpoints by expected complexity (CRUD < 200ms, List < 500ms, Workflow < 1000ms) and flag violations
3. **Module-level attribution** — Identify which module has the most performance problems
4. **Single-command profiling** — One `k6 run` produces a complete performance profile
5. **Reproducible results** — Configurable VUs, duration, and seeded data for apples-to-apples comparison

### What It Covers

- **~140 endpoints** across **24 modules**
- **5 E2E workflows**: Revenue Cycle, Purchase Cycle, Journal Entry, Attendance, Leave Request
- **Multi-tenant authentication**: 4 user roles (admin, manager, staff, viewer)
- **Progressive load**: 1 → 10 → 25 → 50 VUs over 12.5 minutes

---

## Getting Started

### Run the Profiler

```bash
# Full profiler (50 VUs, 12.5 min)
k6 run --out json=k6/reports/profiler-$(date +%Y%m%d-%H%M%S).json k6/tests/endpoint-profiler.js

# Reduced load for local dev
k6 run -e PROFILER_VUS=10 -e RELAXED=1 k6/tests/endpoint-profiler.js

# Quick validation (5 iterations)
k6 run -e PROFILER_VUS=2 --duration 30s --iterations 5 k6/tests/endpoint-profiler.js

# Stress test (100 VUs)
k6 run -e PROFILER_VUS=100 --out json=k6/reports/profiler-stress.json k6/tests/endpoint-profiler.js
```

### Analyze Results

```bash
# Auto-detect latest report
pnpm k6:analyze

# Specific report
pnpm k6:analyze k6/reports/profiler-20260519-034300.json

# Custom thresholds
pnpm k6:analyze k6/reports/profiler-latest.json --thresholds crud=300,list=800,workflow=2000
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:8081` | Backend URL |
| `PROFILER_VUS` | `50` | Max concurrent virtual users |
| `PROFILER_DURATION` | `10m` | Test duration |
| `RELAXED` | `0` | Set to `1` to loosen all thresholds |
| `SEED_DEFAULT_PASSWORD` | `admin123` | Test account password |

---

## Architecture Overview

```
k6/
├── docs/                          # Documentation
├── tests/                         # Test entry points
│   └── endpoint-profiler.js       # Main profiler test
├── scenarios/                     # Reusable API scenarios
│   ├── apis/                      # Per-module GET/list functions
│   └── e2e/                       # End-to-end business workflows
├── lib/                           # Shared libraries
│   ├── endpoint-registry.js       # Declarative endpoint catalog
│   ├── helpers.js                 # Utility functions
│   ├── error-handler.js           # Error aggregation
│   └── metrics.js                 # Custom k6 metrics
├── data/                          # Test data & credentials
│   └── multi-tenant-credentials.js
├── scripts/                       # Post-processing scripts
│   └── analyze-report.js          # Report analyzer (Node.js)
├── reports/                       # Generated reports (JSON)
├── config.js                      # Shared configuration
└── auth-helper.js                 # Authentication helper
```

See [Architecture](./ARCHITECTURE.md) for detailed file documentation.
