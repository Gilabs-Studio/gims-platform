import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/use-auth-store";


export function useAuthGuard() {
  const { isAuthenticated, user, setUser } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Wait for Zustand store to hydrate from localStorage
    setIsHydrated(true);
  }, []);

  // Verify session validity when authenticated and hydrated
  useEffect(() => {
    const verifySession = async () => {
      if (isHydrated && isAuthenticated) {
        try {
          const { authService } = await import("../services/auth-service");
          await authService.verifySession();
        } catch (error) {
          console.error("[AuthGuard] Session verification failed:", error);
          // If verification fails (e.g. invalid cookie), logout locally
          setUser(null);
        }
      }
    };

    verifySession();
  }, [isHydrated, isAuthenticated, setUser]);

  // During SSR or before hydration, show loading
  // After hydration, use Zustand state (which persists user/isAuthenticated)
  const isLoading = !isHydrated;

  return {
    isAuthenticated: isHydrated ? isAuthenticated : false,
    isLoading,
    user,
  };
}
