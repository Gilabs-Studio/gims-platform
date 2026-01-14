"use client";

import { useCallback } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuthStore } from "../stores/use-auth-store";
import { authService } from "../services/auth-service";

export function useLogout() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore logout errors - still clear local state
    } finally {
      // Clear store state
      setUser(null);
      useAuthStore.setState({
        isAuthenticated: false,
        error: null,
      });
      router.push("/login");
    }
  }, [router, setUser]);

  return handleLogout;
}
