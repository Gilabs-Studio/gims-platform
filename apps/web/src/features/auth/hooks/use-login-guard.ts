import { useEffect, useState, useCallback } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuthStore } from "../stores/use-auth-store";

/**
 * Authentication guard hook specifically for the login page.
 *
 * Flow:
 * 1. Check if localStorage says user is authenticated
 * 2. If yes, verify session with backend via /auth/refresh-token
 * 3. If backend returns 200 OK → redirect to dashboard
 * 4. If backend returns 401/403 → clear localStorage, show login form
 * 5. While verifying → show loading spinner
 *
 * CRITICAL: Never trust localStorage.isAuthenticated directly.
 * Always verify with backend before redirecting.
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

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Verify session with backend
  const verifyAndRedirect = useCallback(async () => {
    // If localStorage says not authenticated, no need to verify
    if (!localStorageAuth) {
      setIsLoading(false);
      return;
    }

    // If already verified by previous hook, redirect immediately
    if (isSessionVerified) {
      router.push("/dashboard");
      return;
    }

    // Verify session with backend using /auth/me (refresh-token)
    try {
      const { authService } = await import("../services/auth-service");
      const response = await authService.getMe();

      // Session is valid - update user data and redirect to dashboard
      if (response?.data?.user) {
        setUser(response.data.user);
        setSessionVerified(true);
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
     * True while checking authentication status.
     * Show loading spinner when true.
     */
    isLoading: !isHydrated || isLoading,

    /**
     * True if user should see the login form.
     * This is true when:
     * 1. Hydration complete
     * 2. Verification complete
     * 3. User is not authenticated
     */
    shouldShowLoginForm: isHydrated && !isLoading,
  };
}
