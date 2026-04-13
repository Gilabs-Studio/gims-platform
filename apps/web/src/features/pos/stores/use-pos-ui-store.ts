import { create } from "zustand";

interface POSUIState {
  /** True when the POS terminal (with selected outlet) or Live Table is active.
   *  Used by DashboardLayout to hide the outer header/breadcrumb for immersive POS pages. */
  isFullScreen: boolean;
  setFullScreen: (value: boolean) => void;
}

export const usePOSUIStore = create<POSUIState>((set) => ({
  isFullScreen: false,
  setFullScreen: (value) => set({ isFullScreen: value }),
}));
