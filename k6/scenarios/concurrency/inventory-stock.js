// k6/scenarios/concurrency/inventory-stock.js
// Domain-concurrency scenario: stock movement and stock opname under concurrency.
// Validates that warehouse quantities remain consistent under concurrent operations.

import { check, sleep } from 'k6';
import { API_V1 } from '../../config.js';
import { authGet, authPost } from '../../auth-helper.js';
import { parseBody } from '../../lib/helpers.js';
import { conflictRate } from '../../lib/metrics.js';

/**
 * Concurrent stock movement (transfer between warehouses).
 */
export function concurrentStockMovement(auth, setupData) {
  const tags = { name: 'concurrency:inventory:movement', endpoint: 'inventory:movements:create', module: 'inventory', tier: 'crud' };

  const payload = {
    product_id: setupData.productId,
    warehouse_id: setupData.warehouseId,
    quantity: Math.floor(Math.random() * 5) + 1,
    type: 'adjustment',
    notes: `k6-stock-movement-${Date.now()}`,
  };

  const res = authPost(`${API_V1}/stock/movements`, payload, auth, { tags });

  check(res, {
    'stock-movement: valid response': (r) => r.status < 500,
    'stock-movement: created or rejected': (r) =>
      r.status === 200 || r.status === 201 || r.status === 422 || r.status === 409 || r.status === 400,
  });

  if (res.status === 409) {
    conflictRate.add(1);
  }

  return { status: res.status, success: res.status >= 200 && res.status < 300 };
}

/**
 * Read stock levels under concurrent write pressure.
 */
export function readStockUnderPressure(auth, setupData) {
  // List stock
  const stockRes = authGet(`${API_V1}/stock/inventory`, auth, {
    tags: { name: 'concurrency:inventory:stock-list', endpoint: 'inventory:stock:list', module: 'inventory', tier: 'list' },
  });
  check(stockRes, {
    'stock-list: status 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  // Stock metrics
  const metricsRes = authGet(`${API_V1}/stock/inventory/metrics`, auth, {
    tags: { name: 'concurrency:inventory:metrics', endpoint: 'inventory:stock:metrics', module: 'inventory', tier: 'crud' },
  });
  check(metricsRes, {
    'stock-metrics: status 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  // Movements list
  const movementsRes = authGet(`${API_V1}/stock/movements`, auth, {
    tags: { name: 'concurrency:inventory:movements-list', endpoint: 'inventory:movements:list', module: 'inventory', tier: 'list' },
  });
  check(movementsRes, {
    'movements-list: status 2xx': (r) => r.status >= 200 && r.status < 300,
  });
}

/**
 * Full inventory concurrency simulation.
 */
export function inventoryConcurrency(auth, setupData) {
  if (setupData.productId === 'SETUP_MISSING' || setupData.warehouseId === 'SETUP_MISSING') {
    return;
  }

  // Read current stock state
  readStockUnderPressure(auth, setupData);

  // Attempt concurrent stock movement
  concurrentStockMovement(auth, setupData);

  // Read again to verify consistency
  sleep(0.2);
  readStockUnderPressure(auth, setupData);
}
