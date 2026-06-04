// k6/tests/breakpoint.js
// Breakpoint profile — discovers capacity ceilings.
// Uses ramping-arrival-rate to continuously increase load until the system breaks.
//
// Usage:
//   k6 run k6/tests/breakpoint.js
//   k6 run -e MAX_VUS=500 -e K6_ENV=staging k6/tests/breakpoint.js

import { sleep } from 'k6';
import { envGuard } from '../lib/env-guard.js';
import { getProfileOptions } from '../lib/thresholds.js';
import { CREDENTIALS } from '../config.js';
import { getAuthToken } from '../auth-helper.js';
import { getCredentialForVU } from '../data/multi-tenant-credentials.js';

import { listProducts, listCustomers } from '../scenarios/apis/master-data.js';
import { listOrders } from '../scenarios/apis/sales.js';
import { listChartOfAccounts } from '../scenarios/apis/finance.js';
import { listPOSOrders } from '../scenarios/apis/pos.js';
import { dashboardOverview } from '../scenarios/e2e/dashboard-overview.js';

// ── k6 Options ───────────────────────────────────────────────────────────────

export const options = getProfileOptions('breakpoint');

// ── Setup ────────────────────────────────────────────────────────────────────

export function setup() {
  envGuard.printBanner('breakpoint');

  const auth = getAuthToken(CREDENTIALS);
  if (!auth) {
    throw new Error('[breakpoint] Authentication failed.');
  }
  return { auth };
}

// ── Breakpoint Execution ─────────────────────────────────────────────────────

export default function (data) {
  const vuCreds = getCredentialForVU(__VU);
  const auth = getAuthToken(vuCreds) || data.auth;

  if (!auth) {
    sleep(0.5);
    return;
  }

  // Focused set of endpoints to find the breaking point
  listProducts(auth);
  listCustomers(auth);
  listOrders(auth);
  listChartOfAccounts(auth);
  listPOSOrders(auth);
  dashboardOverview(auth);

  // No think time — maximum pressure
}
