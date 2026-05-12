# GIMS k6 Benchmark Matrix

This document defines the standard benchmark process for GIMS ERP.

## Objective

Measure throughput-at-SLO and find the first stable bottleneck without mixing functional failures into performance conclusions.

## Environment Requirements

- Run against staging or perf environment, not local dev setup.
- Use production-like DB size and tenant data distribution.
- Disable verbose debug logging during benchmark runs.
- Keep test runner and API in stable network conditions.

## SLO Targets

| Metric | Baseline/Peak Target | Stress Target |
| --- | --- | --- |
| http_req_failed | < 1% | < 1% (abort on fail) |
| http_req_duration p95 | < 500ms | < 1000ms |
| http_req_duration p99 | < 1000ms | < 2000ms |

## Execution Sequence

1. Smoke gate
2. Baseline load
3. Peak load
4. Quick stress
5. Full stress
6. Soak

## Commands

```bash
pnpm k6:smoke
pnpm k6:load:baseline
pnpm k6:load:peak
pnpm k6:stress:quick
pnpm k6:stress:full
pnpm k6:soak
```

## Pass/Fail Rules

- Smoke must pass before any other run.
- Baseline load is release-blocking.
- For full stress, capture the first point where SLO fails and record stable pre-failure capacity.
- Soak must show no progressive degradation:
  - rising latency trend
  - growing error trend
  - connection pool instability

## Reporting Template

Record each run with:

- Environment and commit SHA
- Command used
- Key metrics:
  - http_req_failed
  - p95 and p99 latency
  - total requests and throughput
  - max stable VUs before degradation
- Primary failing endpoint tags (if any)
- DB/infra observations (CPU, memory, connections, lock waits)

## Known Caveats

- Exclude unstable known-bug endpoints from release gates until fixed.
- Keep endpoint registry in k6 config aligned with backend route groups to avoid false failures.
