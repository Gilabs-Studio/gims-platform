// k6/tests/soak.js
// Soak profile — validates long-running stability.
// Detects memory leaks, goroutine leaks, DB connection leaks, and Redis issues.
//
// Usage:
//   k6 run k6/tests/soak.js
//   k6 run -e VUS=30 -e DURATION=120m -e K6_ENV=staging k6/tests/soak.js

import { sleep } from 'k6';
import { envGuard } from '../lib/env-guard.js';
import { getProfileOptions } from '../lib/thresholds.js';
import { CREDENTIALS, API_V1 } from '../config.js';
import { getAuthToken, authGet } from '../auth-helper.js';
import { getCredentialForVU } from '../data/multi-tenant-credentials.js';
import { parseBody, firstItem } from '../lib/helpers.js';

import { listProducts, listCustomers, listSuppliers, listWarehouses } from '../scenarios/apis/master-data.js';
import { listQuotations, listOrders, listDeliveryOrders, listInvoices } from '../scenarios/apis/sales.js';
import { listPurchaseOrders, listGoodsReceipts } from '../scenarios/apis/purchase.js';
import { listChartOfAccounts, listJournalEntries } from '../scenarios/apis/finance.js';
import { listAttendance, listLeaveRequests, listEmployees } from '../scenarios/apis/hrd.js';
import { listStock, listMovements } from '../scenarios/apis/inventory.js';
import { listPOSOrders } from '../scenarios/apis/pos.js';
import { dashboardOverview } from '../scenarios/e2e/dashboard-overview.js';

// ── k6 Options ───────────────────────────────────────────────────────────────

export const options = getProfileOptions('soak');

// ── Setup ────────────────────────────────────────────────────────────────────

export function setup() {
  envGuard.printBanner('soak');

  const auth = getAuthToken(CREDENTIALS);
  if (!auth) {
    throw new Error('[soak] Authentication failed.');
  }
  return { auth };
}

// ── Soak Execution ───────────────────────────────────────────────────────────

export default function (data) {
  const vuCreds = getCredentialForVU(__VU);
  const auth = getAuthToken(vuCreds) || data.auth;

  if (!auth) {
    sleep(2);
    return;
  }

  // Steady-state workload — representative of normal usage over time
  // Rotate through modules to exercise all connection pools

  const moduleIndex = __ITER % 5;

  switch (moduleIndex) {
    case 0:
      // Master data + dashboard
      listProducts(auth);
      listCustomers(auth);
      listSuppliers(auth);
      listWarehouses(auth);
      dashboardOverview(auth);
      break;

    case 1:
      // Sales + delivery
      listQuotations(auth);
      listOrders(auth);
      listDeliveryOrders(auth);
      listInvoices(auth);
      break;

    case 2:
      // Purchase + inventory
      listPurchaseOrders(auth);
      listGoodsReceipts(auth);
      listStock(auth);
      listMovements(auth);
      break;

    case 3:
      // Finance
      listChartOfAccounts(auth);
      listJournalEntries(auth);
      dashboardOverview(auth);
      break;

    case 4:
      // HRD + POS
      listAttendance(auth);
      listLeaveRequests(auth);
      listEmployees(auth);
      listPOSOrders(auth);
      break;
  }

  // Realistic think time for soak — simulates sustained normal usage
  sleep(1 + Math.random() * 3);
}
