/**
 * Clear all authentication-related cookies from the browser.
 *
 * This is used when:
 * 1. Session verification fails (stale cookies)
 * 2. Manual logout
 * 3. API returns 401 and refresh fails
 *
 * Note: HttpOnly cookies (gims_access_token, gims_refresh_token) cannot be
 * cleared by JavaScript. They must be cleared by the server via Set-Cookie
 * with MaxAge=-1. This function only clears non-HttpOnly cookies like csrf_token.
 *
 * For full cookie cleanup, always call the /auth/logout API endpoint.
 */
export function clearAuthCookies(): void {
  if (typeof document === "undefined") return;

  const cookiesToClear = [
    "gims_csrf_token",
    // Note: These are HttpOnly, so this won't actually work for them
    // but we include them for completeness in case they're ever non-HttpOnly
    "gims_access_token",
    "gims_refresh_token",
  ];

  const paths = ["/", ""];
  const domains = [""];

  // Add the registrable root domain (e.g. .gilabs.id) to clear domain-scoped cookies
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  if (parts.length >= 2) {
    const registrableDomain = parts.slice(-2).join(".");
    domains.push(`.${registrableDomain}`);
    domains.push(registrableDomain);
  }

  cookiesToClear.forEach((cookieName) => {
    domains.forEach((domain) => {
      paths.forEach((path) => {
        const domainAttr = domain ? `; domain=${domain}` : "";
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domainAttr}`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domainAttr}; SameSite=Strict`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domainAttr}; SameSite=Lax`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domainAttr}; SameSite=None; Secure`;
      });
    });
  });
}

let fullCleanupPromise: Promise<void> | null = null;

/**
 * Attempt to logout via API to clear HttpOnly cookies server-side.
 * This is fire-and-forget - we don't care if it fails.
 */
export async function clearAuthCookiesViaApi(): Promise<void> {
  try {
    const { authService } = await import("../services/auth-service");
    await authService.logout();
  } catch {
    // Ignore errors - we still want to clear local state
    // The server might be down or the token already invalid
  }
}

/**
 * Full cleanup: clear local cookies AND call API to clear HttpOnly cookies.
 */
export async function fullAuthCleanup(): Promise<void> {
  if (fullCleanupPromise) {
    return fullCleanupPromise;
  }

  // Clear what we can locally first
  fullCleanupPromise = (async () => {
    clearAuthCookies();
    // Then try to clear HttpOnly cookies via API
    await clearAuthCookiesViaApi();
  })().finally(() => {
    fullCleanupPromise = null;
  });

  return fullCleanupPromise;
}
