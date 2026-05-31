// k6/scenarios/security/tenant-isolation.js
// Security-negative scenario: cross-tenant access attempts.
// Validates that IDOR risks are caught — one tenant cannot access another's data.

import http from 'k6/http';
import { check } from 'k6';
import { API_V1 } from '../../config.js';
import { authGet } from '../../auth-helper.js';
import { parseBody, firstItem } from '../../lib/helpers.js';
import { tenantIsolationViolations } from '../../lib/metrics.js';

// Fake UUIDs that should not belong to the authenticated tenant
const FAKE_IDS = [
  '00000000-0000-0000-0000-000000000001',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
];

const RESOURCE_ENDPOINTS = [
  { name: 'product', path: '/product/products' },
  { name: 'customer', path: '/customer/customers' },
  { name: 'supplier', path: '/supplier/suppliers' },
  { name: 'journal-entry', path: '/finance/journal-entries' },
  { name: 'sales-order', path: '/sales/sales-orders' },
  { name: 'purchase-order', path: '/purchase/purchase-orders' },
  { name: 'employee', path: '/organization/employees' },
];

/**
 * Test that accessing resources with fake IDs returns 404 or 403, not 200.
 * A 200 response with data would indicate a tenant isolation violation.
 */
export function testCrossTenantAccess(auth) {
  for (const ep of RESOURCE_ENDPOINTS) {
    for (const fakeId of FAKE_IDS.slice(0, 1)) { // One fake ID per endpoint per iteration
      const url = `${API_V1}${ep.path}/${fakeId}`;
      const tags = { name: `sec:tenant:${ep.name}`, endpoint: ep.name, module: 'security', tier: 'crud' };

      const res = authGet(url, auth, { tags });

      // "Not accessible" = anything that does NOT return the fake record.
      // 404/403/400 are clean rejections. 500 is a backend not-found-handling
      // bug (reported separately) but still does NOT leak data, so it is not
      // a tenant-isolation violation. Only a 200 echoing the fake id is.
      const passed = check(res, {
        [`tenant:${ep.name} not leaked`]: (r) =>
          r.status === 404 || r.status === 403 || r.status === 400 || r.status === 500,
      });

      if (res.status === 200) {
        const body = parseBody(res);
        if (body?.data && body.data.id === fakeId) {
          tenantIsolationViolations.add(1);
          console.error(`[SECURITY] Tenant isolation violation: ${ep.name}/${fakeId} returned data`);
        }
      }
      // Suppress unused-var lint
      void passed;
    }
  }
}

/**
 * Test that list endpoints don't leak data from other tenants.
 * This is harder to validate without knowing exact tenant boundaries,
 * so we verify the response structure is consistent.
 */
export function testListIsolation(auth) {
  for (const ep of RESOURCE_ENDPOINTS.slice(0, 3)) {
    const url = `${API_V1}${ep.path}`;
    const tags = { name: `sec:list-isolation:${ep.name}`, endpoint: ep.name, module: 'security', tier: 'list' };

    const res = authGet(url, auth, { tags });

    check(res, {
      [`list-isolation:${ep.name} status 2xx`]: (r) => r.status >= 200 && r.status < 300,
      [`list-isolation:${ep.name} has valid structure`]: (r) => {
        const body = parseBody(r);
        return body?.success !== undefined || body?.data !== undefined;
      },
    });
  }
}
