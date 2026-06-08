# GIMS Context Glossary

## Sales Referral

**Sales Referral Account**:
A platform-level salesperson identity used to attribute tenant registrations to sales activity.
_Avoid_: Tenant user, customer account

Alias: sales account
Sales Referral Account email may match other platform emails; it remains a separate identity

**Referral Code**:
A salesperson-owned registration code that applies a configured discount and attributes the new tenant to a sales referral account.
_Avoid_: Sales account, coupon owner
Alias: referral code

**Referral Campaign**:
A referral code plus its linked coupon, used as the public registration entry point.
_Avoid_: Coupon campaign, promo code

**Referral Lead**:
A registration attempt that submits a valid referral code before tenant conversion.
_Avoid_: Validation hit, code check

## Relationships

- A **Sales Referral Account** owns one or more **Referral Codes**
- A **Referral Code** belongs to exactly one **Sales Referral Account**
- A **Referral Code** resolves to exactly one **Coupon**
- An inactive **Sales Referral Account** makes its **Referral Codes** unusable
- A **Referral Code** can carry optional campaign name/description
- A **Referral Code** cannot change its linked **Coupon** or owning **Sales Referral Account** after it has usage history
- A referred **Tenant** can attribute its first paid upgrade back to the original referral
- Referral success is counted when the **Tenant** is created, not when the code is merely validated
- When a public registration code matches both a **Referral Code** and a **Coupon**, the **Referral Code** meaning wins
- Public registration codes are globally unique across **Referral Codes** and **Coupons**
- A **Referral Lead** is created when registration submits a valid referral code
- A **Referral Code** is reusable but subject to usage caps
- A **Referral Code** has its own usage caps in addition to the linked **Coupon** caps
- Referral stats track both gross and net revenue, with net revenue as primary
- Referral validation requires both **Referral Code** and linked **Coupon** to be active and valid
- Referral and coupon usage caps must both pass, and usage increments must be atomic
- Referral code API uses `registration_code`; UI label is `Referral / Discount Code`
- If both `registration_code` and legacy `coupon` are sent and differ, reject the request
- Public codes are normalized to uppercase and compared case-insensitively
- Allowed public code charset: letters, numbers, `-`, `_`

## K6 Performance Suite

Industry-grade performance testing capability for GIMS, broader than endpoint profiling. Includes smoke, load, stress, spike, soak, breakpoint, security-negative, domain-concurrency, and browser performance profiles. Existing endpoint profiler remains diagnostic/profiling tool, not sole release gate.

## K6 Environment Ladder

Execution model for k6 across local, staging, and production. Local allows relaxed thresholds and destructive tests against seeded data. Staging is primary release gate with strict thresholds and isolated realistic data. Production is smoke-only by default, read-only or safe low-volume checks, with destructive or high-load profiles blocked unless explicitly unlocked.

## K6 Seed Data

Versioned, reproducible test data used by k6 profiles. Seed data is created through idempotent API calls in local and staging, then resolved identifiers are stored for k6 setup. Production seed creation is forbidden.

## K6 SLO Model

Profile-specific pass/fail expectations for performance tests. Smoke requires zero errors and full check success. Load gates CRUD, list, report, and workflow latency plus error rate. Stress finds breaking point while requiring graceful degradation and no data corruption. Spike requires recovery after burst. Soak requires stable latency and resource usage over time. Security-negative requires invalid auth, CSRF, IDOR, and abuse cases to be rejected consistently.

## K6 Delivery Gate

Performance delivery gate based on npm scripts first, with CI-ready structure. Pull requests run fast validation such as script inspection, syntax checks, and seed dry-run. Main branch runs smoke. Nightly runs load and security-negative. Release candidates run smoke, load, and domain-concurrency. Stress, spike, soak, and breakpoint run weekly or manually against stable non-production environments.

## K6 Domain Risk Priority

Implementation order for industry-grade k6 coverage. First priority is auth and security, including login, CSRF, refresh, rate limiting, and tenant isolation. Second priority is POS, finance, and HRD concurrency. Third priority is inventory, sales, and purchase workflows. Fourth priority is reports, browser performance, soak, and breakpoint testing.

## K6 Implementation Approach

Documentation-first implementation approach for the full k6 suite. Planning documents define industry-standard profiles, environment safety, seed data, thresholds, and CI release gates before code changes. Implementation then adds profile scripts, environment guards, threshold helpers, test data utilities, seed scripts, and package scripts.
