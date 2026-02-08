"use client";

import { format } from "date-fns";
import { ArrowLeft, Clock, User, Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "../types";

interface AttendanceDayViewProps {
  readonly selectedDate: Date;
  readonly events: readonly CalendarEvent[];
  readonly onBack: () => void;
  readonly onEventClick: (event: CalendarEvent) => void;
  readonly onCreateNew: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PRESENT: {
    label: "Present",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  },
  LATE: {
    label: "Late",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  },
  ABSENT: {
    label: "Absent",
    className: "bg-red-500/10 text-red-700 border-red-500/20",
  },
  LEAVE: {
    label: "Leave",
    className: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  },
  HALF_DAY: {
    label: "Half Day",
    className: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  },
  EARLY_LEAVE: {
    label: "Early Leave",
    className: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  },
  HOLIDAY: {
    label: "Holiday",
    className: "bg-teal-500/10 text-teal-700 border-teal-500/20",
  },
  WFH: {
    label: "Work From Home",
    className: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  },
  OFF_DAY: {
    label: "Off Day",
    className: "bg-gray-500/10 text-gray-700 border-gray-500/20",
  },
};

export function AttendanceDayView({
  selectedDate,
  events,
  onBack,
  onEventClick,
  onCreateNew,
}: AttendanceDayViewProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Day View Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {events.length} attendance record{events.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Button onClick={onCreateNew} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Record
        </Button>
      </div>

      {/* Events List */}
      <ScrollArea className="flex-1">
        <div>
          {events.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12">
              <div className="rounded-full bg-muted p-4">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Records</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No attendance records for this date
              </p>
              <Button onClick={onCreateNew} size="sm" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add First Record
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const statusConfig = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.PRESENT;

                return (
                  <Card
                    key={event.id}
                    className="group cursor-pointer overflow-hidden transition-all hover:shadow-md"
                    onClick={() => onEventClick(event)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          {/* Employee & Status */}
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{event.employeeName}</p>
                              <Badge
                                variant="outline"
                                className={cn("mt-1 text-xs font-medium", statusConfig.className)}
                              >
                                {statusConfig.label}
                              </Badge>
                            </div>
                          </div>

                          <Separator />

                          {/* Time Info */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Check In
                                </p>
                                <p className="text-sm font-medium">
                                  {event.checkInTime || "—"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Check Out
                                </p>
                                <p className="text-sm font-medium">
                                  {event.checkOutTime || "—"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Note */}
                          {event.notes && (
                            <>
                              <Separator />
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Note
                                </p>
                                <p className="mt-1 text-sm leading-relaxed">
                                  {event.notes}
                                </p>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Hover Actions */}
                        <div className="ml-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(event);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
