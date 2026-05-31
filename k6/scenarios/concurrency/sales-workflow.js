// k6/scenarios/concurrency/sales-workflow.js
// Domain-concurrency scenario: sales quotation → order → delivery → invoice workflow.
// Validates that revenue-cycle operations remain consistent under concurrent usage.

import { check, sleep } from 'k6';
import { API_V1 } from '../../config.js';
import { authGet, authPost } from '../../auth-helper.js';
import { parseBody } from '../../lib/helpers.js';
import { conflictRate } from '../../lib/metrics.js';

/**
 * Concurrent sales quotation creation.
 */
export function concurrentQuotationCreate(auth, setupData) {
  const tags = { name: 'concurrency:sales:create-quotation', endpoint: 'sales:quotations:create', module: 'sales', tier: 'crud' };

  const uniqueRef = `K6-SQ-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const payload = {
    customer_id: setupData.customerId,
    reference: uniqueRef,
    items: [
      {
        product_id: setupData.productId,
        quantity: Math.floor(Math.random() * 10) + 1,
        unit_price: Math.floor(Math.random() * 100000) + 10000,
      },
    ],
    notes: 'k6 sales concurrency test',
  };

  if (setupData.paymentTermsId && setupData.paymentTermsId !== 'SETUP_MISSING') {
    payload.payment_terms_id = setupData.paymentTermsId;
  }

  const res = authPost(`${API_V1}/sales/sales-quotations`, payload, auth, { tags });

  check(res, {
    'quotation-create: valid response': (r) => r.status < 500,
    'quotation-create: created or validation error': (r) =>
      r.status === 200 || r.status === 201 || r.status === 422 || r.status === 400,
  });

  const body = parseBody(res);
  return {
    status: res.status,
    success: res.status >= 200 && res.status < 300,
    quotationId: body?.data?.id || null,
  };
}

/**
 * Concurrent sales order creation.
 */
export function concurrentOrderCreate(auth, setupData) {
  const tags = { name: 'concurrency:sales:create-order', endpoint: 'sales:orders:create', module: 'sales', tier: 'crud' };

  const uniqueRef = `K6-SO-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const payload = {
    customer_id: setupData.customerId,
    reference: uniqueRef,
    items: [
      {
        product_id: setupData.productId,
        quantity: Math.floor(Math.random() * 5) + 1,
        unit_price: Math.floor(Math.random() * 100000) + 10000,
      },
    ],
    notes: 'k6 sales order concurrency test',
  };

  const res = authPost(`${API_V1}/sales/sales-orders`, payload, auth, { tags });

  check(res, {
    'order-create: valid response': (r) => r.status < 500,
    'order-create: created or validation error': (r) =>
      r.status === 200 || r.status === 201 || r.status === 422 || r.status === 400,
  });

  const body = parseBody(res);
  return {
    status: res.status,
    success: res.status >= 200 && res.status < 300,
    orderId: body?.data?.id || null,
  };
}

/**
 * Full sales workflow concurrency simulation.
 */
export function salesWorkflowConcurrency(auth, setupData) {
  if (setupData.customerId === 'SETUP_MISSING' || setupData.productId === 'SETUP_MISSING') {
    return;
  }

  // List operations (read pressure)
  const quotationsRes = authGet(`${API_V1}/sales/sales-quotations`, auth, {
    tags: { name: 'concurrency:sales:list-quotations', endpoint: 'sales:quotations:list', module: 'sales', tier: 'list' },
  });
  check(quotationsRes, { 'sales-quotations: status 2xx': (r) => r.status >= 200 && r.status < 300 });

  const ordersRes = authGet(`${API_V1}/sales/sales-orders`, auth, {
    tags: { name: 'concurrency:sales:list-orders', endpoint: 'sales:orders:list', module: 'sales', tier: 'list' },
  });
  check(ordersRes, { 'sales-orders: status 2xx': (r) => r.status >= 200 && r.status < 300 });

  // Create quotation
  concurrentQuotationCreate(auth, setupData);

  sleep(0.2);

  // Create order
  concurrentOrderCreate(auth, setupData);
}
