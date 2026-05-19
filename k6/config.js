// k6/config.js
// Shared configuration: URLs, credentials, thresholds, workloads, endpoints.
// Environment variables drive all settings.

// ── Environment ─────────────────────────────────────────────────────────────
export const BASE_URL = __ENV.BASE_URL || "http://localhost:8081";
export const API_V1 = `${BASE_URL}/api/v1`;

// ── Credentials ─────────────────────────────────────────────────────────────
export const CREDENTIALS = {
  email: __ENV.TEST_EMAIL || "admin@example.com",
  password: __ENV.TEST_PASSWORD || "admin123",
};

// ── Profiler Configuration ──────────────────────────────────────────────────
export const PROFILER_VUS = parseInt(__ENV.PROFILER_VUS || "50", 10);
export const PROFILER_DURATION = __ENV.PROFILER_DURATION || "10m";
export const RELAXED = __ENV.RELAXED === "1";

// ── Tier-Based Thresholds ───────────────────────────────────────────────────
// CRUD: single-entity operations (GET by ID, POST create, PATCH update)
// List: paginated collection queries
// Workflow: multi-step E2E business processes
const TIER_DEFAULTS = {
  crud: { p95: 200, p99: 500 },
  list: { p95: 500, p99: 1000 },
  workflow: { p95: 1000, p99: 2000 },
};

// When RELAXED=1, loosen all thresholds for local dev
const TIER_RELAXED = {
  crud: { p95: 5000, p99: 10000 },
  list: { p95: 5000, p99: 10000 },
  workflow: { p95: 5000, p99: 10000 },
};

export const TIER_THRESHOLDS = RELAXED ? TIER_RELAXED : TIER_DEFAULTS;

// ── k6 Thresholds (global) ─────────────────────────────────────────────────
export const THRESHOLDS = RELAXED
  ? {
      http_req_failed: ["rate<0.05"],
      http_req_duration: ["p(95)<5000"],
    }
  : {
      http_req_failed: ["rate<0.01"],
      "http_req_duration{tier:crud}": ["p(95)<200"],
      "http_req_duration{tier:list}": ["p(95)<500"],
      "http_req_duration{tier:workflow}": ["p(95)<1000"],
    };

// ── Standard Thresholds (legacy, for other test types) ─────────────────────
export const STANDARD_THRESHOLDS = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<500", "p(99)<1000"],
};

export const CRITICAL_THRESHOLDS = {
  http_req_failed: ["rate<0.005"],
  http_req_duration: ["p(95)<300", "p(99)<800"],
};

// ── Workload Configurations ─────────────────────────────────────────────────
export const SMOKE_WORKLOAD = {
  executor: "constant-vus",
  vus: 1,
  duration: "30s",
};

export const LOAD_WORKLOAD = {
  executor: "ramping-vus",
  startVUs: 0,
  stages: [
    { duration: "2m", target: parseInt(__ENV.VUS || "20", 10) },
    { duration: "5m", target: parseInt(__ENV.VUS || "20", 10) },
    { duration: "2m", target: 0 },
  ],
};

export const STRESS_WORKLOAD = {
  executor: "ramping-vus",
  startVUs: 0,
  stages: [
    { duration: "2m", target: 20 },
    { duration: "5m", target: 50 },
    { duration: "2m", target: parseInt(__ENV.MAX_VUS || "100", 10) },
    { duration: "2m", target: 0 },
  ],
};

export const SOAK_WORKLOAD = {
  executor: "constant-vus",
  vus: parseInt(__ENV.VUS || "30", 10),
  duration: __ENV.DURATION || "60m",
};

export const SPIKE_WORKLOAD = {
  executor: "ramping-vus",
  startVUs: 10,
  stages: [
    { duration: "1m", target: 10 },
    { duration: "10s", target: 200 },
    { duration: "1m", target: 10 },
    { duration: "10s", target: 200 },
    { duration: "30s", target: 0 },
  ],
};

// ── Profiler Workload (single ramping profile) ──────────────────────────────
export const PROFILER_WORKLOAD = {
  executor: "ramping-vus",
  startVUs: 1,
  stages: [
    { duration: "30s", target: 1 }, // baseline
    { duration: "2m", target: 10 }, // ramp to 10
    { duration: "3m", target: 10 }, // hold 10
    { duration: "2m", target: 25 }, // ramp to 25
    { duration: "2m", target: 25 }, // hold 25
    { duration: "1m", target: PROFILER_VUS }, // ramp to max
    { duration: "1m30s", target: PROFILER_VUS }, // hold max
    { duration: "30s", target: 0 }, // down
  ],
};

// ── Authenticated Endpoint Templates ────────────────────────────────────────
export const AUTH_ENDPOINTS = {
  login: `${API_V1}/auth/login`,
  csrf: `${API_V1}/auth/csrf`,
  logout: `${API_V1}/auth/logout`,
  refreshToken: `${API_V1}/auth/refresh-token`,
  me: `${API_V1}/users/me`,
  users: `${API_V1}/users`,
  roles: `${API_V1}/roles`,
  customers: `${API_V1}/customer/customers`,
  products: `${API_V1}/product/products`,
  warehouses: `${API_V1}/warehouse/warehouses`,
  suppliers: `${API_V1}/supplier/suppliers`,
  currency: `${API_V1}/master-data/currencies`,
  coa: `${API_V1}/finance/chart-of-accounts`,
  journals: `${API_V1}/finance/journal-entries`,
  budgets: `${API_V1}/finance/budget`,
  attendance: `${API_V1}/hrd/attendance`,
  leaves: `${API_V1}/hrd/leave-requests`,
  quotations: `${API_V1}/sales/sales-quotations`,
  orders: `${API_V1}/sales/sales-orders`,
  purchaseOrders: `${API_V1}/purchase/purchase-orders`,
  dashboard: `${API_V1}/general/dashboard/overview`,
  billing: `${API_V1}/billing/subscription`,
  // Core
  paymentTerms: `${API_V1}/master-data/payment-terms`,
  bankAccounts: `${API_V1}/finance/bank-accounts`,
  leaveTypes: `${API_V1}/master-data/leave-types`,
  courierAgencies: `${API_V1}/master-data/courier-agencies`,
  soSources: `${API_V1}/master-data/so-sources`,
  // Organization
  companies: `${API_V1}/organization/companies`,
  businessUnits: `${API_V1}/organization/business-units`,
  divisions: `${API_V1}/organization/divisions`,
  outlets: `${API_V1}/organization/outlets`,
  areas: `${API_V1}/organization/areas`,
  orgEmployees: `${API_V1}/organization/employees`,
  jobPositions: `${API_V1}/organization/job-positions`,
  businessTypes: `${API_V1}/organization/business-types`,
};

// ── Response Helpers ────────────────────────────────────────────────────────
export function checkSuccess(check, res, extraChecks = {}) {
  const body = res.json();
  const checks = {
    "status is 2xx": (r) => r.status >= 200 && r.status < 300,
    "response has success field": () => body && body.success !== undefined,
    ...extraChecks,
  };
  return check(res, checks);
}

export function checkList(check, res) {
  return checkSuccess(check, res, {
    "response has data array": (r) => {
      const b = r.json();
      return b && b.data && Array.isArray(b.data);
    },
  });
}
