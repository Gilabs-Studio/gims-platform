import { useEffect, useState, useTransition } from "react";
import { useRoomBookingStore } from "../stores/use-room-booking-store";
import { fetchRoomFloorLayout, fetchRooms } from "../services/room-booking.service";
import {
  MOCK_STATS,
  MOCK_BOOKINGS,
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
    setSelectedRoom,
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
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
          if (roomList.length > 0) {
            setSelectedRoom(roomList[0]);
          }
        }
      });
    });
    return () => {
      isMounted = false;
    };
  }, [selectedLocation, selectedFloor, setSelectedRoom]);

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
        startTime: data.startTime,
        endTime: data.endTime,
        organizerName: data.organizerName,
        organizerDept: data.department,
        status: "confirmed",
        notes: data.notes,
      };

      setBookings((prev) => [newBookingItem, ...prev]);
      closeCreateModal();
    });
  };

  const handleCancelBooking = (bookingId: string) => {
    startTransition(() => {
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    });
  };

  const handleSelectSlot = (roomId: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (targetRoom) {
      setSelectedRoom(targetRoom);
    }
    openCreateModal(targetRoom);
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
    bookings,
    selectedDate,
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
    setSelectedRoom,
    setSelectedDate,
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
    handleSelectSlot,
  };
}
