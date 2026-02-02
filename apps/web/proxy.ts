import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy middleware for handling authentication routing.
 * 
 * IMPORTANT: Cookie presence does NOT guarantee valid session.
 * HttpOnly cookies cannot be validated by middleware - only the backend can verify them.
 * 
 * This middleware only handles:
 * 1. Root path redirect when cookies exist (for convenience)
 * 2. Login page access - always allow (let client-side verify session)
 * 
 * All protected route auth is handled by client-side AuthGuard which:
 * - Verifies session with backend on every page load
 * - Redirects to login if session is invalid
 * - Clears stale auth state properly
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Check for the actual HttpOnly cookie set by the backend
  const accessToken = request.cookies.get("gims_access_token")?.value;

  // Extract locale from pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const locale = pathSegments[0] === "en" || pathSegments[0] === "id" 
    ? pathSegments[0] 
    : "en";

  // If accessing root and cookie exists, redirect to dashboard
  // NOTE: Client-side AuthGuard will verify the session and redirect to login if invalid
  if (pathname === "/" && accessToken) {
    const target = `/${locale}/dashboard`;
    return NextResponse.redirect(new URL(target, request.url));
  }

  // CRITICAL: Do NOT redirect from login page based on cookie presence alone
  // The cookie might be invalid (e.g., after server restart)
  // Let the login page's client-side logic handle the redirect if session is actually valid
  // This prevents the redirect loop when cookies exist but session is invalid

  // For all other routes, let client-side handle auth
  // The AuthGuard component will:
  // 1. Show loading state while verifying session
  // 2. Redirect to login if session is invalid
  // 3. Clear stale localStorage/cookies if needed
  return NextResponse.next();
}

// Config moved to middleware.ts if needed
