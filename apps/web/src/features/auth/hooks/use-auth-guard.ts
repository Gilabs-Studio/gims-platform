import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "../stores/use-auth-store";
import { fullAuthCleanup } from "../utils/clear-auth-cookies";

/**
 * Auth guard hook that verifies session with backend before allowing access.
 *
 * CRITICAL: This hook ensures we don't trust localStorage alone.
 * It validates the session with the backend on every page load.
 *
 * States:
 * - isLoading: true while verifying session (show loading UI)
 * - isAuthenticated: true only after backend confirms session is valid
 * - isSessionVerified: indicates backend verification completed (success or failure)
 */
export function useAuthGuard() {
  const {
    isAuthenticated: localStorageAuth,
    user,
    setUser,
    logout,
    isSessionVerified,
    setSessionVerified,
  } = useAuthStore();

  const [isHydrated, setIsHydrated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Mark as hydrated after first render (Zustand rehydration complete)
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Verify session with backend
  const verifySession = useCallback(async () => {
    // Skip if already verified or not authenticated in localStorage
    if (isSessionVerified || !localStorageAuth) {
      return;
    }

    // Prevent concurrent verification attempts
    if (isVerifying) {
      return;
    }

    setIsVerifying(true);

    try {
      const { authService } = await import("../services/auth-service");
      const response = await authService.getMe();

      // Session is valid - update user data from backend and mark as verified
      if (response?.data?.user) {
        setUser(response.data.user);
      }
      setSessionVerified(true);
    } catch (error: unknown) {
      // Type guard for error response
      const axiosError = error as { response?: { status?: number } };

      // Don't logout on rate limit (429) - let user retry later
      if (axiosError?.response?.status === 429) {
        return;
      }

      // Session invalid - clear auth state completely AND clear cookies
      logout();
      await fullAuthCleanup();
    } finally {
      setIsVerifying(false);
    }
  }, [
    isSessionVerified,
    localStorageAuth,
    isVerifying,
    setUser,
    setSessionVerified,
    logout,
  ]);

  // Run session verification when hydrated and localStorage says authenticated
  useEffect(() => {
    if (isHydrated && localStorageAuth && !isSessionVerified && !isVerifying) {
      verifySession();
    }
  }, [isHydrated, localStorageAuth, isSessionVerified, isVerifying, verifySession]);

  /**
   * Determine loading state:
   * - Not hydrated yet (SSR/initial load)
   * - Hydrated but localStorage says authenticated and not yet verified
   */
  const isLoading =
    !isHydrated || (localStorageAuth && !isSessionVerified && !isVerifying) || isVerifying;

  /**
   * Only consider authenticated if:
   * 1. Hydration complete
   * 2. localStorage says authenticated
   * 3. Backend has verified the session
   */
  const isAuthenticated = isHydrated && localStorageAuth && isSessionVerified;

  return {
    isAuthenticated,
    isLoading,
    user,
    isSessionVerified,
  };
}
