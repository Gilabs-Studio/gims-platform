"use client";

import { format } from "date-fns";
import { Clock, User, Calendar, FileText, Trash2, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "../types";

interface AttendanceEventDetailProps {
  readonly event: CalendarEvent | null;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onEdit: (event: CalendarEvent) => void;
  readonly onDelete: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PRESENT: {
    label: "Present",
    className: "bg-success/10 text-success border-emerald-500/20",
  },
  LATE: {
    label: "Late",
    className: "bg-warning/10 text-warning border-amber-500/20",
  },
  ABSENT: {
    label: "Absent",
    className: "bg-destructive/10 text-destructive border-red-500/20",
  },
  LEAVE: {
    label: "Leave",
    className: "bg-primary/10 text-primary border-blue-500/20",
  },
  HALF_DAY: {
    label: "Half Day",
    className: "bg-purple text-accent border-purple",
  },
  EARLY_LEAVE: {
    label: "Early Leave",
    className: "bg-warning/10 text-warning border-orange-500/20",
  },
  HOLIDAY: {
    label: "Holiday",
    className: "bg-successteal text-success border-teal-500/20",
  },
  WFH: {
    label: "Work From Home",
    className: "bg-cyan text-accent border-cyan-500/20",
  },
  OFF_DAY: {
    label: "Off Day",
    className: "bg-mutedgray text-muted-foreground border-gray-500/20",
  },
};

export function AttendanceEventDetail({
  event,
  open,
  onClose,
  onEdit,
  onDelete,
}: AttendanceEventDetailProps) {
  if (!event) return null;

  const statusConfig = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.PRESENT;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Attendance Details
          </DialogTitle>
          <DialogDescription>
            View and manage attendance record information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={cn("text-xs font-medium", statusConfig.className)}>
              {statusConfig.label}
            </Badge>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(event)}
                className="h-8 w-8"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(event.id)}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Employee Info */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Employee
                </p>
                <p className="font-medium">{event.employeeName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</p>
                <p className="font-medium">
                  {format(event.date, "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Check In
                </p>
                <p className="font-medium">
                  {event.checkInTime || "Not recorded"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Check Out
                </p>
                <p className="font-medium">
                  {event.checkOutTime || "Not recorded"}
                </p>
              </div>
            </div>

            {event.notes && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Note
                    </p>
                    <p className="text-sm leading-relaxed">
                      {event.notes}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
