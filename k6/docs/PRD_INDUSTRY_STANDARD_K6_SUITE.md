# PRD: Industry-Standard k6 Performance Suite for GIMS

## Problem Statement

GIMS needs production-grade confidence that critical ERP flows remain fast, safe, and correct under realistic traffic, abusive traffic, and domain-specific concurrency. The project already has k6 endpoint profiling that exercises many API endpoints, but endpoint profiling alone is not enough for industry-standard performance engineering.

Current gaps create release risk:

- Performance verification was previously run while the backend was unavailable, so no meaningful baseline exists.
- Test setup can resolve to missing data, causing E2E workflows to skip critical paths.
- There is no dedicated production safety model that prevents destructive or high-load tests from running against production by accident.
- There are no dedicated profiles for spike, soak, breakpoint, browser dashboard performance, security-negative behavior, or domain-concurrency risk.
- There is no full CI/release gate model that maps performance tests to pull requests, main branch, nightly checks, release candidates, and manual capacity tests.
- Security-performance concerns such as CSRF rejection, rate limiting, and tenant isolation need explicit validation under load.
- High-risk ERP flows such as POS, finance posting, HRD attendance, inventory movement, sales, purchase, reports, and dashboards need profile-specific coverage.

The desired outcome is a reliable k6 suite that can be run locally and in staging, with production smoke checks guarded by default, so GIMS teams can detect performance regressions, race conditions, security control failures, and capacity limits before users experience them.

## Solution

Build a full k6 performance suite for GIMS while keeping the existing endpoint profiler as a diagnostic tool.

The suite will provide separate profiles for smoke, load, stress, spike, soak, breakpoint, security-negative, domain-concurrency, and browser dashboard performance. Each profile will have clear environment rules, thresholds, inputs, outputs, and release-gate purpose.

The suite will use an environment ladder:

- Local runs are for developer feedback, relaxed thresholds, seeded data, and destructive test flows.
- Staging runs are the main release gate, using strict thresholds and isolated realistic seed data.
- Production runs are smoke-only by default, read-only or safe low-volume, with destructive and high-load profiles blocked unless explicitly unlocked.

The suite will include an idempotent API-based seed data system for local and staging. Seeded data will cover companies, users, roles, employees, customers, suppliers, products, warehouses, chart of accounts, POS prerequisites, HRD prerequisites, finance prerequisites, and inventory prerequisites. k6 profiles will consume resolved seed identifiers and fail fast when required data is missing instead of silently skipping critical workflows.

The suite will define profile-specific SLOs and thresholds. Smoke will require zero errors. Load will gate latency and error rate. Stress and breakpoint will find capacity limits. Spike will validate recovery. Soak will validate long-running stability. Security-negative will validate consistent rejection of invalid auth, invalid CSRF, cross-tenant access, and abuse traffic.

The suite will be npm-script-first and CI-ready. Pull requests will run fast validation only. Main branch will run smoke. Nightly runs will run load and security-negative. Release candidates will run smoke, load, and domain-concurrency. Weekly or manual runs will run stress, spike, soak, and breakpoint.

## User Stories

