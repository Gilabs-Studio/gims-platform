"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  Briefcase,
  Lock,
  Ban,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useUserPermission } from "@/hooks/use-user-permission";
import {
  useRecruitmentRequest,
  useSubmitRecruitmentRequest,
  useApproveRecruitmentRequest,
  useRejectRecruitmentRequest,
  useOpenRecruitmentRequest,
  useCloseRecruitmentRequest,
  useCancelRecruitmentRequest,
} from "../hooks/use-recruitment";
import type {
  RecruitmentRequest,
  RecruitmentStatus,
} from "../types";
import { formatCurrency } from "@/lib/utils";

// Extracted outside component to avoid re-creation during render
function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">
        {children}
      </span>
    </div>
  );
}

interface RecruitmentDetailModalProps {
  open: boolean;
  onClose: () => void;
  recruitmentRequest: RecruitmentRequest;
}

export function RecruitmentDetailModal({
  open,
  onClose,
  recruitmentRequest,
}: RecruitmentDetailModalProps) {
  const t = useTranslations("recruitment");
  const canUpdate = useUserPermission("recruitment.update");
  const canApprove = useUserPermission("recruitment.approve");

  const { data: detailResponse } = useRecruitmentRequest(
    recruitmentRequest.id,
    { enabled: open }
  );
  const detail = detailResponse?.data ?? recruitmentRequest;
  const submitRequest = useSubmitRecruitmentRequest();
  const approveRequest = useApproveRecruitmentRequest();
  const rejectRequest = useRejectRecruitmentRequest();
  const openRequest = useOpenRecruitmentRequest();
  const closeRequest = useCloseRecruitmentRequest();
  const cancelRequest = useCancelRecruitmentRequest();

  const isStatusActionPending =
    submitRequest.isPending ||
    approveRequest.isPending ||
    rejectRequest.isPending ||
    openRequest.isPending ||
    closeRequest.isPending ||
    cancelRequest.isPending;

  const handleStatusAction = async (
    action: "submit" | "approve" | "reject" | "open" | "close" | "cancel",
    notes?: string
  ) => {
    try {
      switch (action) {
        case "submit":
          await submitRequest.mutateAsync(detail.id);
          break;
        case "approve":
          await approveRequest.mutateAsync(detail.id);
          break;
        case "reject":
          await rejectRequest.mutateAsync({ id: detail.id, notes });
          break;
        case "open":
          await openRequest.mutateAsync(detail.id);
          break;
        case "close":
          await closeRequest.mutateAsync(detail.id);
          break;
        case "cancel":
          await cancelRequest.mutateAsync(detail.id);
          break;
      }
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const getStatusBadge = (status: RecruitmentStatus) => {
    const variants: Record<RecruitmentStatus, string> = {
      DRAFT: "secondary",
      PENDING: "outline",
      APPROVED: "success",
      REJECTED: "destructive",
      OPEN: "info",
      CLOSED: "secondary",
      CANCELLED: "destructive",
    };
    const labels: Record<RecruitmentStatus, string> = {
      DRAFT: t("status.draft"),
      PENDING: t("status.pending"),
      APPROVED: t("status.approved"),
      REJECTED: t("status.rejected"),
      OPEN: t("status.open"),
      CLOSED: t("status.closed"),
      CANCELLED: t("status.cancelled"),
    };
    return (
      <Badge
        variant={
          variants[status] as
            | "secondary"
            | "outline"
            | "success"
            | "destructive"
            | "info"
        }
      >
        {labels[status]}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "LOW":
        return <Badge variant="secondary">{t("priority.low")}</Badge>;
      case "MEDIUM":
        return <Badge variant="outline">{t("priority.medium")}</Badge>;
      case "HIGH":
        return <Badge variant="warning">{t("priority.high")}</Badge>;
      case "URGENT":
        return <Badge variant="destructive">{t("priority.urgent")}</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getEmploymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      FULL_TIME: t("employmentType.fullTime"),
      PART_TIME: t("employmentType.partTime"),
      CONTRACT: t("employmentType.contract"),
      INTERN: t("employmentType.intern"),
    };
    return labels[type] ?? type;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{t("detail")}</span>
            {getStatusBadge(detail.status)}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="cursor-pointer">
              {t("tabs.general")}
            </TabsTrigger>
            <TabsTrigger value="requirements" className="cursor-pointer">
              {t("tabs.requirements")}
            </TabsTrigger>
            <TabsTrigger value="workflow" className="cursor-pointer">
              {t("tabs.workflow")}
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="mt-4 space-y-4">
            <div className="rounded-lg border p-4">
              <InfoRow label={t("requestCode")}>{detail.request_code}</InfoRow>
              <Separator />
              <InfoRow label={t("requestDate")}>
                {detail.request_date
                  ? new Date(detail.request_date).toLocaleDateString()
                  : "-"}
              </InfoRow>
              <Separator />
              <InfoRow label={t("requestedBy")}>
                {detail.requested_by?.name ?? "-"}
              </InfoRow>
              <Separator />
              <InfoRow label={t("division")}>
                {detail.division_name ?? "-"}
              </InfoRow>
              <Separator />
              <InfoRow label={t("position")}>
                {detail.position_name ?? "-"}
              </InfoRow>
              <Separator />
              <InfoRow label={t("employmentType.label")}>
                {getEmploymentTypeLabel(detail.employment_type)}
              </InfoRow>
              <Separator />
              <InfoRow label={t("priority.label")}>
                {getPriorityBadge(detail.priority)}
              </InfoRow>
              <Separator />
              <InfoRow label={t("expectedStartDate")}>
                {detail.expected_start_date
                  ? new Date(detail.expected_start_date).toLocaleDateString()
                  : "-"}
              </InfoRow>
              <Separator />
              <InfoRow label={t("requiredCount")}>
                {detail.required_count}
              </InfoRow>
              <Separator />
              <InfoRow label={t("filledCount")}>
                {detail.filled_count}
              </InfoRow>
              <Separator />
              <InfoRow label={t("openPositions")}>
                <span className="font-bold">
                  {detail.open_positions}
                </span>
              </InfoRow>
              {(detail.salary_range_min != null ||
                detail.salary_range_max != null) && (
                <>
                  <Separator />
                  <InfoRow label={t("salaryRange")}>
                    {detail.salary_range_min != null &&
                    detail.salary_range_max != null
                      ? `${formatCurrency(detail.salary_range_min)} - ${formatCurrency(detail.salary_range_max)}`
                      : detail.salary_range_min != null
                        ? `${formatCurrency(detail.salary_range_min)}+`
                        : detail.salary_range_max != null
                          ? `Up to ${formatCurrency(detail.salary_range_max)}`
                          : "-"}
                  </InfoRow>
                </>
              )}
              {detail.notes && (
                <>
                  <Separator />
                  <InfoRow label={t("notes")}>{detail.notes}</InfoRow>
                </>
              )}
            </div>
          </TabsContent>

          {/* Requirements Tab */}
          <TabsContent value="requirements" className="mt-4 space-y-4">
            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {t("jobDescription")}
                </h4>
                <p className="text-sm whitespace-pre-wrap">
                  {detail.job_description || "-"}
                </p>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {t("qualifications")}
                </h4>
                <p className="text-sm whitespace-pre-wrap">
                  {detail.qualifications || "-"}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Workflow Tab */}
          <TabsContent value="workflow" className="mt-4 space-y-4">
            <div className="rounded-lg border p-4">
              <InfoRow label={t("common.status")}>
                {getStatusBadge(detail.status)}
              </InfoRow>
              {detail.approved_by && (
                <>
                  <Separator />
                  <InfoRow label={t("approvedBy")}>
                    {detail.approved_by.name}
                  </InfoRow>
                </>
              )}
              {detail.approved_at && (
                <>
                  <Separator />
                  <InfoRow label={t("approvedAt")}>
                    {new Date(detail.approved_at).toLocaleString()}
                  </InfoRow>
                </>
              )}
              {detail.rejected_at && (
                <>
                  <Separator />
                  <InfoRow label={t("rejectedAt")}>
                    {new Date(detail.rejected_at).toLocaleString()}
                  </InfoRow>
                </>
              )}
              {detail.rejection_notes && (
                <>
                  <Separator />
                  <InfoRow label={t("rejectionNotes")}>
                    {detail.rejection_notes}
                  </InfoRow>
                </>
              )}
              {detail.closed_at && (
                <>
                  <Separator />
                  <InfoRow label={t("closedAt")}>
                    {new Date(detail.closed_at).toLocaleString()}
                  </InfoRow>
                </>
              )}
            </div>

            {/* Status Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {canUpdate &&
                (detail.status === "DRAFT" ||
                  detail.status === "REJECTED") && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusAction("submit")}
                    disabled={isStatusActionPending}
                    className="cursor-pointer"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    {detail.status === "REJECTED"
                      ? t("actions.resubmit")
                      : t("actions.submit")}
                  </Button>
                )}
              {canApprove && detail.status === "PENDING" && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleStatusAction("approve")}
                    disabled={isStatusActionPending}
                    className="cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {t("actions.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStatusAction("reject")}
                    disabled={isStatusActionPending}
                    className="cursor-pointer"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    {t("actions.reject")}
                  </Button>
                </>
              )}
              {canUpdate && detail.status === "APPROVED" && (
                <Button
                  size="sm"
                  onClick={() => handleStatusAction("open")}
                  disabled={isStatusActionPending}
                  className="cursor-pointer"
                >
                  <Briefcase className="h-4 w-4 mr-1" />
                  {t("actions.open")}
                </Button>
              )}
              {canUpdate && detail.status === "OPEN" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleStatusAction("close")}
                  disabled={isStatusActionPending}
                  className="cursor-pointer"
                >
                  <Lock className="h-4 w-4 mr-1" />
                  {t("actions.close")}
                </Button>
              )}
              {canUpdate &&
                (detail.status === "DRAFT" ||
                  detail.status === "PENDING") && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStatusAction("cancel")}
                    disabled={isStatusActionPending}
                    className="cursor-pointer"
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    {t("actions.cancelRequest")}
                  </Button>
                )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
