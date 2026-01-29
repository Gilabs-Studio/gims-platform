import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Check for the actual HttpOnly cookie set by the backend
  const accessToken = request.cookies.get("gims_access_token")?.value;

  // If accessing root and already authenticated, redirect to default-locale dashboard
  if (pathname === "/" && accessToken) {
    const target = "/en/dashboard"; // default locale is "en"
    return NextResponse.redirect(new URL(target, request.url));
  }

  // If accessing login page and already authenticated, redirect to dashboard
  // Note: Client-side will verify session validity, but this provides faster redirect
  // Handle both /login and /[locale]/login patterns
  if (accessToken && pathname.includes("/login")) {
    // Extract locale from pathname if present (e.g., /en/login -> en, /id/login -> id)
    const pathSegments = pathname.split("/").filter(Boolean);
    const locale = pathSegments[0] === "en" || pathSegments[0] === "id" 
      ? pathSegments[0] 
      : "en"; // default to "en" if no locale found
    
    const target = `/${locale}/dashboard`;
    return NextResponse.redirect(new URL(target, request.url));
  }

  // If accessing protected routes without token, let client-side handle redirect
  // Don't redirect here to avoid redirect loops and let client handle auth state
  // Client-side will check localStorage and redirect if needed

  // For protected routes, let client-side handle auth
  // This prevents flash of login page during hard refresh
  return NextResponse.next();
}

// Config moved to middleware.ts if needed