1. As a backend engineer, I want a smoke profile that verifies core API availability, so that I can quickly know whether the backend can serve authenticated traffic.
2. As a backend engineer, I want smoke checks to include CSRF acquisition and login, so that authentication regressions are caught early.
3. As a backend engineer, I want smoke checks to fail on any request error, so that broken deployments are not hidden by averages.
4. As a release manager, I want a load profile with strict thresholds, so that releases are blocked when core API latency regresses.
5. As a release manager, I want release candidate gates to include domain-concurrency scenarios, so that race-prone ERP flows are validated before production.
6. As a QA engineer, I want test data to be created idempotently through APIs, so that test runs are reproducible across local and staging.
7. As a QA engineer, I want k6 setup to fail fast when required seed data is missing, so that critical E2E flows do not silently skip.
8. As a QA engineer, I want generated seed identifiers stored for k6 runs, so that scenarios can reuse stable test entities.
9. As a DevOps engineer, I want production safeguards around k6 profiles, so that high-load or destructive scripts cannot run against production accidentally.
10. As a DevOps engineer, I want production smoke tests to remain low-volume and safe, so that production monitoring does not harm real users.
11. As a DevOps engineer, I want heavy performance profiles to run only in staging unless explicitly unlocked, so that test traffic is controlled.
12. As a platform owner, I want an environment ladder for local, staging, and production, so that every k6 run has clear safety rules.
13. As a platform owner, I want npm scripts for all k6 profiles, so that developers can run tests consistently without memorizing commands.
14. As a platform owner, I want CI-ready scripts, so that performance checks can be added to automation without redesigning the suite.
15. As a security engineer, I want a security-negative profile that tests missing authentication, so that unauthenticated access stays rejected under load.
16. As a security engineer, I want a security-negative profile that tests invalid CSRF tokens, so that mutation endpoints enforce CSRF protection.
17. As a security engineer, I want cross-tenant access attempts to be rejected consistently, so that IDOR risks are caught under concurrent traffic.
18. As a security engineer, I want abusive public endpoint traffic to trigger rate limiting, so that Redis-backed rate limits protect the API and database.
19. As a security engineer, I want invalid requests to produce expected rejection status codes, so that security failures are visible in reports.
20. As a performance engineer, I want endpoint metrics tagged by module, endpoint, tier, and scenario, so that reports show where bottlenecks occur.
21. As a performance engineer, I want p95 and p99 latency tracked, so that tail latency regressions are visible.
22. As a performance engineer, I want load thresholds split by CRUD, list, report, and workflow tiers, so that each endpoint class has realistic targets.
23. As a performance engineer, I want stress tests to identify graceful degradation points, so that the team knows when the system starts failing.
24. As a performance engineer, I want breakpoint tests to discover capacity ceilings, so that infrastructure planning has evidence.
25. As a performance engineer, I want spike tests to validate recovery after sudden bursts, so that event-driven traffic or peak usage does not permanently degrade the system.
26. As a performance engineer, I want soak tests to validate long-running stability, so that memory leaks, goroutine leaks, DB connection leaks, and Redis connection issues are caught.
27. As a performance engineer, I want report artifacts written after runs, so that results can be compared across time.
28. As a performance engineer, I want existing endpoint profiling preserved, so that broad endpoint latency diagnostics remain available.
29. As an HRD user, I want attendance check-in/check-out to remain correct during rush periods, so that employees are not double-checked-in or blocked incorrectly.
30. As an HRD manager, I want leave request and approval flows tested under load, so that approvals stay reliable during peak HR activity.
31. As an HRD manager, I want timezone-sensitive attendance behavior tested, so that company timezone rules remain correct under concurrent usage.
32. As a finance user, I want journal entry creation, submission, and approval tested under concurrency, so that accounting workflows remain reliable.
33. As a finance manager, I want finance posting and approval contention tested, so that row-level locking prevents double-posting and inconsistent balances.
34. As a finance manager, I want payment and reconciliation flows profiled, so that slow financial workflows are visible before release.
35. As a POS cashier, I want POS order and payment flows tested under bursts, so that sales operations keep working during peak store traffic.
36. As a POS operator, I want public POS behavior covered separately when auth differs, so that customer-facing POS routes are not ignored.
37. As an inventory user, I want stock movement and stock opname scenarios tested under concurrency, so that warehouse quantities remain consistent.
38. As an inventory manager, I want warehouse/product contention tested, so that concurrent inventory operations do not corrupt stock state.
39. As a sales user, I want quotation, order, delivery, invoice, and payment workflows tested, so that revenue-cycle performance remains visible.
40. As a purchase user, I want purchase order, approval, goods receipt, and confirmation workflows tested, so that procurement remains reliable under load.
41. As a manager, I want dashboard overview performance tested, so that common dashboard pages remain responsive.
42. As a report user, I want heavy report endpoints tested with report-tier thresholds, so that expensive reads are managed explicitly.
43. As a frontend user, I want browser dashboard performance measured, so that the Next.js dashboard experience is not assessed by API latency alone.
44. As a frontend engineer, I want browser tests to target local or staging URLs safely, so that UX performance can be measured without production risk.
45. As a developer, I want pull requests to run fast k6 validation only, so that PR feedback stays quick and non-flaky.
46. As a maintainer, I want nightly load and security-negative runs, so that regressions are detected even when they are too slow for PR checks.
47. As a release manager, I want release candidate performance gates, so that production deployment requires evidence from smoke, load, and domain-concurrency profiles.
48. As a capacity planner, I want weekly or manual stress, spike, soak, and breakpoint runs, so that capacity trends can be reviewed separately from release gates.
49. As a future agent, I want the suite documented in one PRD and related technical docs, so that implementation work can be split into safe issues.
50. As a future agent, I want deep reusable modules for guards, thresholds, test data, and reporting, so that new profiles can be added without duplicating policy logic.
51. As a future agent, I want destructive profile behavior centralized, so that every profile follows the same safety rules.
52. As a future agent, I want threshold definitions centralized, so that profile scripts remain small and consistent.
53. As a future agent, I want test data lookup centralized, so that scenarios do not each invent their own seed-state parsing.
54. As a future agent, I want scripts to produce actionable errors, so that missing environment variables or seed data can be fixed quickly.
55. As a project owner, I want a clear out-of-scope list, so that the initial suite does not expand into unrelated observability or backend feature work.

