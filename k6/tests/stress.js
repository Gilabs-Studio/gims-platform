// k6/tests/stress.js
// Stress profile — finds graceful degradation points.
// Ramps VUs beyond normal load to identify when the system starts failing.
//
// Usage:
//   k6 run k6/tests/stress.js
//   k6 run -e MAX_VUS=150 -e K6_ENV=staging k6/tests/stress.js

import { sleep } from 'k6';
import { envGuard } from '../lib/env-guard.js';
import { getProfileOptions } from '../lib/thresholds.js';
import { CREDENTIALS } from '../config.js';
import { getAuthToken } from '../auth-helper.js';
import { getCredentialForVU } from '../data/multi-tenant-credentials.js';

// Reuse load test scenarios
import { listProducts, listCustomers, listSuppliers, listWarehouses } from '../scenarios/apis/master-data.js';
import { listQuotations, listOrders } from '../scenarios/apis/sales.js';
import { listPurchaseOrders } from '../scenarios/apis/purchase.js';
import { listChartOfAccounts, listJournalEntries } from '../scenarios/apis/finance.js';
import { listAttendance } from '../scenarios/apis/hrd.js';
import { listStock } from '../scenarios/apis/inventory.js';
import { listPOSOrders } from '../scenarios/apis/pos.js';
import { dashboardOverview } from '../scenarios/e2e/dashboard-overview.js';

// ── k6 Options ───────────────────────────────────────────────────────────────

export const options = getProfileOptions('stress');

// ── Setup ────────────────────────────────────────────────────────────────────

export function setup() {
  envGuard.printBanner('stress');

  const auth = getAuthToken(CREDENTIALS);
  if (!auth) {
    throw new Error('[stress] Authentication failed.');
  }
  return { auth };
}

// ── Stress Execution ─────────────────────────────────────────────────────────

export default function (data) {
  const vuCreds = getCredentialForVU(__VU);
  const auth = getAuthToken(vuCreds) || data.auth;

  if (!auth) {
    sleep(1);
    return;
  }

  // Hit all major list endpoints — stress tests breadth under high VU count
  listProducts(auth);
  listCustomers(auth);
  listSuppliers(auth);
  listWarehouses(auth);
  listQuotations(auth);
  listOrders(auth);
  listPurchaseOrders(auth);
  listChartOfAccounts(auth);
  listJournalEntries(auth);
  listAttendance(auth);
  listStock(auth);
  listPOSOrders(auth);
  dashboardOverview(auth);

  sleep(0.3 + Math.random() * 0.7);
}
