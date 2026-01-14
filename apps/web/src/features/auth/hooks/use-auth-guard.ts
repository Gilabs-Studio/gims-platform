import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/use-auth-store";

export function useAuthGuard() {
  const { isAuthenticated, user } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Wait for Zustand store to hydrate from localStorage
    setIsHydrated(true);
  }, []);

  // During SSR or before hydration, show loading
  // After hydration, use Zustand state (which persists user/isAuthenticated)
  const isLoading = !isHydrated;

  return {
    isAuthenticated: isHydrated ? isAuthenticated : false,
    isLoading,
    user,
  };
}
