"use client";

import { useRoomBooking } from "@/features/room-booking/hooks/use-room-booking";
import { RoomBookingHeader } from "@/features/room-booking/components/room-booking-header";
import { RoomBookingStatsCards } from "@/features/room-booking/components/room-booking-stats-cards";
import { RoomFloorMap } from "@/features/room-booking/components/room-floor-map";
import { RoomListView } from "@/features/room-booking/components/room-list-view";
import { UpcomingBookingsCard } from "@/features/room-booking/components/upcoming-bookings-card";
import { TodayBookingsTable } from "@/features/room-booking/components/today-bookings-table";
import { RoomUsageChart } from "@/features/room-booking/components/room-usage-chart";
import { CreateBookingModal } from "@/features/room-booking/components/create-booking-modal";
import { RoomDetailModal } from "@/features/room-booking/components/room-detail-modal";
import { MyBookingsDrawer } from "@/features/room-booking/components/my-bookings-drawer";
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
    stats,
    rooms,
    layoutData,
    todayBookings,
    upcomingBookings,
    usageTrend,
    chartPeriod,
    permissions,
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
  } = useRoomBooking();

  return (
    <PageMotion className="space-y-6">
      {/* 1. Header Section */}
      <RoomBookingHeader
        onOpenCreateModal={() => openCreateModal()}
        onOpenMyBookingsDrawer={openMyBookingsDrawer}
        canCreateBooking={permissions.canCreateBooking}
      />

      {/* 2. Top Summary Metric Cards */}
      <RoomBookingStatsCards stats={stats} />

      {/* 3. Main Full Grid Floor Layout Visualizer / Room List */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <RoomFloorMap
            rooms={rooms}
            layoutData={layoutData}
            activeTab={activeTab}
            selectedLocation={selectedLocation}
            selectedFloor={selectedFloor}
            zoomLevel={zoomLevel}
            showGrid={showGrid}
            onTabChange={setActiveTab}
            onLocationChange={setSelectedLocation}
            onFloorChange={setSelectedFloor}
            onSelectRoom={(room) => openDetailModal(room)}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetZoom={resetZoom}
            onToggleGrid={toggleGrid}
          />

          {activeTab === "list" && (
            <div className="mt-4">
              <RoomListView
                rooms={rooms}
                onSelectRoom={(room) => openDetailModal(room)}
                onOpenCreateModal={(room) => openCreateModal(room)}
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Section: Upcoming Bookings, Today's Bookings Table & Usage Chart */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <UpcomingBookingsCard
            bookings={upcomingBookings}
            onCancelBooking={handleCancelBooking}
            onOpenMyBookingsDrawer={openMyBookingsDrawer}
            canCancelBooking={permissions.canCancelBooking}
          />
        </div>

        <div className="lg:col-span-5">
          <TodayBookingsTable
            bookings={todayBookings}
            onOpenMyBookingsDrawer={openMyBookingsDrawer}
          />
        </div>

        <div className="lg:col-span-3">
          <RoomUsageChart
            data={usageTrend}
            period={chartPeriod}
            onPeriodChange={setChartPeriod}
          />
        </div>
      </div>

      {/* Modals & Drawer */}
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
        onBookRoom={(room) => openCreateModal(room)}
        canCreateBooking={permissions.canCreateBooking}
      />

      <MyBookingsDrawer
        isOpen={isMyBookingsDrawerOpen}
        onClose={closeMyBookingsDrawer}
        bookings={upcomingBookings}
        onCancelBooking={handleCancelBooking}
        canCancelBooking={permissions.canCancelBooking}
      />
    </PageMotion>
  );
}
