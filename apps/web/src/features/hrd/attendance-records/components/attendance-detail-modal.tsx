"use client";

import { useState } from "react";
import {
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  Clock,
  
  User,
  FileText,
  CalendarIcon,
  Home,
  Coffee,
  Briefcase,
  
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
import { formatDate } from "@/lib/utils";
import type { AttendanceRecord, AttendanceStatus } from "../types";
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
    { enabled: open && !!record?.id }
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

  const getStatusBadge = (status?: AttendanceStatus) => {
    switch (status) {
      case "PRESENT":
        return (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" /> {t("status.PRESENT")}
          </Badge>
        );
      case "LATE":
        return (
          <Badge variant="warning">
            <Clock className="h-3 w-3 mr-1" /> {t("status.LATE")}
          </Badge>
        );
      case "ABSENT":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" /> {t("status.ABSENT")}
          </Badge>
        );
      case "HALF_DAY":
        return (
          <Badge variant="secondary">
            <Coffee className="h-3 w-3 mr-1" /> {t("status.HALF_DAY")}
          </Badge>
        );
      case "HOLIDAY":
        return (
          <Badge variant="info">
            <CalendarIcon className="h-3 w-3 mr-1" /> {t("status.HOLIDAY")}
          </Badge>
        );
      case "LEAVE":
        return (
          <Badge variant="outline">
            <CalendarIcon className="h-3 w-3 mr-1" /> {t("status.LEAVE")}
          </Badge>
        );
      case "WFH":
        return (
          <Badge variant="info">
            <Home className="h-3 w-3 mr-1" /> WFH
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCheckInTypeLabel = (type: string) => {
    switch (type) {
      case "NORMAL":
        return "Office";
      case "WFH":
        return "Work From Home";
      case "FIELD_WORK":
        return "Field Work";
      default:
        return type;
    }
  };

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
                <div className="flex items-center gap-3">
                  {getStatusBadge(displayRecord.status)}
                  <span className="text-sm text-muted-foreground flex items-center">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {formatDate(displayRecord.date)}
                  </span>
                </div>
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

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("fields.workingHours")}
                    </p>
                    <p className="text-2xl font-semibold">
                      {displayRecord.working_hours || "-"}
                    </p>
                  </div>
                  <Clock className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("stats.totalWorkingHoursDescription")}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("fields.overtimeHours")}
                    </p>
                    <p className="text-2xl font-semibold">
                      {displayRecord.overtime_hours || "-"}
                    </p>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-warning" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("stats.totalOvertimeDescription")}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("fields.lateMinutes")}
                    </p>
                    <p className="text-2xl font-semibold text-destructive">
                      {displayRecord.late_minutes > 0
                        ? `${displayRecord.late_minutes}m`
                        : "-"}
                    </p>
                  </div>
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("stats.totalLateDescription")}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("fields.status")}
                    </p>
                    <div className="mt-1">{getStatusBadge(displayRecord.status)}</div>
                  </div>
                  <Shield className="h-6 w-6 text-primary" />
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
                        {displayRecord.check_in_time ?? "-"}
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
                    {(displayRecord.check_in_latitude != null && displayRecord.check_in_longitude != null) && (
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-muted-foreground">
                          GPS:
                        </span>
                        <span className="col-span-2 font-mono text-xs">
                          {displayRecord.check_in_latitude?.toFixed(6)}, {displayRecord.check_in_longitude?.toFixed(6)}
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
                        {displayRecord.check_out_time ?? "-"}
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
                    {(displayRecord.check_out_latitude != null && displayRecord.check_out_longitude != null) && (
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-muted-foreground">
                          GPS:
                        </span>
                        <span className="col-span-2 font-mono text-xs">
                          {displayRecord.check_out_latitude?.toFixed(6)}, {displayRecord.check_out_longitude?.toFixed(6)}
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

              {/* Working Time Stats */}
              <div className="bg-muted/30 p-4 rounded-xl space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> {t("fields.workingMinutes")}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-background rounded-lg border">
                    <p className="text-2xl font-bold">
                      {displayRecord.working_hours || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("stats.totalWorkingHours")}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg border">
                    <p className="text-2xl font-bold">
                      {displayRecord.overtime_hours || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("fields.overtimeMinutes")}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg border">
                    <p className="text-2xl font-bold text-destructive">
                      {displayRecord.late_minutes > 0
                        ? `${displayRecord.late_minutes}m`
                        : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("fields.lateMinutes")}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg border">
                    <p className="text-2xl font-bold text-warning">
                      {displayRecord.early_leave_minutes > 0
                        ? `${displayRecord.early_leave_minutes}m`
                        : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Early Leave
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes & Manual Entry */}
              {(displayRecord.notes ||
                displayRecord.is_manual_entry) && (
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
                        {displayRecord.approved_by_name || displayRecord.approved_by}
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
                        {displayRecord.work_schedule_name || displayRecord.work_schedule_id}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="col-span-2">
                      {displayRecord.created_at
                        ? new Date(displayRecord.created_at).toLocaleString("id-ID")
                        : "-"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="col-span-2">
                      {displayRecord.updated_at
                        ? new Date(displayRecord.updated_at).toLocaleString("id-ID")
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
