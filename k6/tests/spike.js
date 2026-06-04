// k6/tests/spike.js
// Spike profile — validates recovery after sudden traffic bursts.
// Simulates event-driven traffic or peak usage patterns.
//
// Usage:
//   k6 run k6/tests/spike.js
//   k6 run -e VUS=300 -e K6_ENV=staging k6/tests/spike.js

import { sleep } from 'k6';
import { envGuard } from '../lib/env-guard.js';
import { getProfileOptions } from '../lib/thresholds.js';
import { CREDENTIALS } from '../config.js';
import { getAuthToken } from '../auth-helper.js';
import { getCredentialForVU } from '../data/multi-tenant-credentials.js';

import { listProducts, listCustomers } from '../scenarios/apis/master-data.js';
import { listQuotations, listOrders } from '../scenarios/apis/sales.js';
import { listChartOfAccounts } from '../scenarios/apis/finance.js';
import { listAttendance } from '../scenarios/apis/hrd.js';
import { listPOSOrders } from '../scenarios/apis/pos.js';
import { dashboardOverview } from '../scenarios/e2e/dashboard-overview.js';

// ── k6 Options ───────────────────────────────────────────────────────────────

export const options = getProfileOptions('spike');

// ── Setup ────────────────────────────────────────────────────────────────────

export function setup() {
  envGuard.printBanner('spike');

  const auth = getAuthToken(CREDENTIALS);
  if (!auth) {
    throw new Error('[spike] Authentication failed.');
  }
  return { auth };
}

// ── Spike Execution ──────────────────────────────────────────────────────────

export default function (data) {
  const vuCreds = getCredentialForVU(__VU);
  const auth = getAuthToken(vuCreds) || data.auth;

  if (!auth) {
    sleep(1);
    return;
  }

  // Core endpoints that would be hit during a traffic spike
  listProducts(auth);
  listCustomers(auth);
  listQuotations(auth);
  listOrders(auth);
  listChartOfAccounts(auth);
  listAttendance(auth);
  listPOSOrders(auth);
  dashboardOverview(auth);

  // Minimal think time during spike — simulates burst behavior
  sleep(0.1 + Math.random() * 0.3);
}
