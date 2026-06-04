// k6/scenarios/security/invalid-csrf.js
// Security-negative scenario: requests with invalid CSRF tokens.
// Validates that mutation endpoints enforce CSRF protection.
//
// GIMS enforces CSRF via double-submit cookie. A mutation request that has
// neither a valid Bearer token NOR a matching CSRF cookie/header MUST be
// rejected with 403 (CSRF_INVALID) or 401.
//
// IMPORTANT: each request uses an ISOLATED cookie jar so that a CSRF cookie
// set by one response cannot leak into the next request (which would mask
// the double-submit check).

import http from 'k6/http';
import { check } from 'k6';
import { API_V1 } from '../../config.js';
import { Counter } from 'k6/metrics';

const csrfViolations = new Counter('gims_csrf_violations');

const MUTATION_ENDPOINTS = [
  { name: 'create-product', path: '/product/products', body: { name: 'k6-csrf-test', sku: 'K6-CSRF-001' } },
  { name: 'create-journal', path: '/finance/journal-entries', body: { description: 'k6-csrf-test' } },
  { name: 'create-quotation', path: '/sales/sales-quotations', body: { notes: 'k6-csrf-test' } },
  { name: 'clock-in', path: '/hrd/attendance/clock-in', body: { latitude: -6.2088, longitude: 106.8456 } },
];

/**
 * Test that mutation endpoints reject requests with invalid CSRF token
 * AND no valid auth. This MUST be rejected (401 or 403).
 *
 * A 2xx response here is a genuine security violation.
 */
export function testInvalidCSRF(auth) {
  const invalidCSRF = 'invalid-csrf-token-k6-test-' + Date.now();

  for (const ep of MUTATION_ENDPOINTS) {
    const url = `${API_V1}${ep.path}`;
    const tags = {
      name: `sec:bad-csrf:${ep.name}`,
      endpoint: ep.name,
      module: 'security',
      tier: 'crud',
    };

    // Isolated cookie jar — prevents a server-set CSRF cookie from leaking in.
    const jar = new http.CookieJar();

    const res = http.post(url, JSON.stringify(ep.body), {
      tags,
      jar,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': invalidCSRF,
      },
    });

    const rejected = check(res, {
      [`bad-csrf:${ep.name} rejected (401/403)`]: (r) => r.status === 401 || r.status === 403,
      [`bad-csrf:${ep.name} no server error`]: (r) => r.status < 500,
    });

    if (res.status >= 200 && res.status < 300) {
      csrfViolations.add(1);
      console.error(`[SECURITY] CSRF violation: ${ep.name} accepted a mutation with no auth and invalid CSRF (status ${res.status})`);
    }
  }
}

/**
 * Test login without CSRF token — must be handled correctly (rejected with 403,
 * or accepted with 200/401 depending on whether the credentials are valid).
 * The key invariant: no 500, and login CSRF protection behaves consistently.
 */
export function testLoginWithoutCSRF() {
  const url = `${API_V1}/auth/login`;
  const tags = {
    name: 'sec:login-no-csrf',
    endpoint: 'auth:login',
    module: 'security',
    tier: 'crud',
  };

  const jar = new http.CookieJar();
  const res = http.post(url, JSON.stringify({ email: 'admin@example.com', password: 'admin123' }), {
    tags,
    jar,
    headers: { 'Content-Type': 'application/json' },
    // Intentionally no X-CSRF-Token header and isolated jar (no CSRF cookie)
  });

  check(res, {
    'login-no-csrf: no server error': (r) => r.status < 500,
    'login-no-csrf: handled consistently': (r) =>
      r.status === 403 || r.status === 200 || r.status === 401 || r.status === 400,
  });
}
