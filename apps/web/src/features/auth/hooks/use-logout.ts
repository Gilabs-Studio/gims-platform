"use client";

import { useCallback } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuthStore } from "../stores/use-auth-store";
import { authService } from "../services/auth-service";
import { deleteCookie } from "@/lib/cookie";

export function useLogout() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Ignore logout errors
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        // Remove cookie
        deleteCookie("token");
      }
      setUser(null);
      setToken(null);
      useAuthStore.setState({
        refreshToken: null,
        isAuthenticated: false,
        error: null,
      });
      router.push("/login");
    }
  }, [router, setUser, setToken]);

  return handleLogout;
}
