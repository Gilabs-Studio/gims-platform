"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ButtonLoading } from "@/components/loading";
import { toast } from "sonner";
import {
  Edit,
  Trash2,
  Info,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  FileText,
  Award,
} from "lucide-react";
import { useLeaveRequest, useDeleteLeaveRequest, useApproveLeaveRequest, useRejectLeaveRequest, useCancelLeaveRequest } from "../hooks/use-leave-requests";
import { useUserPermission } from "@/hooks/use-user-permission";
import { LeaveRequestForm } from "./leave-request-form";
import type { LeaveRequest } from "../types";
import { formatDate } from "@/lib/utils";

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
  const [cancellationNote, setCancellationNote] = useState("");

  // Fetch full detail with nested objects
  const { data: detailData, isLoading } = useLeaveRequest(
    leaveRequest?.id ?? "",
    { enabled: open && !!leaveRequest?.id }
  );

  const canUpdate = useUserPermission("leave_request.update");
  const canDelete = useUserPermission("leave_request.delete");
  const canApprove = useUserPermission("leave_request.approve");

  const deleteLeaveRequest = useDeleteLeaveRequest();
  const approveMutation = useApproveLeaveRequest();
  const rejectMutation = useRejectLeaveRequest();
  const cancelMutation = useCancelLeaveRequest();

  if (!leaveRequest) return null;

  // Use detailed data if available, otherwise use passed leave request
  const displayLeaveRequest = detailData?.data ?? leaveRequest;
  const isDetailedData = !!detailData?.data;

  const getStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return (
          <Badge variant="warning" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {t("status.pending")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {t("status.approved")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive" className="text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1.5" />
            {t("status.rejected")}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1.5" />
            {t("status.cancelled")}
          </Badge>
        );
      default:
        return <Badge className="text-xs font-medium">{status}</Badge>;
    }
  };

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
                  {t("view")}
                </DialogTitle>
                <div className="flex items-center gap-3">
                  {leaveRequest && getStatusBadge(leaveRequest.status)}
                  <span className="text-sm text-muted-foreground">
                    {formatDate(leaveRequest.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canUpdate && leaveRequest?.status?.toUpperCase() === "PENDING" && (
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
                {canDelete && leaveRequest?.status?.toUpperCase() === "PENDING" && (
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
                {leaveRequest?.status?.toUpperCase() === "PENDING" && canApprove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                    title={t("actions.approve")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                {leaveRequest?.status?.toUpperCase() === "PENDING" && canApprove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                    title={t("actions.reject")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
                {((leaveRequest?.status?.toUpperCase() === "PENDING") || (leaveRequest?.status?.toUpperCase() === "APPROVED")) && canApprove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCancelDialogOpen(true)}
                    disabled={cancelMutation.isPending}
                    className="cursor-pointer text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    title={t("actions.cancel")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-6 py-4">
              <div className="flex gap-6">
                <Skeleton className="h-20 flex-1" />
                <Skeleton className="h-20 flex-1" />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="general" className="w-full">
              <TabsList>
                <TabsTrigger value="general">
                  <Info className="h-4 w-4 mr-2" />
                  {t("tabs.general")}
                </TabsTrigger>
                <TabsTrigger value="timeline">
                  <Clock className="h-4 w-4 mr-2" />
                  {t("tabs.timeline")}
                </TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-8 py-6">
                {/* Summary Card */}
                <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-background border border-primary/20 shadow-sm">
                  <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                  <div className="relative p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-muted-foreground mb-1">
                          {t("employee")}
                        </span>
                        <span className="text-lg font-semibold">
                          {isDetailedData && "employee" in displayLeaveRequest
                            ? displayLeaveRequest.employee.name
                            : "employee_name" in displayLeaveRequest
                            ? displayLeaveRequest.employee_name
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-muted-foreground mb-1">
                          {t("leaveType")}
                        </span>
                        <span className="text-lg font-semibold">
                          {isDetailedData && "leave_type" in displayLeaveRequest && typeof displayLeaveRequest.leave_type === "object"
                            ? displayLeaveRequest.leave_type.name
                            : typeof displayLeaveRequest.leave_type === "string" 
                            ? displayLeaveRequest.leave_type
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-muted-foreground mb-1">
                          {t("totalDays")}
                        </span>
                        <span className="text-lg font-semibold text-primary">
                          {displayLeaveRequest.total_days} {t("days")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Employee Information */}
                  {isDetailedData && "employee" in displayLeaveRequest && (
                    <div className="space-y-4 p-6 rounded-xl border bg-card">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg">{t("employeeInfo")}</h3>
                      </div>
                      <Separator />
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t("employeeCode")}</span>
                          <span className="font-medium">{displayLeaveRequest.employee.employee_code}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t("employeeName")}</span>
                          <span className="font-medium">{displayLeaveRequest.employee.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t("employeeEmail")}</span>
                          <span className="font-medium">{displayLeaveRequest.employee.email}</span>
                        </div>
                        {displayLeaveRequest.employee.phone && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">{t("employeePhone")}</span>
                            <span className="font-medium">{displayLeaveRequest.employee.phone}</span>
                          </div>
                        )}
                        {displayLeaveRequest.employee.position && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">{t("employeePosition")}</span>
                            <span className="font-medium">{displayLeaveRequest.employee.position}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Leave Request Details */}
                  <div className="space-y-4 p-6 rounded-xl border bg-card">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg">{t("leaveDetails")}</h3>
                    </div>
                    <Separator />
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t("startDate")}</span>
                        <span className="font-medium">{formatDate(displayLeaveRequest.start_date)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t("endDate")}</span>
                        <span className="font-medium">{formatDate(displayLeaveRequest.end_date)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t("duration")}</span>
                        <span className="font-medium">
                          {displayLeaveRequest.duration === "FULL_DAY" ? t("form.duration.fullDay") :
                           displayLeaveRequest.duration === "HALF_DAY" ? t("form.duration.halfDay") :
                           t("form.duration.multiDay")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t("totalDays")}</span>
                        <span className="font-medium text-primary">{displayLeaveRequest.total_days} {t("days")}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t("status.label")}</span>
                        {getStatusBadge(displayLeaveRequest.status)}
                      </div>
                    </div>
                  </div>

                  {/* Leave Type Information */}
                  {isDetailedData && "leave_type" in displayLeaveRequest && typeof displayLeaveRequest.leave_type === "object" && (
                    <div className="space-y-4 p-6 rounded-xl border bg-card">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Award className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg">{t("leaveTypeInfo")}</h3>
                      </div>
                      <Separator />
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t("leaveTypeName")}</span>
                          <span className="font-medium">{displayLeaveRequest.leave_type.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t("leaveTypeCode")}</span>
                          <span className="font-medium">{displayLeaveRequest.leave_type.code}</span>
                        </div>
                        {displayLeaveRequest.leave_type.description && (
                          <div className="pt-2">
                            <span className="text-sm text-muted-foreground mb-1 block">{t("leaveTypeDescription")}</span>
                            <p className="text-sm">{displayLeaveRequest.leave_type.description}</p>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t("cutsAnnualLeave")}</span>
                          <Badge variant={displayLeaveRequest.leave_type.is_cut_annual_leave ? "default" : "secondary"}>
                            {displayLeaveRequest.leave_type.is_cut_annual_leave ? t("yes") : t("no")}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reason */}
                  <div className="space-y-4 p-6 rounded-xl border bg-card">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg">{t("reason")}</h3>
                    </div>
                    <Separator />
                    <p className="text-sm pt-2 leading-relaxed">{displayLeaveRequest.reason}</p>
                  </div>
                </div>

                {/* Approval Information */}
                {isDetailedData && "approved_by" in displayLeaveRequest && displayLeaveRequest.approved_by && (
                  <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-green-500/10 via-green-500/5 to-background border border-green-500/20 shadow-sm">
                    <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                    <div className="relative p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <h3 className="font-semibold text-lg">{t("approvalInfo")}</h3>
                      </div>
                      <Separator className="mb-4" />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-muted-foreground block mb-1">{t("approvedBy")}</span>
                          <span className="font-medium">{displayLeaveRequest.approved_by.name}</span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground block mb-1">{t("approvedAt")}</span>
                          <span className="font-medium">{formatDate(displayLeaveRequest.approved_at ?? "")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejection Information - only for REJECTED status */}
                {isDetailedData && "rejection_note" in displayLeaveRequest && displayLeaveRequest.rejection_note && displayLeaveRequest.status === "REJECTED" && (
                  <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-red-500/10 via-red-500/5 to-background border border-red-500/20 shadow-sm">
                    <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                    <div className="relative p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-red-500/10">
                          <XCircle className="h-5 w-5 text-red-600" />
                        </div>
                        <h3 className="font-semibold text-lg">{t("rejectionInfo")}</h3>
                      </div>
                      <Separator className="mb-4" />
                      <div>
                        <span className="text-sm text-muted-foreground block mb-2">{t("rejectionNote")}</span>
                        <p className="text-sm leading-relaxed">{displayLeaveRequest.rejection_note}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cancellation Information - only for CANCELLED status */}
                {isDetailedData && "rejection_note" in displayLeaveRequest && displayLeaveRequest.rejection_note && displayLeaveRequest.status === "CANCELLED" && (
                  <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-orange-500/10 via-orange-500/5 to-background border border-orange-500/20 shadow-sm">
                    <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                    <div className="relative p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <XCircle className="h-5 w-5 text-orange-600" />
                        </div>
                        <h3 className="font-semibold text-lg">{t("cancellationInfo")}</h3>
                      </div>
                      <Separator className="mb-4" />
                      <div>
                        <span className="text-sm text-muted-foreground block mb-2">{t("cancellationNote")}</span>
                        <p className="text-sm leading-relaxed">{displayLeaveRequest.rejection_note}</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="space-y-4 py-6">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="p-2 rounded-full bg-primary text-primary-foreground">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="w-px h-full bg-border min-h-10" />
                    </div>
                    <div className="flex-1 pb-8">
                      <p className="font-medium">{t("timeline.created")}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(displayLeaveRequest.created_at)}</p>
                    </div>
                  </div>

                  {displayLeaveRequest.updated_at !== displayLeaveRequest.created_at && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="p-2 rounded-full bg-blue-500 text-white">
                          <Edit className="h-4 w-4" />
                        </div>
                        <div className="w-px h-full bg-border min-h-10" />
                      </div>
                      <div className="flex-1 pb-8">
                        <p className="font-medium">{t("timeline.updated")}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(displayLeaveRequest.updated_at)}</p>
                      </div>
                    </div>
                  )}

                  {isDetailedData && "approved_at" in displayLeaveRequest && displayLeaveRequest.approved_at && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="p-2 rounded-full bg-green-500 text-white">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="w-px h-full bg-border min-h-10" />
                      </div>
                      <div className="flex-1 pb-8">
                        <p className="font-medium">{t("timeline.approved")}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(displayLeaveRequest.approved_at)}</p>
                        {displayLeaveRequest.approved_by && (
                          <p className="text-sm text-muted-foreground">{t("by")} {displayLeaveRequest.approved_by.name}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {isDetailedData && "rejected_at" in displayLeaveRequest && displayLeaveRequest.rejected_at && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="p-2 rounded-full bg-red-500 text-white">
                          <XCircle className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{t("timeline.rejected")}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(displayLeaveRequest.rejected_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
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
