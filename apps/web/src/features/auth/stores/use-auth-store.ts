"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, AuthState } from "../types";

interface AuthStore extends AuthState {
  /**
   * Whether the session has been verified with the backend.
   * This is NOT persisted - always starts as false on page load.
   * CRITICAL: Do not trust isAuthenticated alone for routing decisions.
   */
  isSessionVerified: boolean;

  setUser: (user: User | null) => void;
  clearError: () => void;

  /**
   * Mark session as verified after successful backend validation.
   */
  setSessionVerified: (verified: boolean) => void;

  /**
   * Full logout - clears user, auth state, and session verification.
   */
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isSessionVerified: false,

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
          // Reset session verification when user changes
          isSessionVerified: !!user,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      setSessionVerified: (verified: boolean) => {
        set({ isSessionVerified: verified });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isSessionVerified: false,
          error: null,
        });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // NOTE: isSessionVerified is NOT persisted intentionally
        // It must be re-validated on every page load
      }),
      // On rehydration, ensure isSessionVerified is always false
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isSessionVerified = false;
        }
      },
    },
  ),
);
