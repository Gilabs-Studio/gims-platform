"use client";

import { format } from "date-fns";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Clock3,
  Ban,
  Eye,
  Pencil,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import type { CalendarEvent, OvertimeStatus } from "../types";
import { useUserPermission } from "@/hooks/use-user-permission";

interface OvertimeDayViewProps {
  readonly selectedDate: Date;
  readonly events: readonly CalendarEvent[];
  readonly onBack: () => void;
  readonly onView: (event: CalendarEvent) => void;
  readonly onEdit: (event: CalendarEvent) => void;
  readonly onApprove: (event: CalendarEvent) => void;
  readonly onReject: (event: CalendarEvent) => void;
  readonly onDelete: (id: string) => void;
  readonly page: number;
  readonly perPage: number;
  readonly onPageChange: (page: number) => void;
  readonly onPerPageChange: (perPage: number) => void;
}

function getStatusBadge(status: OvertimeStatus) {
  switch (status) {
    case "APPROVED":
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
        </Badge>
      );
    case "PENDING":
      return (
        <Badge variant="warning">
          <Clock3 className="h-3 w-3 mr-1" /> Pending
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" /> Rejected
        </Badge>
      );
    case "CANCELED":
      return (
        <Badge variant="secondary">
          <Ban className="h-3 w-3 mr-1" /> Canceled
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case "AUTO_DETECTED":
      return (
        <Badge variant="outline" className="text-blue-600">
          Auto Detected
        </Badge>
      );
    case "MANUAL_CLAIM":
      return (
        <Badge variant="outline" className="text-orange-600">
          Manual Claim
        </Badge>
      );
    case "PRE_APPROVED":
      return (
        <Badge variant="outline" className="text-green-600">
          Pre Approved
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

export function OvertimeDayView({
  selectedDate,
  events,
  onBack,
  onView,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
}: OvertimeDayViewProps) {
  const t = useTranslations("hrd.overtime");
  const tCommon = useTranslations("common");

  const canView = useUserPermission("overtime.read");
  const canUpdate = useUserPermission("overtime.update");
  const canDelete = useUserPermission("overtime.delete");
  const canApprove = useUserPermission("overtime.approve");

  // Pagination logic
  const total = events.length;
  const totalPages = Math.ceil(total / perPage);
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedEvents = events.slice(startIndex, endIndex);

  const canEditRecord = (event: CalendarEvent) => {
    return event.status === "PENDING" && canUpdate;
  };

  const canDeleteRecord = (event: CalendarEvent) => {
    return event.status === "PENDING" && canDelete;
  };

  const canApproveRecord = (event: CalendarEvent) => {
    return event.status === "PENDING" && canApprove;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToCalendar")}
          </Button>
          <h2 className="text-xl font-semibold">
            {format(selectedDate, "EEEE, dd MMMM yyyy")}
          </h2>
        </div>
        <div className="text-sm text-muted-foreground">
          {total} {t("records")}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("noRecordsForDate")}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-base">
                      {event.employeeName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({event.employeeCode})
                    </span>
                    {event.divisionName && (
                      <span className="text-sm text-muted-foreground">
                        • {event.divisionName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {event.startTime.substring(0, 5)} -{" "}
                        {event.endTime.substring(0, 5)}
                      </span>
                      <span className="font-medium text-foreground">
                        ({event.plannedHours})
                      </span>
                    </div>
                  </div>

                  {event.reason && (
                    <div className="text-sm text-muted-foreground line-clamp-1 max-w-xl">
                      {event.reason}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {getStatusBadge(event.status)}
                    {getTypeBadge(event.requestType)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(event)}
                      className="cursor-pointer"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {tCommon("view")}
                    </Button>
                  )}

                  {canEditRecord(event) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(event)}
                      className="cursor-pointer"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      {tCommon("edit")}
                    </Button>
                  )}

                  {canApproveRecord(event) && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onApprove(event)}
                        className="cursor-pointer text-green-600 hover:text-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {t("actions.approve")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReject(event)}
                        className="cursor-pointer text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t("actions.reject")}
                      </Button>
                    </>
                  )}

                  {canDeleteRecord(event) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(event.id)}
                      className="cursor-pointer text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {tCommon("delete")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <DataTablePagination
              pageIndex={page}
              pageSize={perPage}
              rowCount={total}
              onPageChange={onPageChange}
              onPageSizeChange={(value) => {
                onPerPageChange(value);
                onPageChange(1);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
