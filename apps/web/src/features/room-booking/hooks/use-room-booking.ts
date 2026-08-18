import { useEffect, useState, useTransition } from "react";
import { useRoomBookingStore } from "../stores/use-room-booking-store";
import { fetchRoomFloorLayout, fetchRooms } from "../services/room-booking.service";
import {
  MOCK_STATS,
  MOCK_UPCOMING_BOOKINGS,
  MOCK_TODAY_BOOKINGS,
  MOCK_USAGE_TREND,
} from "../utils/mock-data";
import type { Booking, Room, RoomLayoutCanvasData } from "../types/room-booking.types";
import type { CreateBookingInput } from "../schemas/room-booking.schema";

export function useRoomBooking() {
  const [isPending, startTransition] = useTransition();

  // Store UI state
  const {
    activeTab,
    selectedLocation,
    selectedFloor,
    isCreateModalOpen,
    isDetailModalOpen,
    isMyBookingsDrawerOpen,
    selectedRoom,
    zoomLevel,
    showGrid,
    setActiveTab,
    setSelectedLocation,
    setSelectedFloor,
    openCreateModal,
    closeCreateModal,
    openDetailModal,
    closeDetailModal,
    openMyBookingsDrawer,
    closeMyBookingsDrawer,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleGrid,
  } = useRoomBookingStore();

  // Async mock layout data & room states
  const [layoutData, setLayoutData] = useState<RoomLayoutCanvasData | undefined>(undefined);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats] = useState(MOCK_STATS);
  const [todayBookings] = useState<Booking[]>(MOCK_TODAY_BOOKINGS);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>(MOCK_UPCOMING_BOOKINGS);
  const [usageTrend] = useState(MOCK_USAGE_TREND);
  const [chartPeriod, setChartPeriod] = useState<string>("this_week");

  // Load layout data from mock service whenever location or floor changes
  useEffect(() => {
    let isMounted = true;
    startTransition(() => {
      Promise.all([
        fetchRoomFloorLayout(selectedLocation, selectedFloor),
        fetchRooms({ location: selectedLocation, floor: selectedFloor }),
      ]).then(([layout, roomList]) => {
        if (isMounted) {
          setLayoutData(layout);
          setRooms(roomList);
        }
      });
    });
    return () => {
      isMounted = false;
    };
  }, [selectedLocation, selectedFloor]);

  // TODO: connect to real permission from backend
  const canCreateBooking = true;

  // TODO: connect to real permission from backend
  const canCancelBooking = true;

  // TODO: connect to real permission from backend
  const canManageRoomSettings = true;

  const handleCreateBookingSubmit = (data: CreateBookingInput) => {
    startTransition(() => {
      const selectedRoomObj = rooms.find((r) => r.id === data.roomId);
      const newBookingItem: Booking = {
        id: `book-${Date.now()}`,
        bookingCode: `BK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        roomId: data.roomId,
        roomName: selectedRoomObj?.name || "Meeting Room",
        roomFloor: selectedRoomObj?.floor || selectedFloor,
        roomLocation: selectedLocation,
        title: data.title,
        date: data.date,
        monthShort: "JUN",
        dayNumber: data.date.split("-")[2] || "05",
        startTime: data.startTime,
        endTime: data.endTime,
        organizerName: data.organizerName,
        organizerDept: data.department,
        status: "confirmed",
        notes: data.notes,
      };

      setUpcomingBookings((prev) => [newBookingItem, ...prev]);
      closeCreateModal();
    });
  };

  const handleCancelBooking = (bookingId: string) => {
    startTransition(() => {
      setUpcomingBookings((prev) => prev.filter((b) => b.id !== bookingId));
    });
  };

  return {
    // UI state
    activeTab,
    selectedLocation,
    selectedFloor,
    isCreateModalOpen,
    isDetailModalOpen,
    isMyBookingsDrawerOpen,
    selectedRoom,
    zoomLevel,
    showGrid,
    isPending,

    // Data
    stats,
    rooms,
    layoutData,
    todayBookings,
    upcomingBookings,
    usageTrend,
    chartPeriod,

    // Permissions (mocked as true, with TODO backend comments)
    permissions: {
      canCreateBooking,
      canCancelBooking,
      canManageRoomSettings,
    },

    // Handlers
    setActiveTab,
    setSelectedLocation,
    setSelectedFloor,
    setChartPeriod,
    openCreateModal,
    closeCreateModal,
    openDetailModal,
    closeDetailModal,
    openMyBookingsDrawer,
    closeMyBookingsDrawer,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleGrid,
    handleCreateBookingSubmit,
    handleCancelBooking,
  };
}

