"use client";

import { useMemo } from "react";
import { useRoomBooking } from "@/features/room-booking/hooks/use-room-booking";
import { RoomFloorMap } from "@/features/room-booking/components/room-floor-map";
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
      {/* Full Page Workspace: Clean 3-Column Anchored Calendar View or Visual Floor Map */}
      <div className="w-full h-[calc(100vh-1px)] overflow-hidden">
        {activeTab === "map" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/60 shadow-xs">
              <div>
                <h1 className="text-xl font-bold text-foreground">Visual Floor Map</h1>
                <p className="text-xs text-muted-foreground">Interactive layout view of office meeting rooms</p>
              </div>
              <button
                onClick={() => setActiveTab("calendar")}
                className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg cursor-pointer hover:bg-primary/90 transition-all"
              >
                Back to Calendar View
              </button>
            </div>

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
          </div>
        ) : (
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
