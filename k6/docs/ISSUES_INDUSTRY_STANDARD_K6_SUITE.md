# Issue Drafts: Industry-Standard k6 Performance Suite

These issue drafts are approved from the k6 PRD breakdown. No issue tracker is configured in this environment, so they are written here for later publishing with the `ready-for-agent` triage label.

## Issue 1: Add k6 environment safety guard

## What to build

Add a reusable environment safety guard that all k6 profiles can use to decide whether the current target permits read-only checks, seed creation, destructive writes, high-load execution, browser execution, or production execution. The guard must make production safe by default and provide actionable errors when a profile is blocked.

## Acceptance criteria

- [ ] Local, staging, and production environments are detected consistently.
- [ ] Production blocks seed creation, destructive writes, and high-load profiles by default.
- [ ] Explicit unlock is supported for high-load production execution.
- [ ] Blocked runs fail with actionable error messages.
- [ ] Guard can be reused by smoke, load, security-negative, domain-concurrency, browser, and capacity profiles.

## Blocked by

None - can start immediately

---

## Issue 2: Add centralized k6 thresholds

## What to build

Add a reusable threshold module that provides profile-specific k6 options and pass/fail thresholds for smoke, load, stress, spike, soak, breakpoint, security-negative, domain-concurrency, and browser-dashboard profiles.

## Acceptance criteria

- [ ] Smoke threshold requires zero request failures and full check success.
- [ ] Load thresholds include CRUD, list, report, and workflow latency tiers.
- [ ] Stress and breakpoint profiles are represented as diagnostic/capacity configurations.
- [ ] Spike and soak stability expectations are represented in reusable profile configuration.
- [ ] Profiles can import threshold definitions without duplicating threshold policy.

## Blocked by

None - can start immediately

---

## Issue 3: Add idempotent seed-state foundation

## What to build

Add the foundation for reproducible k6 seed data in local and staging. The seed system should support dry-run validation, forbid production seed creation, and expose generated seed-state loading/validation for profile setup.

## Acceptance criteria

- [ ] Production seed creation is blocked by the environment guard.
- [ ] Seed dry-run validates required environment variables without mutating data.
- [ ] Seed-state loader validates required keys and produces clear errors for missing data.
- [ ] Generated seed-state can be consumed by k6 setup and reusable scenarios.
- [ ] Critical profiles fail fast when required seed data is missing.

## Blocked by

- Issue 1

---

## Issue 4: Add smoke profile as first release gate

## What to build

Add a production-safe smoke profile that verifies core GIMS API availability through health/auth/dashboard-style behavior. The profile must be safe for local, staging, and production, and must fail on any request error.

## Acceptance criteria

- [ ] Smoke profile passes k6 inspection.
- [ ] Smoke profile uses the environment safety guard.
- [ ] Smoke profile uses centralized smoke thresholds.
- [ ] Smoke flow verifies CSRF acquisition and authenticated access.
- [ ] npm script exists for smoke execution.
- [ ] Production execution remains low-volume and non-destructive.

## Blocked by

- Issue 1
- Issue 2

---

## Issue 5: Add load profile using existing endpoint scenarios

## What to build

Add an expected-traffic load profile that composes existing API and E2E scenarios with seed-state validation. The profile should emit tagged metrics and act as a staging release gate.

## Acceptance criteria

- [ ] Load profile passes k6 inspection.
- [ ] Load profile uses environment guard, centralized thresholds, and seed-state validation.
- [ ] Metrics are tagged by module, endpoint, tier, and scenario where available.
- [ ] CRUD, list, report, and workflow thresholds are applied.
- [ ] Report output is written for later analysis.
- [ ] npm script exists for load execution.

## Blocked by

- Issue 1
- Issue 2
- Issue 3

---

## Issue 6: Add security-negative profile

## What to build

Add a security-negative profile that verifies expected rejection behavior under load for missing authentication, invalid or missing CSRF, cross-tenant access attempts, and public endpoint abuse triggering rate limits.

## Acceptance criteria

- [ ] Missing authentication is rejected consistently.
- [ ] Invalid or missing CSRF token is rejected consistently on mutation endpoints.
- [ ] Cross-tenant access attempts are rejected consistently.
- [ ] Public endpoint abuse triggers expected rate limiting behavior.
- [ ] Profile is blocked from destructive/high-load production execution by default.
- [ ] npm script exists for security-negative execution.

## Blocked by

- Issue 1
- Issue 2
- Issue 3

---

## Issue 7: Add HRD attendance concurrency profile

## What to build

Add a domain-concurrency slice for HRD attendance and leave behavior. The profile must exercise rush-period check-in/check-out behavior, leave request/approval, and timezone-sensitive prerequisites using seeded employee data.

## Acceptance criteria

- [ ] Attendance check-in/check-out rush scenario exists.
- [ ] Scenario validates no duplicate successful attendance for the same employee/time window through external behavior.
- [ ] Leave request/approval path is covered under load.
- [ ] Timezone-sensitive setup is documented and validated through seed-state requirements.
- [ ] HRD scenario metrics are tagged separately.

## Blocked by

- Issue 1
- Issue 2
- Issue 3

---

