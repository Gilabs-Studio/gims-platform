import { useEffect, useState, useCallback, useRef } from "react";
import { useAuthStore } from "../stores/use-auth-store";
import { fullAuthCleanup } from "../utils/clear-auth-cookies";

/**
 * Auth guard hook that verifies session with backend before allowing access.
 *
 * CRITICAL: This hook ensures we don't trust localStorage alone.
 * It ALWAYS validates the session with the backend on every page load.
 * This handles cases where:
 * - Cookies exist but localStorage was cleared
 * - localStorage says authenticated but cookies are expired/invalid
 * - Backend restarted and invalidated all sessions
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
  // Track if we've completed verification (success or failure)
  const [verificationComplete, setVerificationComplete] = useState(false);
  const hasAttemptedVerification = useRef(false);

  // Mark as hydrated after first render (Zustand rehydration complete)
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Verify session with backend - ALWAYS runs on protected routes
  const verifySession = useCallback(async () => {
    // Skip if already verified in this session (store level)
    if (isSessionVerified) {
      setVerificationComplete(true);
      return;
    }

    // Prevent concurrent verification attempts
    if (isVerifying || hasAttemptedVerification.current) {
      return;
    }

    hasAttemptedVerification.current = true;
    setIsVerifying(true);

    try {
      const { authService } = await import("../services/auth-service");
      const response = await authService.getMe();

      // Session is valid - update user data from backend and mark as verified
      if (response?.data?.user) {
        setUser(response.data.user);
        setSessionVerified(true);
      } else {
        // No user data - invalid session
        logout();
        await fullAuthCleanup();
      }
    } catch (error: unknown) {
      // Type guard for error response
      const axiosError = error as { response?: { status?: number } };

      // Don't logout on rate limit (429) - let user retry later
      if (axiosError?.response?.status === 429) {
        // Still mark verification as complete so UI doesn't hang
        // User can try again after rate limit expires
      } else {
        // Session invalid - clear auth state completely AND clear cookies
        logout();
        await fullAuthCleanup();
      }
    } finally {
      setIsVerifying(false);
      // Always mark verification as complete, even on failure
      // This allows the UI to proceed (redirect to login or show content)
      setVerificationComplete(true);
    }
  }, [
    isSessionVerified,
    isVerifying,
    setUser,
    setSessionVerified,
    logout,
  ]);

  // ALWAYS run session verification when hydrated on protected routes
  // This ensures we verify even if localStorage was cleared but cookies exist
  useEffect(() => {
    if (isHydrated && !isSessionVerified && !isVerifying && !verificationComplete) {
      verifySession();
    }
  }, [isHydrated, isSessionVerified, isVerifying, verificationComplete, verifySession]);

  /**
   * Determine loading state:
   * - Not hydrated yet (SSR/initial load)
   * - Currently verifying with backend
   * - Verification not yet complete
   */
  const isLoading = !isHydrated || isVerifying || !verificationComplete;

  /**
   * Only consider authenticated if:
   * 1. Hydration complete
   * 2. Backend has verified the session successfully
   * 3. User data exists
   */
  const isAuthenticated = isHydrated && isSessionVerified && !!user;

  return {
    isAuthenticated,
    isLoading,
    user,
    isSessionVerified,
    verificationComplete,
  };
}
