// k6/scenarios/concurrency/purchase-workflow.js
// Domain-concurrency scenario: purchase order, approval, and goods receipt workflow.
// Validates that procurement remains reliable under concurrent load.

import { check, sleep } from 'k6';
import { API_V1 } from '../../config.js';
import { authGet, authPost } from '../../auth-helper.js';
import { parseBody } from '../../lib/helpers.js';
import { conflictRate } from '../../lib/metrics.js';

/**
 * Concurrent purchase order creation.
 */
export function concurrentPurchaseOrderCreate(auth, setupData) {
  const tags = { name: 'concurrency:purchase:create-po', endpoint: 'purchase:orders:create', module: 'purchase', tier: 'crud' };

  const uniqueRef = `K6-PO-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const payload = {
    supplier_id: setupData.supplierId,
    reference: uniqueRef,
    items: [
      {
        product_id: setupData.productId,
        quantity: Math.floor(Math.random() * 20) + 1,
        unit_price: Math.floor(Math.random() * 50000) + 5000,
      },
    ],
    notes: 'k6 purchase concurrency test',
  };

  if (setupData.warehouseId && setupData.warehouseId !== 'SETUP_MISSING') {
    payload.warehouse_id = setupData.warehouseId;
  }

  const res = authPost(`${API_V1}/purchase/purchase-orders`, payload, auth, { tags });

  check(res, {
    'po-create: valid response': (r) => r.status < 500,
    'po-create: created or validation error': (r) =>
      r.status === 200 || r.status === 201 || r.status === 422 || r.status === 400,
  });

  const body = parseBody(res);
  return {
    status: res.status,
    success: res.status >= 200 && res.status < 300,
    poId: body?.data?.id || null,
  };
}

/**
 * Concurrent PO approval (tests row-level locking on approval).
 */
export function concurrentPOApproval(auth, poId) {
  if (!poId) return { status: 0, success: false };

  const tags = { name: 'concurrency:purchase:approve-po', endpoint: 'purchase:orders:approve', module: 'purchase', tier: 'workflow' };

  const res = authPost(`${API_V1}/purchase/purchase-orders/${poId}/approve`, {}, auth, { tags });

  check(res, {
    'po-approve: valid response': (r) => r.status < 500,
    'po-approve: approved or already-approved': (r) =>
      r.status === 200 || r.status === 201 || r.status === 409 || r.status === 422 || r.status === 400,
  });

  if (res.status === 409 || res.status === 422) {
    conflictRate.add(1);
  }

  return { status: res.status, success: res.status >= 200 && res.status < 300 };
}

/**
 * Full purchase workflow concurrency simulation.
 */
export function purchaseWorkflowConcurrency(auth, setupData) {
  if (setupData.supplierId === 'SETUP_MISSING' || setupData.productId === 'SETUP_MISSING') {
    return;
  }

  // List operations (read pressure)
  const poRes = authGet(`${API_V1}/purchase/purchase-orders`, auth, {
    tags: { name: 'concurrency:purchase:list-po', endpoint: 'purchase:orders:list', module: 'purchase', tier: 'list' },
  });
  check(poRes, { 'purchase-orders: status 2xx': (r) => r.status >= 200 && r.status < 300 });

  const grRes = authGet(`${API_V1}/purchase/goods-receipt`, auth, {
    tags: { name: 'concurrency:purchase:list-gr', endpoint: 'purchase:goods-receipt:list', module: 'purchase', tier: 'list' },
  });
  check(grRes, { 'goods-receipt: status 2xx': (r) => r.status >= 200 && r.status < 300 });

  // Create PO
  const createResult = concurrentPurchaseOrderCreate(auth, setupData);

  // Approve if created
  if (createResult.success && createResult.poId) {
    sleep(0.2);
    concurrentPOApproval(auth, createResult.poId);
  }
}
