import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuthStore } from "../stores/use-auth-store";

/**
 * Authentication guard hook specifically for the login page.
 *
 * This hook verifies the current session in the background, but it does not
 * block rendering of the login form. This improves perceived performance by
 * allowing users to start typing immediately while the browser checks if the
 * existing session is still valid.
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

  const [isHydrated, setIsHydrated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasAttemptedVerification = useRef(false);

  // Mark as hydrated after first render (Zustand rehydration complete)
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const verifyAndRedirect = useCallback(async () => {
    // Avoid repeated attempts when the component re-renders
    if (hasAttemptedVerification.current || isRedirecting) {
      return;
    }
    hasAttemptedVerification.current = true;

    // If we already have a verified session from this page load, avoid the
    // extra round-trip and redirect immediately.
    if (isSessionVerified && localStorageAuth) {
      setIsRedirecting(true);
      router.push("/dashboard");
      return;
    }

    setIsVerifying(true);

    try {
      const { authService } = await import("../services/auth-service");

      // CSRF prefetch is a best-effort optimization; it is not required for
      // /auth/refresh-token but can help for the subsequent login request.
      try {
        await authService.prefetchCSRFToken();
      } catch {
        // Ignore — verification can still succeed without it.
      }

      const response = await authService.getMe();

      if (response?.data?.user) {
        setUser(response.data.user);
        setSessionVerified(true);
        setIsRedirecting(true);
        router.push("/dashboard");
        return;
      }

      // If response doesn't contain user, treat it as an invalid session.
      logout();
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { status?: number; data?: { error?: { code?: string } } };
      };
      const status = axiosError?.response?.status;
      const errorCode = axiosError?.response?.data?.error?.code;

      // CSRF mismatch can happen when the token is stale; let the user retry.
      if (errorCode === "CSRF_INVALID") {
        return;
      }

      if (status === 401) {
        logout();
        const { fullAuthCleanup } = await import("../utils/clear-auth-cookies");
        await fullAuthCleanup();
      } else if (status === 403) {
        // Session exists but lacks permissions - keep cookies so user can re-login.
        logout();
      } else if (status === 429) {
        // Rate limited - allow the user to try again once the cooldown expires.
      } else {
        logout();
      }
    } finally {
      setIsVerifying(false);
    }
  }, [
    localStorageAuth,
    isSessionVerified,
    isRedirecting,
    router,
    setUser,
    setSessionVerified,
    logout,
  ]);

  // Start verification as soon as hydration is complete.
  useEffect(() => {
    if (!isHydrated) return;
    verifyAndRedirect();
  }, [isHydrated, verifyAndRedirect]);

  return {
    // Indicates the login page is still checking whether the user is already logged in.
    isLoading: isVerifying || isRedirecting,

    // Allow the login form to render immediately after hydration.
    shouldShowLoginForm: isHydrated && !isRedirecting,
  };
}
