// k6/tests/security-negative.js
// Security-negative profile — validates security controls under load.
// Tests missing auth, invalid CSRF, cross-tenant access, and rate limiting.
//
// Usage:
//   k6 run k6/tests/security-negative.js
//   k6 run -e VUS=15 -e K6_ENV=staging k6/tests/security-negative.js

import { sleep } from 'k6';
import { envGuard } from '../lib/env-guard.js';
import { getProfileOptions } from '../lib/thresholds.js';
import { CREDENTIALS } from '../config.js';
import { getAuthToken } from '../auth-helper.js';

// Security scenario imports
import { testMissingAuth, testInvalidToken } from '../scenarios/security/missing-auth.js';
import { testInvalidCSRF, testLoginWithoutCSRF } from '../scenarios/security/invalid-csrf.js';
import { testCrossTenantAccess, testListIsolation } from '../scenarios/security/tenant-isolation.js';
import { testRateLimitBurst, testRateLimitHeaders } from '../scenarios/security/rate-limit.js';

// ── k6 Options ───────────────────────────────────────────────────────────────

export const options = getProfileOptions('security-negative');

// ── Setup ────────────────────────────────────────────────────────────────────

export function setup() {
  envGuard.printBanner('security-negative');

  const auth = getAuthToken(CREDENTIALS);
  if (!auth) {
    throw new Error('[security-negative] Authentication failed. Need valid auth to test cross-tenant and CSRF.');
  }

  return { auth };
}

// ── Security Test Execution ──────────────────────────────────────────────────

export default function (data) {
  const { auth } = data;

  // 1. Missing authentication (every iteration)
  testMissingAuth();

  // 2. Invalid token (every iteration)
  testInvalidToken();

  // 3. Invalid CSRF (every iteration)
  testInvalidCSRF(auth);

  // 4. Login without CSRF (every 2nd iteration)
  if (__ITER % 2 === 0) {
    testLoginWithoutCSRF();
  }

  // 5. Cross-tenant access (every iteration)
  testCrossTenantAccess(auth);

  // 6. List isolation (every 3rd iteration)
  if (__ITER % 3 === 0) {
    testListIsolation(auth);
  }

  // 7. Rate limit burst (every 5th iteration — aggressive)
  if (__ITER % 5 === 0) {
    testRateLimitBurst(20);
  }

  // 8. Rate limit headers (every 10th iteration)
  if (__ITER % 10 === 0) {
    testRateLimitHeaders();
  }

  sleep(0.3);
}
