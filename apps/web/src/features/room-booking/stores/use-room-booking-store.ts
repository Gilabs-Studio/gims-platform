import { create } from "zustand";
import type { Room } from "../types/room-booking.types";

export type ViewTabMode = "map" | "calendar" | "list";

interface RoomBookingUIState {
  activeTab: ViewTabMode;
  selectedLocation: string;
  selectedFloor: string;
  isCreateModalOpen: boolean;
  isDetailModalOpen: boolean;
  isMyBookingsDrawerOpen: boolean;
  selectedRoom: Room | null;
  zoomLevel: number;
  showGrid: boolean;

  // Actions
  setActiveTab: (tab: ViewTabMode) => void;
  setSelectedLocation: (loc: string) => void;
  setSelectedFloor: (floor: string) => void;
  setSelectedRoom: (room: Room | null) => void;
  openCreateModal: (room?: Room) => void;
  closeCreateModal: () => void;
  openDetailModal: (room: Room) => void;
  closeDetailModal: () => void;
  openMyBookingsDrawer: () => void;
  closeMyBookingsDrawer: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  toggleGrid: () => void;
}

export const useRoomBookingStore = create<RoomBookingUIState>((set) => ({
  activeTab: "map",
  selectedLocation: "Kantor Pusat - Jakarta",
  selectedFloor: "Lantai 3",
  isCreateModalOpen: false,
  isDetailModalOpen: false,
  isMyBookingsDrawerOpen: false,
  selectedRoom: null,
  zoomLevel: 1,
  showGrid: true,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedLocation: (selectedLocation) => set({ selectedLocation }),
  setSelectedFloor: (selectedFloor) => set({ selectedFloor }),
  setSelectedRoom: (selectedRoom) => set({ selectedRoom }),
  openCreateModal: (room) => set({ isCreateModalOpen: true, selectedRoom: room || null }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  openDetailModal: (room) => set({ selectedRoom: room, isDetailModalOpen: true }),
  closeDetailModal: () => set({ isDetailModalOpen: false }),
  openMyBookingsDrawer: () => set({ isMyBookingsDrawerOpen: true }),
  closeMyBookingsDrawer: () => set({ isMyBookingsDrawerOpen: false }),
  zoomIn: () => set((state) => ({ zoomLevel: Math.min(state.zoomLevel + 0.15, 1.8) })),
  zoomOut: () => set((state) => ({ zoomLevel: Math.max(state.zoomLevel - 0.15, 0.6) })),
  resetZoom: () => set({ zoomLevel: 1 }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
}));
