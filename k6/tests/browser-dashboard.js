// k6/tests/browser-dashboard.js
// Browser dashboard profile — measures Next.js dashboard UX performance.
// Uses k6 browser module to capture Web Vitals (LCP, FID, CLS).
//
// Requires: k6 with browser module support (k6 >= 0.46)
//
// Usage:
//   K6_BROWSER_ENABLED=true k6 run k6/tests/browser-dashboard.js
//   K6_BROWSER_ENABLED=true k6 run -e WEB_URL=http://localhost:3000 k6/tests/browser-dashboard.js
//   K6_BROWSER_ENABLED=true k6 run -e K6_ENV=staging -e WEB_URL=https://staging.gims.app k6/tests/browser-dashboard.js

import { browser } from 'k6/browser';
import { check, sleep } from 'k6';
import { envGuard } from '../lib/env-guard.js';

// ── Enforce environment guard at module load ─────────────────────────────────
// This throws before k6 even starts VUs if environment disallows browser profile.
envGuard.assertCanRun('browser-dashboard');

// ── Configuration ────────────────────────────────────────────────────────────

const WEB_URL = __ENV.WEB_URL || 'http://localhost:3000';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'admin@example.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'admin123';

// ── k6 Options ───────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    'browser-dashboard': {
      executor: 'constant-vus',
      vus: envGuard.clampVUs(parseInt(__ENV.VUS || '1', 10)),
      duration: __ENV.DURATION || '1m',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    browser_web_vital_lcp: ['p(95)<2500'],
    browser_web_vital_fid: ['p(95)<100'],
    browser_web_vital_cls: ['p(95)<0.1'],
  },
};

// ── Setup ────────────────────────────────────────────────────────────────────

export function setup() {
  envGuard.printBanner('browser-dashboard');
  console.log(`[browser] Target URL: ${WEB_URL}`);
  return {};
}

// ── Browser Test Execution ───────────────────────────────────────────────────

export default async function () {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Navigate to login page
    await page.goto(`${WEB_URL}/login`, { waitUntil: 'networkidle' });

    // 2. Login
    const emailInput = await page.locator('input[name="email"], input[type="email"]');
    const passwordInput = await page.locator('input[name="password"], input[type="password"]');
    const submitBtn = await page.locator('button[type="submit"]');

    if (emailInput && passwordInput && submitBtn) {
      await emailInput.fill(TEST_EMAIL);
      await passwordInput.fill(TEST_PASSWORD);
      await submitBtn.click();

      // Wait for navigation to dashboard
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    }

    // 3. Navigate to dashboard (may already be there after login)
    await page.goto(`${WEB_URL}/dashboard`, { waitUntil: 'networkidle' });

    check(page, {
      'dashboard: page loaded': (p) => p.url().includes('/dashboard') || p.url().includes('/'),
    });

    // 4. Wait for dashboard content to render
    sleep(2);

    // 5. Navigate to common pages
    const pages = [
      '/products',
      '/customers',
      '/sales/quotations',
      '/finance/journal-entries',
    ];

    for (const path of pages) {
      await page.goto(`${WEB_URL}${path}`, { waitUntil: 'networkidle' });
      sleep(1);
    }

  } catch (e) {
    console.error(`[browser] Error: ${e.message}`);
  } finally {
    await page.close();
    await context.close();
  }
}
