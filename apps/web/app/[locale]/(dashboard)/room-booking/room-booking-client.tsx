"use client";

import { useMemo } from "react";
import { useRoomBooking } from "@/features/room-booking/hooks/use-room-booking";
import { RoomBookingHeader, type ViewTabMode } from "@/features/room-booking/components/room-booking-header";
import { RoomFloorMap } from "@/features/room-booking/components/room-floor-map";
import { CreateBookingModal } from "@/features/room-booking/components/create-booking-modal";
import { RoomDetailModal } from "@/features/room-booking/components/room-detail-modal";
import { MyBookingsDrawer } from "@/features/room-booking/components/my-bookings-drawer";
import { RoomCalendar, type RoomCalendarResource, type RoomCalendarEvent } from "@/components/ui/room-calendar";
import { PageMotion } from "@/components/motion";

export default function RoomBookingClient() {
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
    isPending,
    rooms,
    layoutData,
    bookings,
    selectedDate,
    permissions,
    setActiveTab,
    setSelectedLocation,
    setSelectedFloor,
    setSelectedDate,
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
  } = useRoomBooking();

  // Map rooms to calendar resources format (including Unsplash photo & facilities count)
  const calendarResources: RoomCalendarResource[] = useMemo(() => {
    return rooms.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      capacity: r.capacity,
      status: r.status,
      floor: r.floor,
      imageUrl: r.imageUrl,
      facilitiesCount: r.facilities.length,
    }));
  }, [rooms]);

  // Map bookings to calendar events format
  const calendarEvents: RoomCalendarEvent[] = useMemo(() => {
    return bookings.map((b) => ({
      id: b.id,
      roomId: b.roomId,
      roomName: b.roomName,
      title: b.title,
      organizerName: b.organizerName,
      organizerDept: b.organizerDept,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      notes: b.notes,
    }));
  }, [bookings]);

  return (
    <PageMotion className="space-y-4">
      {/* 1. Simplified Page Header */}
      <RoomBookingHeader
        activeTab={(activeTab === "map" ? "map" : "calendar") as ViewTabMode}
        onTabChange={(tab) => setActiveTab(tab)}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        selectedFloor={selectedFloor}
        onFloorChange={setSelectedFloor}
        onOpenCreateModal={() => openCreateModal()}
        onOpenMyBookingsDrawer={openMyBookingsDrawer}
        canCreateBooking={permissions.canCreateBooking}
      />

      {/* 2. Full Window Main Workspace (Reference Calendar or SVG Map Layout) */}
      <div className="w-full min-h-[620px]">
        {activeTab === "map" ? (
          <RoomFloorMap
            rooms={rooms}
            layoutData={layoutData}
            zoomLevel={zoomLevel}
            showGrid={showGrid}
            onSelectRoom={(room) => openDetailModal(room)}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetZoom={resetZoom}
            onToggleGrid={toggleGrid}
          />
        ) : (
          <RoomCalendar
            resources={calendarResources}
            events={calendarEvents}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={(evt) => {
              const targetRoom = rooms.find((r) => r.id === evt.roomId);
              if (targetRoom) {
                openDetailModal(targetRoom);
              }
            }}
          />
        )}
      </div>

      {/* Modals & Drawers */}
      <CreateBookingModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        rooms={rooms}
        selectedRoom={selectedRoom}
        onSubmit={handleCreateBookingSubmit}
        isPending={isPending}
      />

      <RoomDetailModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        room={selectedRoom}
        bookings={bookings}
        onBookRoom={(room) => openCreateModal(room)}
        canCreateBooking={permissions.canCreateBooking}
      />

      <MyBookingsDrawer
        isOpen={isMyBookingsDrawerOpen}
        onClose={closeMyBookingsDrawer}
        bookings={bookings}
        onCancelBooking={handleCancelBooking}
        canCancelBooking={permissions.canCancelBooking}
      />
    </PageMotion>
  );
}
