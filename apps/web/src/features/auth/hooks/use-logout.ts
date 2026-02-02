"use client";

import { useCallback } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuthStore } from "../stores/use-auth-store";
import { authService } from "../services/auth-service";

export function useLogout() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore logout errors - still clear local state
    } finally {
      // Use logout() to properly clear all auth state including isSessionVerified
      logout();
      router.push("/login");
    }
  }, [router, logout]);

  return handleLogout;
}
