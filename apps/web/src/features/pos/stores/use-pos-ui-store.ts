import { create } from "zustand";
import { persist } from "zustand/middleware";

export type POSGridSize = "small" | "medium" | "large";

interface POSUIState {
  /** True when the POS terminal (with selected outlet) or Live Table is active.
   *  Used by DashboardLayout to hide the outer header/breadcrumb for immersive POS pages. */
  isFullScreen: boolean;
  setFullScreen: (value: boolean) => void;

  /** Catalog grid layout size preference */
  gridSize: POSGridSize;
  setGridSize: (size: POSGridSize) => void;
}

export const usePOSUIStore = create<POSUIState>()(
  persist(
    (set) => ({
      isFullScreen: false,
      setFullScreen: (value) => set({ isFullScreen: value }),

      gridSize: "medium",
      setGridSize: (gridSize) => set({ gridSize }),
    }),
    {
      name: "pos-ui-storage",
      partialize: (state) => ({ gridSize: state.gridSize }),
    }
  )
);
