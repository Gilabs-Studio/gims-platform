"use client";

import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, CalendarDays } from "lucide-react";
import { AttendanceCalendar } from "@/features/hrd/attendance-records/components/attendance-calendar";
import { AttendanceDayView } from "@/features/hrd/attendance-records/components/attendance-day-view";
import { AttendanceEventDetail } from "@/features/hrd/attendance-records/components/attendance-event-detail";
import { AttendanceRecordForm } from "@/features/hrd/attendance-records/components/attendance-record-form";
import { useAttendanceCalendar } from "@/features/hrd/attendance-records/hooks/use-attendance-calendar";
import { PageMotion } from "@/components/motion/page-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";

function AttendanceCalendarContent() {
  const {
    currentDate,
    selectedDate,
    selectedDateEvents,
    events,
    isLoading,
    selectedEvent,
    editingEvent,
    isCreateDialogOpen,
    deletingEventId,
    handlePreviousMonth,
    handleNextMonth,
    handleToday,
    handleDateClick,
    handleBackToMonth,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleDeleteClick,
    handleEventClick,
    handleEventEdit,
    setIsCreateDialogOpen,
    closeCreateDialog,
    closeEditDialog,
    closeDetailDialog,
    closeDeleteDialog,
  } = useAttendanceCalendar();

  if (isLoading) {
    return (
      <Card className="h-full">
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="flex-1 p-4">
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full overflow-hidden">
        {selectedDate ? (
          <AttendanceDayView
            selectedDate={selectedDate}
            events={selectedDateEvents}
            onBack={handleBackToMonth}
            onEventClick={handleEventClick}
            onCreateNew={() => setIsCreateDialogOpen(true)}
          />
        ) : (
          <AttendanceCalendar
            currentDate={currentDate}
            events={events}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
            onDateClick={handleDateClick}
          />
        )}
      </Card>

      {/* Event Detail Dialog */}
      <AttendanceEventDetail
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={closeDetailDialog}
        onEdit={handleEventEdit}
        onDelete={handleDeleteClick}
      />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-5" />
              Create Attendance Record
            </DialogTitle>
          </DialogHeader>
          <AttendanceRecordForm
            onSubmit={handleCreate}
            onCancel={closeCreateDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={closeEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              Edit Attendance Record
            </DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <AttendanceRecordForm
              event={editingEvent}
              onSubmit={handleUpdate}
              onCancel={closeEditDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingEventId}
        onOpenChange={(open) => !open && closeDeleteDialog()}
        onConfirm={async () => {
          if (deletingEventId) {
            await handleDelete(deletingEventId);
          }
        }}
        title="Delete Attendance Record"
        description="Are you sure you want to delete this attendance record? This action cannot be undone."
      />
    </>
  );
}

export default function AttendancePageClient() {
  return (
    <PageMotion>
      <div className="flex h-full flex-col gap-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Attendance Records
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track and manage employee attendance in calendar view
            </p>
          </div>
        </div>

        {/* Calendar */}
        <div className="flex-1 overflow-hidden">
          <Suspense
            fallback={
              <Card className="h-full">
                <div className="flex h-full items-center justify-center">
                  <Skeleton className="h-8 w-48" />
                </div>
              </Card>
            }
          >
            <AttendanceCalendarContent />
          </Suspense>
        </div>
      </div>
    </PageMotion>
  );
}
