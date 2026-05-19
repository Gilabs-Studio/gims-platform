# Methodology

> Profiling approach, tier system, and threshold logic

[← Architecture](./ARCHITECTURE.md) | [Scenarios →](./SCENARIOS.md)

---

## Profiling Approach

### Single Ramping Profile

Instead of running separate smoke/load/stress/soak tests for profiling, we use a **single progressive run** that reveals the latency curve per endpoint as load increases.

```
VUs
 50 ┤                              ┌────────┐
    │                         ┌────┘        └──┐
 25 ┤                    ┌────┘                └──┐
    │               ┌────┘                        └──┐
 10 ┤          ┌────┘                                └──┐
    │     ┌────┘                                        └──┐
  1 ┤─────┘                                                └───
    └──────────────────────────────────────────────────────────
    0    30s   2m30s  5m30s  7m30s  9m30s  10m30s  12m   12m30s
         baseline  ramp   hold   ramp   hold   ramp   hold  down
```

**Stages:**
1. **Baseline** (30s, 1 VU) — establish single-user latency
2. **Ramp to 10** (2m) — light load
3. **Hold 10** (3m) — steady state at light load
4. **Ramp to 25** (2m) — moderate load
5. **Hold 25** (2m) — steady state at moderate load
6. **Ramp to max** (1m) — peak load
7. **Hold max** (1m30s) — steady state at peak
8. **Ramp down** (30s) — graceful cooldown

### Why This Works

- One run captures the full latency curve from idle to peak
- Each endpoint is hit at every load level
- Degradation patterns become visible (linear vs exponential)
- No need to run 5 separate test types

---

## Tier System

Endpoints are classified by expected complexity:

| Tier | Description | p95 Threshold | Examples |
|------|-------------|---------------|----------|
| **CRUD** | Single-entity operations | < 200ms | GET by ID, POST create, PATCH update, settings |
| **List** | Paginated collection queries | < 500ms | GET list with filters, search, pagination |
| **Workflow** | Multi-step E2E processes | < 1000ms | Revenue cycle, purchase cycle, journal entry |

### Threshold Logic

k6's sub-metric filtering enforces per-tier thresholds:

```javascript
thresholds: {
  'http_req_duration{tier:crud}': ['p(95)<200'],
  'http_req_duration{tier:list}': ['p(95)<500'],
  'http_req_duration{tier:workflow}': ['p(95)<1000'],
  'http_req_failed': ['rate<0.01'],
}
```

Every HTTP request is tagged with its tier via the endpoint registry. k6 automatically groups metrics by tag and evaluates thresholds per group.

### RELAXED Mode

For local development where the backend runs on limited resources:

```bash
k6 run -e RELAXED=1 k6/tests/endpoint-profiler.js
```

Sets all thresholds to p95 < 5000ms — useful for validating test logic without failing on slow local performance.

---

## Severity Classification

The report analyzer flags each endpoint based on how far it exceeds its tier threshold:

| Flag | Condition | Meaning |
|------|-----------|---------|
| 🟢 | p95 ≤ threshold | Within SLA |
| 🟡 | threshold < p95 ≤ 2× threshold | Warning — approaching limit |
| 🔴 | p95 > 2× threshold | Critical — exceeds SLA |

**Example:**
- List endpoint with p95 = 400ms → 🟢 (under 500ms)
- List endpoint with p95 = 700ms → 🟡 (between 500ms and 1000ms)
- List endpoint with p95 = 1200ms → 🔴 (over 2× 500ms)

---

## Tagging Strategy

Every HTTP request carries three tags:

```javascript
{
  endpoint: "sales:quotations:list",  // unique identifier
  module: "sales",                     // module grouping
  tier: "list"                         // performance tier
}
```

This enables:
- **Per-endpoint analysis** — identify the exact slow endpoint
- **Per-module grouping** — compare module-level performance
- **Per-tier thresholds** — enforce SLAs by complexity class

Tags are applied via `getTaggedParams()` from the endpoint registry:

```javascript
const p = { ...getTaggedParams("sales:quotations:list"), ...params };
return authGet(url, auth, p);
```

---

## Multi-Tenant Strategy

Load is distributed across 4 user roles:

| VU % 4 | User | Role | Purpose |
|---------|------|------|---------|
| 0 | admin@example.com | Admin | Full access — all modules |
| 1 | manager@example.com | Manager | Department access |
| 2 | staff@example.com | Staff | Operational access |
| 3 | viewer@example.com | Viewer | Read-only access |

This tests:
- Permission boundaries under load
- Per-tenant data isolation
- Role-based access control performance

---

## Iteration Strategy

Each VU iteration:
1. Authenticates (cached after first login)
2. Calls **all list endpoints** in sequence (~80 GET requests)
3. Every **5th iteration**: runs E2E workflows (creates real data)
4. Sleeps 0.5–2s (simulates think time)

This means:
- List endpoints get profiled every iteration (~3000 samples at 50 VUs)
- Workflows get profiled every 5th iteration (~600 samples)
- The ratio reflects real-world usage (reads >> writes)

---

## Error Rate Interpretation

The `http_req_failed` metric counts HTTP 4xx/5xx responses. In the profiler context:

| Error Source | Expected? | Impact |
|--------------|-----------|--------|
| 403 Forbidden (permission) | Yes | Non-admin users can't access some endpoints |
| 404 Not Found (empty module) | Yes | Module has no data yet |
| 409 Conflict (business rule) | Yes | E.g., duplicate payment |
| 500 Internal Error | No | Indicates a bug |

The profiler's error rate (~7-12%) is primarily from permission-limited endpoints. This is expected behavior, not a system failure.

---

## Related Docs

- [Architecture](./ARCHITECTURE.md) — File structure and data flow
- [Scenarios](./SCENARIOS.md) — How scenario files are structured
- [Reporting](./REPORTING.md) — How to interpret the report output
