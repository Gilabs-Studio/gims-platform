import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  // If accessing root and already authenticated, redirect to default-locale home
  if (pathname === "/" && token) {
    const target = "/en"; // default locale is "en"
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
