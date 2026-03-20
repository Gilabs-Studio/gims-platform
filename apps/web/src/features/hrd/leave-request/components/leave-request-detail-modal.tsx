"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LeaveRequestCalendarRange } from "./leave-request-calendar-range";
import { ButtonLoading } from "@/components/loading";
import { toast } from "sonner";
import {
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useLeaveRequest, useDeleteLeaveRequest, useApproveLeaveRequest, useRejectLeaveRequest, useCancelLeaveRequest } from "../hooks/use-leave-requests";
import { useUserPermission } from "@/hooks/use-user-permission";
import { LeaveRequestForm } from "./leave-request-form";
import { LeaveRequestAuditTrailContent } from "./leave-request-audit-trail";
import type { LeaveRequest } from "../types";
import { formatDate } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface LeaveRequestDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly leaveRequest: LeaveRequest | null;
}

export function LeaveRequestDetailModal({
  open,
  onClose,
  leaveRequest,
}: LeaveRequestDetailModalProps) {
  const t = useTranslations("leaveRequest");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [cancellationNote, setCancellationNote] = useState("");

  // Fetch full detail with nested objects
  const { data: detailData, isLoading } = useLeaveRequest(
    leaveRequest?.id ?? "",
    { enabled: open && !!leaveRequest?.id }
  );

  const canUpdate = useUserPermission("leave_request.update");
  const canDelete = useUserPermission("leave_request.delete");
  const canApprove = useUserPermission("leave_request.approve");
  const canAuditTrail = useUserPermission("leave_request.audit_trail");

  const deleteLeaveRequest = useDeleteLeaveRequest();
  const approveMutation = useApproveLeaveRequest();
  const rejectMutation = useRejectLeaveRequest();
  const cancelMutation = useCancelLeaveRequest();

  // Use detailed data if available, otherwise use passed leave request.
  // We keep hooks order stable even when leaveRequest changes.
  const displayLeaveRequest = detailData?.data ?? leaveRequest;
  const isDetailedData = !!detailData?.data;
  const hasData = Boolean(displayLeaveRequest);

  const getStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return <Badge variant="warning" className="text-xs font-medium">{t("status.pending")}</Badge>;
      case "APPROVED":
        return <Badge variant="success" className="text-xs font-medium">{t("status.approved")}</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" className="text-xs font-medium">{t("status.rejected")}</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary" className="text-xs font-medium">{t("status.cancelled")}</Badge>;
      default:
        return <Badge className="text-xs font-medium">{status}</Badge>;
    }
  };

  const status = (displayLeaveRequest?.status ?? "").toUpperCase();
  const employeeName =
    (displayLeaveRequest && "employee" in displayLeaveRequest ? displayLeaveRequest.employee?.name : undefined) ??
    (displayLeaveRequest && "employee_name" in displayLeaveRequest ? displayLeaveRequest.employee_name : "-");
  const leaveTypeName: string | undefined =
    displayLeaveRequest && typeof displayLeaveRequest.leave_type === "object"
      ? displayLeaveRequest.leave_type?.name
      : typeof displayLeaveRequest?.leave_type === "string"
      ? displayLeaveRequest.leave_type
      : undefined;
  const approvedAt = displayLeaveRequest && "approved_at" in displayLeaveRequest ? displayLeaveRequest.approved_at : null;
  const rejectedAt = displayLeaveRequest && "rejected_at" in displayLeaveRequest ? displayLeaveRequest.rejected_at : null;
  const rejectionNote = displayLeaveRequest && "rejection_note" in displayLeaveRequest ? displayLeaveRequest.rejection_note : null;
  const approvedByName = displayLeaveRequest && "approved_by" in displayLeaveRequest ? displayLeaveRequest.approved_by?.name : undefined;

  const leaveRange = useMemo<DateRange | undefined>(() => {
    const start = displayLeaveRequest?.start_date;
    const end = displayLeaveRequest?.end_date;
    if (!start || !end) return undefined;

    const from = new Date(start);
    const to = new Date(end);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return undefined;

    return { from, to };
  }, [displayLeaveRequest?.end_date, displayLeaveRequest?.start_date]);

  const handleDelete = async () => {
    if (!leaveRequest?.id) return;
    try {
      await deleteLeaveRequest.mutateAsync(leaveRequest.id);
      toast.success(t("messages.deleteSuccess"));
      onClose();
    } catch {
      toast.error(t("messages.deleteError"));
    }
  };

  const handleApprove = async () => {
    if (!leaveRequest?.id) return;
    try {
      await approveMutation.mutateAsync({ id: leaveRequest.id, data: {} });
      toast.success(t("messages.approveSuccess"));
      onClose();
    } catch {
      toast.error(t("messages.approveError"));
    }
  };

  const handleReject = async () => {
    if (!leaveRequest?.id) return;
    try {
      await rejectMutation.mutateAsync({
        id: leaveRequest.id,
        data: { rejection_note: "Rejected from detail view" },
      });
      toast.success(t("messages.rejectSuccess"));
      onClose();
    } catch {
      toast.error(t("messages.rejectError"));
    }
  };

  const handleCancel = async () => {
    if (!leaveRequest?.id) return;
    try {
      await cancelMutation.mutateAsync({
        id: leaveRequest.id,
        data: { cancellation_note: cancellationNote || undefined },
      });
      toast.success(t("messages.cancelSuccess"));
      setIsCancelDialogOpen(false);
      setCancellationNote("");
      onClose();
    } catch {
      toast.error(t("messages.cancelError"));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">
                  {employeeName}
                </DialogTitle>
                <div className="flex items-center gap-3">
                  {getStatusBadge(status)}
                  <span className="text-sm text-muted-foreground">
                    {formatDate(displayLeaveRequest?.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canUpdate && status === "PENDING" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="cursor-pointer"
                    title={t("actions.edit")}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && status === "PENDING" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="cursor-pointer text-destructive hover:text-destructive"
                    title={t("actions.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {status === "PENDING" && canApprove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="cursor-pointer text-success hover:text-success hover:bg-green-50"
                    title={t("actions.approve")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                {status === "PENDING" && canApprove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                    className="cursor-pointer text-destructive hover:text-destructive hover:bg-red-50"
                    title={t("actions.reject")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
                {(status === "PENDING" || status === "APPROVED") && canApprove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCancelDialogOpen(true)}
                    disabled={cancelMutation.isPending}
                    className="cursor-pointer text-warning hover:text-warning hover:bg-orange-50"
                    title={t("actions.cancel")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="general" className="w-full" onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
                {canAuditTrail && <TabsTrigger value="audit_trail">{t("tabs.auditTrail")}</TabsTrigger>}
              </TabsList>

              <TabsContent value="general" className="space-y-6 py-4">
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("employee")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback dataSeed={employeeName ?? "employee"} />
                            </Avatar>
                            <span className="font-medium">{employeeName ?? "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("leaveType")}</TableCell>
                        <TableCell>{leaveTypeName ?? "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("startDate")}</TableCell>
                        <TableCell>{formatDate(displayLeaveRequest?.start_date)}</TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("endDate")}</TableCell>
                        <TableCell>{formatDate(displayLeaveRequest?.end_date)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("duration")}</TableCell>
                        <TableCell>
                          {displayLeaveRequest?.duration === "FULL_DAY"
                            ? t("form.duration.fullDay")
                            : displayLeaveRequest?.duration === "HALF_DAY"
                              ? t("form.duration.halfDay")
                              : t("form.duration.multiDay")}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("totalDays")}</TableCell>
                        <TableCell>
                          {displayLeaveRequest?.total_days ?? "-"} {t("days")}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("status.label")}</TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("approvedAt")}</TableCell>
                        <TableCell>
                          {approvedAt ? formatDate(approvedAt) : "-"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("reason")}</TableCell>
                        <TableCell colSpan={3}>{displayLeaveRequest?.reason ?? "-"}</TableCell>
                      </TableRow>
                      {rejectionNote && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">
                            {status === "CANCELLED" ? t("cancellationNote") : t("rejectionNote")}
                          </TableCell>
                          <TableCell colSpan={3}>{rejectionNote}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <Separator />
                <div>
                  <h3 className="mb-3 text-sm font-semibold">{t("calendarRange.title")}</h3>
                  <div className="rounded-lg border p-3">
                    <div className="mx-auto max-w-[740px] flex justify-center">
                      <LeaveRequestCalendarRange
                        range={leaveRange}
                        className="mx-auto"
                      />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {t("calendarRange.description", {
                        from: formatDate(displayLeaveRequest?.start_date),
                        to: formatDate(displayLeaveRequest?.end_date),
                      })}
                    </p>
                  </div>
                </div>

                <Separator />
                <div>
                  <h3 className="mb-3 text-sm font-semibold">{t("tabs.timeline")}</h3>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50 w-48">{t("timeline.created")}</TableCell>
                          <TableCell>{formatDate(displayLeaveRequest?.created_at)}</TableCell>
                        </TableRow>
                        {(displayLeaveRequest?.updated_at && displayLeaveRequest.updated_at !== displayLeaveRequest?.created_at) && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("timeline.updated")}</TableCell>
                            <TableCell>{formatDate(displayLeaveRequest.updated_at)}</TableCell>
                          </TableRow>
                        )}
                        {approvedAt && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("timeline.approved")}</TableCell>
                            <TableCell>
                              {formatDate(approvedAt)}
                              {approvedByName ? ` (${t("by")} ${approvedByName})` : ""}
                            </TableCell>
                          </TableRow>
                        )}
                        {rejectedAt && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("timeline.rejected")}</TableCell>
                            <TableCell>{formatDate(rejectedAt)}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {canAuditTrail && (
                <TabsContent value="audit_trail" className="py-4">
                  <LeaveRequestAuditTrailContent
                    enabled={open && !!leaveRequest?.id && activeTab === "audit_trail"}
                    leaveRequestId={leaveRequest?.id}
                  />
                </TabsContent>
              )}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {leaveRequest && (
        <LeaveRequestForm
          open={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          leaveRequest={leaveRequest}
        />
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDialog.description")}
        isLoading={deleteLeaveRequest.isPending}
      />

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cancelDialog.title")}</DialogTitle>
            <DialogDescription>{t("cancelDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Field>
              <FieldLabel>{t("form.cancellationNote.label")}</FieldLabel>
              <Textarea
                value={cancellationNote}
                onChange={(e) => setCancellationNote(e.target.value)}
                placeholder={t("form.cancellationNote.placeholder")}
                rows={4}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelDialogOpen(false);
                setCancellationNote("");
              }}
            >
              {t("cancelDialog.cancel")}
            </Button>
            <Button
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <ButtonLoading loading>{t("cancelDialog.confirm")}</ButtonLoading>
              ) : (
                t("cancelDialog.confirm")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
