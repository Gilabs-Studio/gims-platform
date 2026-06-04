// k6/scenarios/security/missing-auth.js
// Security-negative scenario: requests without authentication.
// Validates that protected endpoints consistently reject unauthenticated access.
//
// Strict: any 2xx response from a protected endpoint without auth is a VIOLATION.

import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { API_V1 } from '../../config.js';

const authViolations = new Counter('gims_auth_violations');

const PROTECTED_ENDPOINTS = [
  { name: 'users', path: '/users', method: 'GET' },
  { name: 'products', path: '/product/products', method: 'GET' },
  { name: 'customers', path: '/customer/customers', method: 'GET' },
  { name: 'dashboard', path: '/general/dashboard/overview', method: 'GET' },
  { name: 'attendance', path: '/hrd/attendance', method: 'GET' },
  { name: 'journal-entries', path: '/finance/journal-entries', method: 'GET' },
  { name: 'sales-orders', path: '/sales/sales-orders', method: 'GET' },
  { name: 'purchase-orders', path: '/purchase/purchase-orders', method: 'GET' },
  { name: 'pos-orders', path: '/pos/orders', method: 'GET' },
  { name: 'stock', path: '/stock/inventory', method: 'GET' },
];

/**
 * Test that all protected endpoints reject requests without auth token.
 * A 2xx response is a security violation.
 */
export function testMissingAuth() {
  for (const ep of PROTECTED_ENDPOINTS) {
    const url = `${API_V1}${ep.path}`;
    const tags = { name: `sec:no-auth:${ep.name}`, endpoint: ep.name, module: 'security', tier: 'crud' };

    let res;
    if (ep.method === 'GET') {
      res = http.get(url, { tags, headers: { 'Content-Type': 'application/json' } });
    } else {
      res = http.post(url, '{}', { tags, headers: { 'Content-Type': 'application/json' } });
    }

    const passed = check(res, {
      [`no-auth:${ep.name} rejected (401)`]: (r) => r.status === 401,
    });

    // If we got 2xx without auth, that's a security violation
    if (!passed && res.status >= 200 && res.status < 300) {
      authViolations.add(1);
      console.error(`[SECURITY] Auth violation: ${ep.name} returned ${res.status} without authentication`);
    }
  }
}

/**
 * Test with expired/invalid Bearer token.
 * Must be rejected — any 2xx is a violation.
 */
export function testInvalidToken() {
  const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid';

  for (const ep of PROTECTED_ENDPOINTS.slice(0, 5)) {
    const url = `${API_V1}${ep.path}`;
    const tags = { name: `sec:bad-token:${ep.name}`, endpoint: ep.name, module: 'security', tier: 'crud' };

    const res = http.get(url, {
      tags,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${invalidToken}`,
      },
    });

    const passed = check(res, {
      [`bad-token:${ep.name} rejected (401)`]: (r) => r.status === 401,
    });

    if (!passed && res.status >= 200 && res.status < 300) {
      authViolations.add(1);
      console.error(`[SECURITY] Token violation: ${ep.name} accepted invalid JWT`);
    }
  }
}
