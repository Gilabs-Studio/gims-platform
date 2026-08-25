"use client";

import { useMemo } from "react";
import { useRoomBooking } from "@/features/room-booking/hooks/use-room-booking";
import { CreateBookingModal } from "@/features/room-booking/components/create-booking-modal";
import { RoomDetailModal } from "@/features/room-booking/components/room-detail-modal";
import { MyBookingsDrawer } from "@/features/room-booking/components/my-bookings-drawer";
import { RoomCalendar, type RoomCalendarResource, type RoomCalendarEvent } from "@/components/ui/room-calendar";
import { PageMotion } from "@/components/motion";

export default function RoomBookingClient() {
  const {
    activeTab,
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

  // Map rooms to calendar resources format
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
    <PageMotion className="w-full">
      {/* Unified Full-Page 3-Column Anchored Hybrid Workspace */}
      <div className="w-full h-[calc(100vh-1px)] overflow-hidden">
        <RoomCalendar
          resources={calendarResources}
          events={calendarEvents}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onSelectSlot={handleSelectSlot}
          onOpenCreateModal={() => openCreateModal()}
          onOpenMyBookingsDrawer={openMyBookingsDrawer}
          onToggleVisualMap={() => setActiveTab((activeTab as string) === "map" ? "calendar" : "map")}
          isMapActive={(activeTab as string) === "map"}
          rawRooms={rooms}
          layoutData={layoutData}
          zoomLevel={zoomLevel}
          showGrid={showGrid}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onToggleGrid={toggleGrid}
          onSelectRoomObj={(room) => openDetailModal(room)}
          onSelectEvent={(evt) => {
            const targetRoom = rooms.find((r) => r.id === evt.roomId);
            if (targetRoom) {
              openDetailModal(targetRoom);
            }
          }}
        />
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
