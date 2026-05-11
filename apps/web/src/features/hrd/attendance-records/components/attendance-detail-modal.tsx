"use client";

import { useState } from "react";
import {
  Trash2,
  Pencil,
  Clock,
  User,
  FileText,
  CalendarIcon,
  Shield,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  useAttendanceRecord,
  useDeleteAttendanceRecord,
} from "../hooks/use-attendance-records";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import {
  formatDate,
  formatAttendanceTime,
  getUserTimezone,
  resolveImageUrl,
} from "@/lib/utils";
import type { AttendanceRecord } from "../types";

function formatTime(value: string | null | undefined, date?: string): string {
  return formatAttendanceTime(value, date, getUserTimezone());
}
import { Skeleton } from "@/components/ui/skeleton";

interface AttendanceDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly record: AttendanceRecord | null;
  readonly onEdit?: (record: AttendanceRecord) => void;
}

export function AttendanceDetailModal({
  open,
  onClose,
  record,
  onEdit,
}: AttendanceDetailModalProps) {
  const deleteRecord = useDeleteAttendanceRecord();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const t = useTranslations("hrd.attendance");

  // Fetch full detail
  const { data: detailData, isLoading } = useAttendanceRecord(
    record?.id ?? "",
    { enabled: open && !!record?.id },
  );

  const canEdit = useUserPermission("attendance.update");
  const canDelete = useUserPermission("attendance.delete");

  if (!record) return null;

  const displayRecord = detailData?.data ?? record;

  const handleDelete = async () => {
    if (!record?.id) return;
    try {
      await deleteRecord.mutateAsync(record.id);
      toast.success(t("messages.deleteSuccess"));
      onClose();
    } catch {
      // Error handled by api-client
    }
  };

  const getCheckInTypeLabel = (type: string) => {
    switch (type) {
      case "NORMAL":
        return t("checkInType.NORMAL");
      case "WFH":
        return t("checkInType.WFH");
      case "FIELD_WORK":
        return t("checkInType.FIELD_WORK");
      default:
        return type;
    }
  };

  const photoUrl = resolveImageUrl(displayRecord.photo_url);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl mb-2">
                  {t("actions.viewDetails")}
                </DialogTitle>
                <span className="text-sm text-muted-foreground flex items-center">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {formatDate(displayRecord.date)}
                </span>
              </div>
              <div className="flex gap-2">
                {canEdit && onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      onEdit(displayRecord);
                      onClose();
                    }}
                    className="cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="cursor-pointer text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("fields.workingHours")}
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {displayRecord.working_hours || "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("fields.overtimeHours")}
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {displayRecord.overtime_hours || "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("fields.lateMinutes")}
                    </p>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-destructive">
                    {displayRecord.late_minutes > 0
                      ? `${displayRecord.late_minutes}m`
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t("fields.checkInPhoto")}
                </p>
                <div className="h-[260px] overflow-hidden rounded-lg border border-border bg-muted/50">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={t("fields.checkInPhoto")}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                      {t("detail.notRecorded")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {/* Employee Info */}
              <div className="bg-muted/30 p-4 rounded-xl space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" /> {t("fields.employee")}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">
                      {t("fields.employee")}:
                    </span>
                    <span className="col-span-2 font-medium">
                      {displayRecord.employee_name}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Code:</span>
                    <span className="col-span-2 font-medium">
                      {displayRecord.employee_code}
                    </span>
                  </div>
                  {displayRecord.division_name && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">
                        {t("fields.division")}:
                      </span>
                      <span className="col-span-2 font-medium">
                        {displayRecord.division_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Check-in/out Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-muted/30 p-4 rounded-xl space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" /> {t("fields.checkInTime")}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="col-span-2 font-medium">
                        {formatTime(
                          displayRecord.check_in_time,
                          displayRecord.date,
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="col-span-2 font-medium">
                        {getCheckInTypeLabel(displayRecord.check_in_type)}
                      </span>
                    </div>
                    {displayRecord.check_in_address && (
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-muted-foreground">
                          {t("fields.location")}:
                        </span>
                        <span className="col-span-2 font-medium">
                          {displayRecord.check_in_address}
                        </span>
                      </div>
                    )}
                    {displayRecord.check_in_latitude != null &&
                      displayRecord.check_in_longitude != null && (
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-muted-foreground">GPS:</span>
                          <span className="col-span-2 font-mono text-xs">
                            {displayRecord.check_in_latitude?.toFixed(6)},{" "}
                            {displayRecord.check_in_longitude?.toFixed(6)}
                          </span>
                        </div>
                      )}
                    {displayRecord.check_in_note && (
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-muted-foreground">
                          {t("fields.note")}:
                        </span>
                        <span className="col-span-2">
                          {displayRecord.check_in_note}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-xl space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" /> {t("fields.checkOutTime")}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="col-span-2 font-medium">
                        {formatTime(
                          displayRecord.check_out_time,
                          displayRecord.date,
                        )}
                      </span>
                    </div>
                    {displayRecord.check_out_address && (
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-muted-foreground">
                          {t("fields.location")}:
                        </span>
                        <span className="col-span-2 font-medium">
                          {displayRecord.check_out_address}
                        </span>
                      </div>
                    )}
                    {displayRecord.check_out_latitude != null &&
                      displayRecord.check_out_longitude != null && (
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-muted-foreground">GPS:</span>
                          <span className="col-span-2 font-mono text-xs">
                            {displayRecord.check_out_latitude?.toFixed(6)},{" "}
                            {displayRecord.check_out_longitude?.toFixed(6)}
                          </span>
                        </div>
                      )}
                    {displayRecord.check_out_note && (
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-muted-foreground">
                          {t("fields.note")}:
                        </span>
                        <span className="col-span-2">
                          {displayRecord.check_out_note}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Notes & Manual Entry */}
              {(displayRecord.notes || displayRecord.is_manual_entry) && (
                <div className="bg-muted/30 p-4 rounded-xl space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" /> {t("fields.note")}
                  </h3>
                  {displayRecord.is_manual_entry && (
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Manual Entry</Badge>
                      {displayRecord.manual_entry_reason && (
                        <span className="text-sm text-muted-foreground">
                          — {displayRecord.manual_entry_reason}
                        </span>
                      )}
                    </div>
                  )}
                  {displayRecord.notes && (
                    <p className="bg-background p-2 rounded border whitespace-pre-wrap text-sm">
                      {displayRecord.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Additional Info: Approved By, Leave Request, Timestamps */}
              <div className="bg-muted/30 p-4 rounded-xl space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" /> {t("detail.notesAndInfo")}
                </h3>
                <div className="space-y-2 text-sm">
                  {displayRecord.approved_by && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">
                        Approved By:
                      </span>
                      <span className="col-span-2 font-medium">
                        {displayRecord.approved_by_name ||
                          displayRecord.approved_by}
                      </span>
                    </div>
                  )}
                  {displayRecord.leave_request_id && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">
                        Leave Request:
                      </span>
                      <span className="col-span-2 font-mono text-xs">
                        {displayRecord.leave_request_id}
                      </span>
                    </div>
                  )}
                  {displayRecord.work_schedule_id && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">
                        Work Schedule:
                      </span>
                      <span className="col-span-2 font-medium">
                        {displayRecord.work_schedule_name ||
                          displayRecord.work_schedule_id}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="col-span-2">
                      {displayRecord.created_at
                        ? new Date(displayRecord.created_at).toLocaleString(
                            "id-ID",
                          )
                        : "-"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="col-span-2">
                      {displayRecord.updated_at
                        ? new Date(displayRecord.updated_at).toLocaleString(
                            "id-ID",
                          )
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DeleteDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={handleDelete}
            isLoading={deleteRecord.isPending}
            title={t("actions.delete")}
            description={t("messages.deleteConfirm")}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