## Implementation Decisions

- Adopt a full profile-based k6 suite instead of relying only on endpoint profiling.
- Preserve the existing endpoint profiler as a diagnostic tool for broad endpoint latency visibility.
- Add a production safety model that blocks destructive and high-load profiles by default.
- Use three environment modes: local, staging, and production.
- Treat staging as the primary release gate environment.
- Treat production as smoke-only by default.
- Require explicit unlock for any high-load production execution.
- Add an idempotent API-based seed system for local and staging.
- Forbid seed creation in production.
- Store resolved seed identifiers in generated seed state for k6 setup and scenarios.
- Fail fast when required seed data is missing for a critical profile.
- Avoid silent E2E skipping for critical workflows.
- Centralize profile thresholds in a reusable threshold module.
- Centralize environment safety rules in a reusable environment guard module.
- Centralize seed-state reading and validation in a reusable test data module.
- Keep existing auth helper behavior for CSRF and JWT flows, extending it only where needed.
- Add smoke, load, stress, spike, soak, breakpoint, security-negative, domain-concurrency, and browser-dashboard profiles.
- Make profile scripts small orchestrators that compose reusable scenarios and shared modules.
- Keep current API and E2E scenarios as reusable scenario building blocks where possible.
- Add dedicated security-negative scenarios for missing auth, invalid CSRF, tenant isolation, and public endpoint rate-limit abuse.
- Add dedicated domain-concurrency scenarios for HRD attendance, finance posting, and POS/payment contention first.
- Add inventory, sales, purchase, reports, browser, soak, spike, stress, and breakpoint coverage after auth/security and high-risk concurrency are stable.
- Add npm scripts for inspect, seed, smoke, load, stress, spike, soak, breakpoint, security-negative, domain-concurrency, and browser-dashboard runs.
- Use npm-script-first automation so CI can call stable commands without understanding k6 internals.
- Map CI gates by trigger: pull request gets fast validation, main gets smoke, nightly gets load plus security-negative, release candidate gets smoke plus load plus domain-concurrency, weekly/manual gets stress/spike/soak/breakpoint.
- Emit reports to the existing reports location and keep analyzer compatibility where possible.
- Use module, endpoint, tier, and scenario tagging for performance metrics.
- Track p95 and p99, but gate phase one primarily on p95 and error rate.
- Use CRUD, list, report, and workflow threshold tiers for load testing.
- Treat stress and breakpoint as diagnostic/capacity profiles rather than normal release gates.
- Treat spike recovery and soak drift as stability signals.
- Respect existing GIMS security baseline: HttpOnly JWT cookies, split access/refresh secrets, CSRF double-submit cookie, Redis-backed public endpoint rate limiting, ownership validation, and row-level locking for concurrent mutations.
- Respect HRD timezone rules when designing attendance and leave scenarios.
- Do not introduce backend schema changes as part of the initial k6 suite unless seed APIs prove impossible to use idempotently.

### Deep Modules to Build or Modify