## Issue 8: Add finance posting concurrency profile

## What to build

Add a domain-concurrency slice for finance workflows that covers journal creation, submission, approval, payment/posting contention, and expected conflict behavior using seeded finance prerequisites.

## Acceptance criteria

- [ ] Journal create/submit/approve concurrency is covered.
- [ ] Finance posting contention is covered.
- [ ] Double-post prevention is validated through external behavior.
- [ ] Expected lock/conflict behavior is treated as pass where correct.
- [ ] Finance scenario metrics are tagged separately.

## Blocked by

- Issue 1
- Issue 2
- Issue 3

---

## Issue 9: Add POS order/payment burst profile

## What to build

Add a POS order/payment burst profile that safely tests peak POS behavior without real external payment side effects. This slice requires a human decision on payment mock/safe path and public POS authentication strategy before implementation.

## Acceptance criteria

- [ ] POS authentication mode is documented.
- [ ] Payment mock or safe payment path is chosen and documented.
- [ ] POS order burst scenario exists.
- [ ] POS payment path is exercised safely without real payment side effects.
- [ ] POS scenario metrics are tagged separately.

## Blocked by

- Issue 1
- Issue 2
- Issue 3

---

## Issue 10: Add inventory, sales, and purchase workflow concurrency

## What to build

Add workflow/concurrency coverage for inventory, sales, and purchase after the foundational load and high-risk domain-concurrency profiles are stable. This should cover stock movement/opname, sales revenue cycle, and purchase cycle behavior under load.

## Acceptance criteria

- [ ] Inventory stock movement or stock opname contention is covered.
- [ ] Sales revenue cycle is covered under load.
- [ ] Purchase cycle is covered under load.
- [ ] Workflow failures produce actionable errors.
- [ ] Metrics are tagged by domain workflow.

## Blocked by

- Issue 5
- Issue 7
- Issue 8

---

## Issue 11: Add spike, stress, and breakpoint profiles

## What to build

Add capacity-oriented profiles for sudden bursts, progressive overload, and capacity-ceiling discovery. These profiles should reuse load/security foundations and remain blocked from production by default.

## Acceptance criteria

- [ ] Spike profile exists and models sudden traffic burst plus recovery.
- [ ] Stress profile exists and models progressive overload.
- [ ] Breakpoint profile exists and discovers failure threshold/capacity ceiling.
- [ ] Profiles use environment guard and centralized thresholds/options.
- [ ] Production execution is blocked by default.
- [ ] npm scripts exist for spike, stress, and breakpoint execution.

## Blocked by

- Issue 5
- Issue 6

---

## Issue 12: Add soak profile

## What to build

Add a long-running soak profile that validates stability over time using representative workflows. The profile should track latency drift, error rate, and report output for manual review.

## Acceptance criteria

- [ ] Soak profile exists with configurable duration.
- [ ] Soak profile uses environment guard and centralized thresholds/options.
- [ ] p95 drift expectation is documented.
- [ ] Error-rate threshold is applied.
- [ ] Report output is generated for later analysis.
- [ ] npm script exists for soak execution.

## Blocked by

- Issue 5
- Issue 10

---

## Issue 13: Add browser dashboard profile

## What to build

Add a k6 browser profile that opens the GIMS dashboard and records user-visible dashboard loading behavior. This slice requires a human decision on local/staging target URL, authentication method, and browser runtime availability.

## Acceptance criteria

- [ ] Dashboard target URL strategy is documented.
- [ ] Browser authentication approach is documented.
- [ ] Browser profile opens dashboard and performs visible load checks.
- [ ] Browser profile uses environment guard and centralized thresholds/options.
- [ ] npm script exists for browser-dashboard execution.

## Blocked by

- Issue 1
- Issue 2
- Issue 4

---

## Issue 14: Add CI/release gate docs and script wiring

## What to build

Add npm script wiring and documentation that maps k6 profiles to pull request, main branch, nightly, release candidate, and manual/weekly gates. This makes the suite ready for CI without requiring CI implementation in the first pass.

## Acceptance criteria

- [ ] Inspect script exists for fast profile validation.
- [ ] Seed script usage is documented.
- [ ] Smoke, load, security-negative, and domain-concurrency scripts are documented.
- [ ] Stress, spike, soak, breakpoint, and browser scripts are documented.
- [ ] Gate matrix explains PR, main, nightly, release candidate, and manual/weekly usage.
- [ ] Documentation identifies which gates should block release.

## Blocked by

- Issue 4
- Issue 5
- Issue 6

---

## Issue 15: Extend reporting for profile metadata if needed

## What to build

Keep the existing report analyzer compatible with endpoint profiler output and extend it only where new profile metadata requires grouping by profile or scenario. New reporting should remain backward-compatible and actionable.

## Acceptance criteria

- [ ] Existing profiler reports still parse.
- [ ] New profile reports include useful grouping by profile/scenario where tags exist.
- [ ] Analyzer handles missing or extra tags safely.
- [ ] Output remains actionable for slow endpoints and failing scenarios.
- [ ] Reporting docs explain how to interpret new profile metadata.

## Blocked by

- Issue 5
- Issue 6
- Issue 10
- Issue 11
