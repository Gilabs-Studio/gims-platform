import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "../stores/use-auth-store";

export function useAuthGuard() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const token = localStorage.getItem("token");

    if (token) {
      const timer = setTimeout(() => {
        const currentState = useAuthStore.getState();
        setIsChecking(false);

        if (!currentState.isAuthenticated && pathname !== "/") {
          // Let API handle invalid tokens after navigation
        }
      }, 100);

      return () => clearTimeout(timer);
    }

    setTimeout(() => setIsChecking(false), 0);
  }, [pathname]);

  const hasToken =
    typeof window !== "undefined" && !!localStorage.getItem("token");
  const isLoading = isChecking || (!isAuthenticated && hasToken);

  return {
    isAuthenticated: isAuthenticated || hasToken,
    isLoading,
  };
}