- Environment guard module: exposes a small interface that tells profiles whether the current target environment permits read-only, destructive, seed, high-load, browser, or production execution.
- Threshold module: exposes profile-specific k6 options and thresholds for smoke, load, stress, spike, soak, breakpoint, security-negative, domain-concurrency, and browser-dashboard.
- Test data module: exposes seed-state loading, required entity validation, and helper accessors for seeded tenants, users, products, warehouses, employees, accounts, stores, and workflow prerequisites.
- Seed script module: creates or resolves required seed data through APIs in an idempotent way for local and staging.
- Profile orchestrators: thin k6 entry points that select options, enforce environment guard, load test data, and call reusable scenarios.
- Security-negative scenarios: reusable scenario functions that validate expected rejection behavior for auth, CSRF, tenant isolation, and rate limiting.
- Domain-concurrency scenarios: reusable scenario functions for HRD attendance, finance posting, POS/payment, inventory, sales, and purchase contention.
- Reporting integration: keep existing report analyzer and extend only if new profile metadata requires it.

## Testing Decisions

- Tests should validate external behavior rather than internal implementation details.
- k6 script validation should use `k6 inspect` for profiles and current profiler entry points.
- JavaScript syntax validation should be part of fast PR checks where possible.
- Seed dry-run should validate required environment variables and planned actions without mutating production.
- Environment guard should be tested with combinations of local, staging, production, destructive, seed, high-load, and explicit unlock settings.
- Threshold module should be tested by checking generated k6 options for each profile.
- Test data module should be tested by loading valid seed state, missing seed state, and partial seed state.
- Seed script should be tested against local/staging APIs for idempotency: second run must reuse or update the same logical data rather than creating conflicting duplicates.
- Smoke profile should be tested against a running local backend and must fail on any request error.
- Security-negative profile should validate external rejection behavior: missing auth, invalid CSRF, cross-tenant access, and rate-limit abuse.
- Domain-concurrency profile should validate external business invariants, not database internals: no duplicate attendance, no double-posting, no inconsistent stock, expected rejection or graceful degradation on conflicts.
- Browser-dashboard profile should validate user-visible dashboard loading behavior where k6 browser support is available.
- Existing prior art includes current k6 auth helper, endpoint profiler, API scenarios, E2E scenarios, endpoint registry, metrics helper, error handler, and report analyzer.
- Backend unit tests or integration tests are out of scope unless the k6 suite exposes missing idempotent APIs or correctness bugs that need backend fixes.

## Out of Scope

- Replacing the existing endpoint profiler.
- Running destructive or high-load profiles against production by default.
- Building a full observability platform.
- Adding Prometheus, Grafana, OpenTelemetry, or APM dashboards as part of the first implementation.
- Creating backend business features unrelated to test setup.
- Changing database schemas unless required seed data cannot be created through existing APIs.
- Guaranteeing exact production capacity numbers from local runs.
- Making every skipped router load-tested when it is intentionally unsuitable, internal-only, streaming-only, or requires different auth mechanics.
- Running full load, stress, spike, soak, and breakpoint profiles on every pull request.
- Solving external payment provider behavior beyond safe POS/payment test strategy or mocking where available.

## Further Notes

ADR accepted: adopt industry-grade k6 suite and keep endpoint profiler as diagnostic.

Current plan doc: `k6/docs/INDUSTRY_STANDARD_PLAN.md`.

Current glossary decisions: `CONTEXT.md`.

Known open questions before implementation:

- exact staging and production hostnames
- available test credentials for each tenant and role
- whether a dedicated test tenant/company already exists
- whether seed APIs support stable idempotent lookup by codes or names
- whether POS payment can be mocked without external payment provider calls
- whether browser profile should target local web app, deployed staging web app, or both

Suggested issue breakdown:

1. Add k6 environment guard and threshold modules.
2. Add idempotent API seed script and seed-state helpers.
3. Add smoke and load profiles with npm scripts.
4. Add security-negative profile for auth, CSRF, rate limit, and tenant isolation.
5. Add domain-concurrency profile for HRD attendance, finance posting, and POS/payment.
6. Add inventory, sales, and purchase concurrency/workflow coverage.
7. Add stress, spike, soak, and breakpoint profiles.
8. Add browser-dashboard profile.
9. Add CI/release gate docs and script validation.
10. Extend reporting if new profile metadata requires analyzer changes.
