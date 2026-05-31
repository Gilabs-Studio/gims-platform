// k6/tests/smoke.js
// Smoke profile — verifies core API availability with zero-error tolerance.
// First release gate: if smoke fails, nothing else runs.
//
// What it tests:
//   - CSRF acquisition
//   - Login authentication (login response carries the user identity)
//   - Core authenticated endpoints (dashboard, products, customers)
//   - Zero errors allowed
//
// Note: GIMS has NO /users/me endpoint. Identity comes from the login response,
// resolved via resolveIdentity() in lib/helpers.js.
//
// Usage:
//   k6 run k6/tests/smoke.js
//   k6 run -e K6_ENV=staging -e BASE_URL=https://staging.gims.app k6/tests/smoke.js
//   k6 run -e K6_ENV=production -e BASE_URL=https://gims.app k6/tests/smoke.js

import { check, sleep } from 'k6';
import http from 'k6/http';
import { envGuard } from '../lib/env-guard.js';
import { getProfileOptions } from '../lib/thresholds.js';
import { testData } from '../lib/test-data.js';
import { API_V1, CREDENTIALS } from '../config.js';
import { getAuthToken, authGet } from '../auth-helper.js';
import { parseBody, resolveIdentity } from '../lib/helpers.js';

// ── k6 Options ───────────────────────────────────────────────────────────────

export const options = getProfileOptions('smoke');

// ── Setup ────────────────────────────────────────────────────────────────────

export function setup() {
  envGuard.printBanner('smoke');

  const auth = getAuthToken(CREDENTIALS);
  if (!auth) {
    throw new Error('[smoke] Authentication failed in setup. Backend may be down.');
  }

  // Resolve identity from the login response (no /users/me in GIMS)
  const identity = resolveIdentity(auth);

  // Fail fast if login didn't return a usable user identity
  if (!identity.userId) {
    throw new Error('[smoke] Login succeeded but no user id was returned. Backend may be misconfigured.');
  }

  const setupData = {
    auth,
    companyId: identity.companyId,
  };

  // Validate minimum requirements for smoke
  testData.load(setupData);
  testData.requireForProfile('smoke');

  return setupData;
}

// ── Smoke Scenarios ──────────────────────────────────────────────────────────

export default function (data) {
  const { auth } = data;

  if (!auth) {
    throw new Error('[smoke] No auth token — cannot proceed');
  }

  // 1. CSRF endpoint (public, no auth)
  const csrfRes = http.get(`${API_V1}/auth/csrf`, {
    tags: { name: 'smoke:csrf', endpoint: 'auth:csrf', module: 'auth', tier: 'crud' },
  });
  check(csrfRes, {
    'csrf: status 200': (r) => r.status === 200,
    'csrf: has token header or cookie': (r) =>
      r.headers['X-CSRF-Token'] ||
      (r.cookies && r.cookies['gims_csrf_token']),
  });

  // 2. Users list (validates JWT auth is working — GIMS has no /users/me)
  const usersRes = authGet(`${API_V1}/users`, auth, {
    tags: { name: 'smoke:users', endpoint: 'master:users:list', module: 'master-data', tier: 'list' },
  });
  check(usersRes, {
    'users: status 2xx': (r) => r.status >= 200 && r.status < 300,
    'users: authenticated response': (r) => {
      const body = parseBody(r);
      return body?.success !== undefined || body?.data !== undefined;
    },
  });

  // 3. Dashboard overview (common landing page)
  const dashRes = authGet(`${API_V1}/general/dashboard/overview`, auth, {
    tags: { name: 'smoke:dashboard', endpoint: 'general:dashboard', module: 'general', tier: 'crud' },
  });
  check(dashRes, {
    'dashboard: status 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  // 4. Products list (core master data)
  const productsRes = authGet(`${API_V1}/product/products`, auth, {
    tags: { name: 'smoke:products', endpoint: 'master:products:list', module: 'master-data', tier: 'list' },
  });
  check(productsRes, {
    'products: status 2xx': (r) => r.status >= 200 && r.status < 300,
    'products: has data': (r) => {
      const body = parseBody(r);
      return body?.success !== undefined || body?.data !== undefined;
    },
  });

  // 5. Customers list (core master data)
  const customersRes = authGet(`${API_V1}/customer/customers`, auth, {
    tags: { name: 'smoke:customers', endpoint: 'master:customers:list', module: 'master-data', tier: 'list' },
  });
  check(customersRes, {
    'customers: status 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  // 6. Attendance list (HRD module health)
  const attendanceRes = authGet(`${API_V1}/hrd/attendance`, auth, {
    tags: { name: 'smoke:attendance', endpoint: 'hrd:attendance:list', module: 'hrd', tier: 'list' },
  });
  check(attendanceRes, {
    'attendance: status 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  // 7. Finance - Chart of Accounts (finance module health)
  const coaRes = authGet(`${API_V1}/finance/chart-of-accounts`, auth, {
    tags: { name: 'smoke:coa', endpoint: 'finance:coa:list', module: 'finance', tier: 'list' },
  });
  check(coaRes, {
    'coa: status 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  // Brief think time
  sleep(0.5);
}
