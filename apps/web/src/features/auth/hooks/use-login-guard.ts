import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuthStore } from "../stores/use-auth-store";

/**
 * Authentication guard hook specifically for the login page.
 *
 * Flow:
 * 1. ALWAYS verify session with backend via /auth/refresh-token
 * 2. If backend returns 200 OK → redirect to dashboard
 * 3. If backend returns 401/403 → clear localStorage & cookies, show login form
 * 4. While verifying → show loading spinner
 *
 * CRITICAL: We cannot check HttpOnly cookies from JavaScript.
 * Always verify with backend to determine auth state.
 */
export function useLoginGuard() {
  const router = useRouter();
  const {
    isAuthenticated: localStorageAuth,
    isSessionVerified,
    setUser,
    setSessionVerified,
    logout,
  } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasAttemptedVerification = useRef(false);

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // ALWAYS verify session with backend on login page
  // This handles cases where HttpOnly cookies exist but localStorage was cleared
  const verifyAndRedirect = useCallback(async () => {
    // Prevent concurrent/repeated verification attempts
    if (hasAttemptedVerification.current) {
      return;
    }
    hasAttemptedVerification.current = true;

    // If already verified in this session, redirect immediately
    if (isSessionVerified && localStorageAuth) {
      setIsRedirecting(true);
      router.push("/dashboard");
      return;
    }

    // ALWAYS verify session with backend - we cannot check HttpOnly cookies
    try {
      const { authService } = await import("../services/auth-service");
      const response = await authService.getMe();

      // Session is valid - update user data and redirect to dashboard
      if (response?.data?.user) {
        setUser(response.data.user);
        setSessionVerified(true);
        setIsRedirecting(true);
        router.push("/dashboard");
      } else {
        // Response invalid - clear auth and show login form
        logout();
        setIsLoading(false);
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      const status = axiosError?.response?.status;

      // 401/403 means session is invalid - clear auth and show login form
      if (status === 401 || status === 403) {
        logout();
        // Also clear cookies since they're invalid
        const { fullAuthCleanup } = await import("../utils/clear-auth-cookies");
        await fullAuthCleanup();
      } else if (status === 429) {
        // Rate limited - don't logout, but show login form for now
        // User can try again later
      } else {
        // Other errors (network, server) - clear auth for safety
        logout();
      }

      setIsLoading(false);
    }
  }, [
    localStorageAuth,
    isSessionVerified,
    router,
    setUser,
    setSessionVerified,
    logout,
  ]);

  // Run verification after hydration
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    verifyAndRedirect();
  }, [isHydrated, verifyAndRedirect]);

  return {
    /**
     * True while checking authentication status or redirecting.
     * Show loading spinner when true.
     */
    isLoading: !isHydrated || isLoading || isRedirecting,

    /**
     * True if user should see the login form.
     * This is true when:
     * 1. Hydration complete
     * 2. Verification complete
     * 3. User is not authenticated (not redirecting to dashboard)
     */
    shouldShowLoginForm: isHydrated && !isLoading && !isRedirecting,
  };
}
