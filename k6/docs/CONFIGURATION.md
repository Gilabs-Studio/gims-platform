# Configuration

> Config, credentials, environment variables, and thresholds

[← Workflows](./WORKFLOWS.md) | [Reporting →](./REPORTING.md)

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:8081` | Backend base URL |
| `PROFILER_VUS` | `50` | Maximum concurrent virtual users |
| `PROFILER_DURATION` | `10m` | Profiler duration (used in stage calculation) |
| `RELAXED` | `0` | Set to `1` to loosen all thresholds to 5000ms |
| `TEST_EMAIL` | `admin@example.com` | Default credential email |
| `TEST_PASSWORD` | `admin123` | Default credential password |
| `SEED_DEFAULT_PASSWORD` | `admin123` | Multi-tenant credential password |

**Usage:**
```bash
# Override base URL (e.g., staging)
k6 run -e BASE_URL=https://staging.example.com k6/tests/endpoint-profiler.js

# Reduce VUs for local testing
k6 run -e PROFILER_VUS=10 k6/tests/endpoint-profiler.js

# Relax thresholds for development
k6 run -e RELAXED=1 k6/tests/endpoint-profiler.js
```

---

## Config File (`config.js`)

### Credentials

```javascript
export const CREDENTIALS = {
  email: __ENV.TEST_EMAIL || "admin@example.com",
  password: __ENV.TEST_PASSWORD || "admin123",
};
```

Used by `setup()` for initial authentication and data collection.

### AUTH_ENDPOINTS

Pre-built URL templates for common endpoints:

```javascript
export const AUTH_ENDPOINTS = {
  login: `${API_V1}/auth/login`,
  csrf: `${API_V1}/auth/csrf`,
  customers: `${API_V1}/customer/customers`,
  products: `${API_V1}/product/products`,
  paymentTerms: `${API_V1}/master-data/payment-terms`,
  bankAccounts: `${API_V1}/finance/bank-accounts`,
  companies: `${API_V1}/organization/companies`,
  // ... etc
};
```

### Workload Profile

```javascript
export const PROFILER_WORKLOAD = {
  executor: "ramping-vus",
  startVUs: 1,
  stages: [
    { duration: "30s", target: 1 },          // baseline
    { duration: "2m", target: 10 },           // ramp to 10
    { duration: "3m", target: 10 },           // hold 10
    { duration: "2m", target: 25 },           // ramp to 25
    { duration: "2m", target: 25 },           // hold 25
    { duration: "1m", target: PROFILER_VUS }, // ramp to max
    { duration: "1m30s", target: PROFILER_VUS }, // hold max
    { duration: "30s", target: 0 },           // down
  ],
};
```

---

## Thresholds

### Default (Strict)

```javascript
{
  'http_req_duration{tier:crud}': ['p(95)<200'],
  'http_req_duration{tier:list}': ['p(95)<500'],
  'http_req_duration{tier:workflow}': ['p(95)<1000'],
  'http_req_failed': ['rate<0.01'],
}
```

### Relaxed (`RELAXED=1`)

```javascript
{
  http_req_failed: ['rate<0.05'],
  http_req_duration: ['p(95)<5000'],
}
```

### Tier Defaults

| Tier | p95 | p99 |
|------|-----|-----|
| CRUD | 200ms | 500ms |
| List | 500ms | 1000ms |
| Workflow | 1000ms | 2000ms |

---

## Multi-Tenant Credentials (`data/multi-tenant-credentials.js`)

```javascript
[
  { email: "admin@example.com",   role: "admin",   password: "admin123" },
  { email: "manager@example.com", role: "manager", password: "admin123" },
  { email: "staff@example.com",   role: "staff",   password: "admin123" },
  { email: "viewer@example.com",  role: "viewer",  password: "admin123" },
]
```

**Distribution:** VU 1 → admin, VU 2 → manager, VU 3 → staff, VU 4 → viewer, VU 5 → admin, ...

```javascript
export function getCredentialForVU(vuIndex) {
  return multiTenantCredentials[(vuIndex - 1) % multiTenantCredentials.length];
}
```

---

## Authentication Flow (`auth-helper.js`)

```
1. GET /api/v1/auth/csrf
   └── Captures CSRF cookie + X-CSRF-Token header

2. POST /api/v1/auth/login
   └── Sends email/password + CSRF header
   └── Receives JWT (access_token via cookie or body)

3. All subsequent requests
   └── Authorization: Bearer <token>
   └── Token cached per VU across iterations
```

### Token Caching

Tokens are cached by email in a `Map`. Once a VU authenticates, it reuses the token for all subsequent iterations without re-logging in.

---

## Setup Data

The `setup()` function collects prerequisite IDs needed by E2E workflows:

| Field | Source | Used By |
|-------|--------|---------|
| `customerId` | `GET /customer/customers` | Revenue cycle |
| `productId` | `GET /product/products` | Revenue cycle, Purchase cycle |
| `warehouseId` | `GET /warehouse/warehouses` | Purchase cycle, DO |
| `supplierId` | `GET /supplier/suppliers` | Purchase cycle |
| `paymentTermsId` | `GET /master-data/payment-terms` | Revenue cycle, Purchase cycle |
| `bankAccountId` | `GET /finance/bank-accounts` | Revenue cycle (payment) |
| `companyId` | `/users/me` → fallback: `/organization/companies` | Journal entry |
| `businessUnitId` | `/users/me` → fallback: `/organization/business-units` | Revenue cycle |
| `salesRepId` | `/users/me` → fallback: first employee | Revenue cycle |
| `coaDebitId` | `GET /finance/chart-of-accounts` (EXPENSE type) | Journal entry |
| `coaCreditId` | `GET /finance/chart-of-accounts` (EXPENSE type) | Journal entry |
| `employeeId` | `GET /organization/employees` | Attendance |
| `leaveTypeId` | `GET /master-data/leave-types` | Leave request |
| `outletId` | `GET /organization/outlets` | POS config |
| `officeLatitude` | First outlet with coordinates | (reserved) |
| `officeLongitude` | First outlet with coordinates | (reserved) |
| `batchableProducts` | Products with stock > 0 | Revenue cycle |

---

## Related Docs

- [Architecture](./ARCHITECTURE.md) — File structure
- [Methodology](./METHODOLOGY.md) — Tier system explained
- [Workflows](./WORKFLOWS.md) — What setup data each workflow needs
