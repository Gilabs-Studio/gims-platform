import { create } from "zustand";
import type { SystemAdmin, SystemAdminState } from "../types";

interface SystemAdminStore extends SystemAdminState {
  setAdmin: (admin: SystemAdmin) => void;
  setSessionVerified: (verified: boolean) => void;
  logout: () => void;
}

export const useSystemAdminStore = create<SystemAdminStore>((set) => ({
  admin: null,
  isAuthenticated: false,
  isSessionVerified: false,

  setAdmin: (admin) =>
    set({
      admin,
      isAuthenticated: true,
      isSessionVerified: true,
    }),

  setSessionVerified: (verified) =>
    set({ isSessionVerified: verified }),

  logout: () =>
    set({
      admin: null,
      isAuthenticated: false,
      isSessionVerified: false,
    }),
}));
