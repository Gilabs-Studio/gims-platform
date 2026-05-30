# ADR 0001: Adopt Industry-Grade k6 Performance Suite

## Status

Accepted

## Context

GIMS already has a k6 endpoint profiler that exercises many API endpoints and produces latency reports. That profiler is useful for diagnostics, but it does not fully cover industry-standard performance engineering needs such as environment safety, reproducible seed data, release gates, spike testing, soak testing, breakpoint testing, browser performance, or negative security-performance scenarios.

The project has cross-cutting risks that performance tests must protect:

- JWT and CSRF authentication flows
- Redis-backed public endpoint rate limiting
- multi-tenant isolation and IDOR prevention
- HRD attendance and timezone-sensitive flows
- finance and inventory concurrency with row-level locking
- POS payment/order bursts
- dashboard and report read latency

## Decision

Adopt a full k6 performance suite for GIMS.

The existing endpoint profiler remains a diagnostic tool, not the only release gate.

The suite will include:

- smoke profile
- load profile
- stress profile
- spike profile
- soak profile
- breakpoint profile
- security-negative profile
- domain-concurrency profile
- browser-dashboard profile

The suite will use a local/staging/production environment ladder:

- local: relaxed thresholds, seeded data, destructive tests allowed
- staging: strict thresholds, realistic isolated data, primary release gate
- production: smoke-only by default, read-only or safe low-volume checks, destructive and high-load profiles blocked unless explicitly unlocked

The suite will use idempotent API-based seed data creation for local and staging. Production seed creation is forbidden.

Delivery gates will be npm-script-first and CI-ready:

- pull requests: inspect/syntax/seed dry-run only
- main branch: smoke
- nightly: load and security-negative
- release candidate: smoke, load, and domain-concurrency
- weekly/manual: stress, spike, soak, and breakpoint

## Consequences

Benefits:

- reproducible performance results
- safer production behavior
- clearer pass/fail criteria
- stronger coverage of auth, CSRF, rate limit, tenant isolation, and domain concurrency
- better capacity planning and release confidence

Costs:

- more scripts and docs to maintain
- seed data must stay aligned with API changes
- staging environment must be stable enough for meaningful results
- long-running profiles require scheduling and report storage

## Alternatives Considered

### Keep endpoint profiler only

Rejected. Endpoint profiling gives useful latency visibility but misses release gates, soak/spike behavior, negative security scenarios, and environment safety.

### Use direct SQL seed data

Rejected for default path. SQL seeding is faster but bypasses API validation and domain rules. API-based seeding better reflects real workflows. Direct SQL may still be used later for large-volume synthetic data if documented separately.

### Run all profiles in CI on every PR

Rejected. Full performance runs are too slow, expensive, and flaky for every pull request. Fast validation belongs in PR; heavier profiles belong in main, nightly, release, weekly, or manual gates.
