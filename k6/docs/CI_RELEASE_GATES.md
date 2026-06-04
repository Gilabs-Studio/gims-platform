# CI/Release Gate Model

## Overview

The GIMS k6 performance suite maps profiles to CI triggers so that performance checks run at the right time with the right intensity.

## Gate Matrix

| Trigger | Profiles Run | Purpose | Max Duration |
|---------|-------------|---------|--------------|
| Pull Request | `k6:validate` (inspect only) | Syntax validation, no load | 30s |
| Main Branch | `k6:smoke` | Verify deployment health | 1m |
| Nightly | `k6:load` + `k6:security` | Regression detection | 15m |
| Release Candidate | `k6:smoke` + `k6:load` + `k6:concurrency` | Full release gate | 20m |
| Weekly/Manual | `k6:stress` + `k6:spike` + `k6:soak` + `k6:breakpoint` | Capacity planning | 2h+ |

## Environment Ladder

```
┌─────────────┬──────────────────────────────────────────────────────────┐
│ Environment │ Allowed Profiles                                         │
├─────────────┼──────────────────────────────────────────────────────────┤
│ local       │ ALL profiles, relaxed thresholds, unlimited VUs          │
│ staging     │ ALL profiles, strict thresholds, max 500 VUs             │
│ production  │ smoke ONLY (unless K6_UNLOCK_PRODUCTION=true)            │
└─────────────┴──────────────────────────────────────────────────────────┘
```

## npm Scripts Reference

### Quick Commands

```bash
# Validate scripts (PR gate)
pnpm k6:validate

# Smoke test (fastest feedback)
pnpm k6:smoke

# Load test (release gate)
pnpm k6:load

# Security validation
pnpm k6:security

# Domain concurrency
pnpm k6:concurrency
```

### Full Profile List

| Script | Profile | Typical Duration | VUs |
|--------|---------|-----------------|-----|
| `k6:smoke` | Smoke | 30s | 1 |
| `k6:load` | Load | 9m | 20 |
| `k6:stress` | Stress | 14m | 100 |
| `k6:spike` | Spike | 4m | 200 |
| `k6:soak` | Soak | 60m | 30 |
| `k6:breakpoint` | Breakpoint | 13m | 300 |
| `k6:security` | Security-Negative | 2m | 10 |
| `k6:concurrency` | Domain-Concurrency | 5m | 20 |
| `k6:browser` | Browser Dashboard | 1m | 1 |
| `k6:profiler` | Endpoint Profiler | 10m | 50 |

### Environment Overrides

```bash
# Staging
pnpm k6:smoke:staging
pnpm k6:load:staging

# Production (smoke only)
pnpm k6:smoke:prod

# Custom VUs and duration
k6 run -e VUS=50 -e DURATION=15m k6/tests/load.js

# Custom base URL
k6 run -e BASE_URL=https://staging.gims.app k6/tests/smoke.js
```

## CI Integration Examples

### GitHub Actions (PR)

```yaml
- name: k6 Validate
  run: pnpm k6:validate
```

### GitHub Actions (Main Branch)

```yaml
- name: k6 Smoke
  run: pnpm k6:smoke
  env:
    BASE_URL: ${{ secrets.STAGING_URL }}
    K6_ENV: staging
    TEST_EMAIL: ${{ secrets.K6_TEST_EMAIL }}
    TEST_PASSWORD: ${{ secrets.K6_TEST_PASSWORD }}
```

### GitHub Actions (Nightly)

```yaml
- name: k6 Load + Security
  run: |
    pnpm k6:load
    pnpm k6:security
  env:
    K6_ENV: staging
    BASE_URL: ${{ secrets.STAGING_URL }}
```

### GitHub Actions (Release Candidate)

```yaml
- name: k6 Release Gate
  run: |
    pnpm k6:smoke
    pnpm k6:load
    pnpm k6:concurrency
  env:
    K6_ENV: staging
    BASE_URL: ${{ secrets.STAGING_URL }}
```

## Threshold Tiers

| Tier | p95 Target | p99 Target | Examples |
|------|-----------|-----------|----------|
| CRUD | 200ms | 500ms | GET by ID, POST create, PATCH update |
| List | 500ms | 1000ms | Paginated collections |
| Report | 2000ms | 4000ms | Heavy aggregation endpoints |
| Workflow | 1000ms | 2000ms | Multi-step E2E processes |

## Production Safety

Production runs are restricted by default:

- Only `smoke` profile is allowed
- Max 5 VUs
- No seeding, no destructive operations
- To unlock additional profiles: `K6_UNLOCK_PRODUCTION=true` (only `load` and `security-negative` can be unlocked)

## Seed Data

```bash
# Resolve test data (local/staging only)
pnpm k6:seed

# Dry run (validate resolver without writing seed-state.json)
pnpm k6:seed:dry
```

Seed state is written by `pnpm k6:seed` to `k6/data/generated/seed-state.json` for reuse and auditability. Profiles still resolve live setup data first and fail fast when required entities are missing.
