"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import {
  ArrowLeft,
  Briefcase,
  Users,
  Clock,
  FileText,
  CheckCircle2,
  User,
  Building2,
  Banknote,
  Plus,
  Send,
  XCircle,
  Lock,
  Ban,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency } from "@/lib/utils";
import {
  useRecruitmentRequest,
  useSubmitRecruitmentRequest,
  useApproveRecruitmentRequest,
  useRejectRecruitmentRequest,
  useCancelRecruitmentRequest,
  useOpenRecruitmentRequest,
  useCloseRecruitmentRequest,
} from "../hooks/use-recruitment";
import { useDeleteApplicant } from "../hooks/use-applicants";
import { ApplicantKanbanBoard } from "./applicant-kanban-board";
import { ApplicantDetailSheet } from "./applicant-detail-sheet";
import { ApplicantForm } from "./applicant-form";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import type { RecruitmentStatus, RecruitmentApplicant } from "../types";

interface RecruitmentDetailPageProps {
  id: string;
}

function getStatusBadge(status: RecruitmentStatus, t: (key: string) => string) {
  switch (status) {
    case "DRAFT":
      return (
        <Badge variant="secondary">
          <FileText className="h-3 w-3 mr-1" />
          {t("status.draft")}
        </Badge>
      );
    case "PENDING":
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          {t("status.pending")}
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t("status.approved")}
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          {t("status.rejected")}
        </Badge>
      );
    case "OPEN":
      return (
        <Badge variant="info">
          <Briefcase className="h-3 w-3 mr-1" />
          {t("status.open")}
        </Badge>
      );
    case "CLOSED":
      return (
        <Badge variant="secondary">
          <Lock className="h-3 w-3 mr-1" />
          {t("status.closed")}
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="destructive">
          <Ban className="h-3 w-3 mr-1" />
          {t("status.cancelled")}
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}

function getRecruitmentTimelineInfo(
  t: (key: string, values?: Record<string, any>) => string,
  locale: string,
  requestDateStr?: string,
  expectedDateStr?: string,
) {
  const formatHumanDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (!expectedDateStr) {
    return {
      phrase: requestDateStr
        ? t("timeline.requestedOn", { date: formatHumanDate(requestDateStr) })
        : t("timeline.noSchedule"),
      badgeText: t("timeline.noScheduleBadge"),
      badgeVariant: "secondary" as const,
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(expectedDateStr);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const reqFormatted = requestDateStr ? formatHumanDate(requestDateStr) : "-";
  const expFormatted = formatHumanDate(expectedDateStr);

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    return {
      phrase: `${t("timeline.requestedOn", { date: reqFormatted })} • ${t("timeline.targetOn", { date: expFormatted })}`,
      badgeText: t("timeline.daysOverdue", { days: daysAgo }),
      badgeVariant: "destructive" as const,
    };
  } else if (diffDays === 0) {
    return {
      phrase: `${t("timeline.requestedOn", { date: reqFormatted })} • ${t("timeline.targetOn", { date: expFormatted })}`,
      badgeText: t("timeline.targetToday"),
      badgeVariant: "success" as const,
    };
  } else {
    return {
      phrase: `${t("timeline.requestedOn", { date: reqFormatted })} • ${t("timeline.targetOn", { date: expFormatted })}`,
      badgeText: t("timeline.daysLeft", { days: diffDays }),
      badgeVariant: "default" as const,
    };
  }
}

export function RecruitmentDetailPage({ id }: RecruitmentDetailPageProps) {
  const t = useTranslations("recruitment");
  const router = useRouter();
  const locale = useLocale();

  const canUpdate = useUserPermission("recruitment.update");
  const canApprove = useUserPermission("recruitment.approve");

  const { data, isLoading } = useRecruitmentRequest(id);
  const deleteApplicantMutation = useDeleteApplicant();

  const submitRequest = useSubmitRecruitmentRequest();
  const approveRequest = useApproveRecruitmentRequest();
  const rejectRequest = useRejectRecruitmentRequest();
  const cancelRequest = useCancelRecruitmentRequest();
  const openRequest = useOpenRecruitmentRequest();
  const closeRequest = useCloseRecruitmentRequest();

  const isPendingAction =
    submitRequest.isPending ||
    approveRequest.isPending ||
    rejectRequest.isPending ||
    cancelRequest.isPending ||
    openRequest.isPending ||
    closeRequest.isPending;

  const handleSubmitAction = async () => {
    if (!request) return;
    try {
      await submitRequest.mutateAsync(request.id);
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleApprove = async () => {
    if (!request) return;
    try {
      await approveRequest.mutateAsync(request.id);
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleReject = async () => {
    if (!request) return;
    try {
      await rejectRequest.mutateAsync({ id: request.id });
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleCancel = async () => {
    if (!request) return;
    try {
      await cancelRequest.mutateAsync(request.id);
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleOpen = async () => {
    if (!request) return;
    try {
      await openRequest.mutateAsync(request.id);
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleClose = async () => {
    if (!request) return;
    try {
      await closeRequest.mutateAsync(request.id);
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const [viewingApplicant, setViewingApplicant] = useState<RecruitmentApplicant | null>(null);
  const [editingApplicant, setEditingApplicant] = useState<RecruitmentApplicant | null>(null);
  const [deletingApplicantId, setDeletingApplicantId] = useState<string | null>(null);
  const [isApplicantFormOpen, setIsApplicantFormOpen] = useState(false);
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>();

  const request = data?.data;

  const handleApplicantClick = (applicant: RecruitmentApplicant) => {
    setViewingApplicant(applicant);
  };

  const handleCreateApplicant = (stageId?: string) => {
    if (request?.status !== "OPEN") {
      toast.error(t("timeline.onlyAddInOpenStatus"));
      return;
    }
    setDefaultStageId(stageId);
    setEditingApplicant(null);
    setIsApplicantFormOpen(true);
  };

  const handleEditApplicant = (applicant: RecruitmentApplicant) => {
    setEditingApplicant(applicant);
    setDefaultStageId(undefined);
    setIsApplicantFormOpen(true);
    setViewingApplicant(null);
  };

  const handleDeleteApplicant = async () => {
    if (!deletingApplicantId) return;

    try {
      await deleteApplicantMutation.mutateAsync(deletingApplicantId);
      toast.success(t("applicants.deleted"));
      setDeletingApplicantId(null);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleApplicantFormClose = () => {
    setIsApplicantFormOpen(false);
    setEditingApplicant(null);
    setDefaultStageId(undefined);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <h2 className="text-lg font-semibold">{t("notFound")}</h2>
        <p className="text-sm">{t("requestNotFound")}</p>
        <Button
          variant="outline"
          className="mt-4 cursor-pointer"
          onClick={() => router.push("/hrd/recruitment", { locale })}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("backToList")}
        </Button>
      </div>
    );
  }

  const isOpenStatus = request.status === "OPEN";
  const progressPercent =
    request.required_count > 0 ? (request.filled_count / request.required_count) * 100 : 0;
  const timelineInfo = getRecruitmentTimelineInfo(t, locale, request.request_date, request.expected_start_date);

  const formatHumanDateStr = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer mt-0.5"
            onClick={() => router.push("/hrd/recruitment", { locale })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{request.position_name}</h1>
              {getStatusBadge(request.status, t)}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 font-mono">
              <span>{request.request_code}</span>
              <span>•</span>
              <span className="font-sans text-foreground/80 font-medium">{request.division_name}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Lifecycle actions */}
          {canUpdate && (request.status === "DRAFT" || request.status === "REJECTED") && (
            <Button size="sm" onClick={handleSubmitAction} disabled={isPendingAction} className="cursor-pointer">
              <Send className="h-4 w-4 mr-1" />
              {request.status === "REJECTED" ? t("actions.resubmit") : t("actions.submit")}
            </Button>
          )}
          {canApprove && request.status === "PENDING" && (
            <>
              <Button size="sm" onClick={handleApprove} disabled={isPendingAction} className="cursor-pointer">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {t("actions.approve")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReject}
                disabled={isPendingAction}
                className="cursor-pointer"
              >
                <XCircle className="h-4 w-4 mr-1" />
                {t("actions.reject")}
              </Button>
            </>
          )}
          {canUpdate && request.status === "APPROVED" && (
            <Button size="sm" onClick={handleOpen} disabled={isPendingAction} className="cursor-pointer">
              <Briefcase className="h-4 w-4 mr-1" />
              {t("actions.open")}
            </Button>
          )}
          {canUpdate && request.status === "OPEN" && (
            <Button size="sm" variant="secondary" onClick={handleClose} disabled={isPendingAction} className="cursor-pointer">
              <Lock className="h-4 w-4 mr-1" />
              {t("actions.close")}
            </Button>
          )}
          {canUpdate && (request.status === "DRAFT" || request.status === "PENDING") && (
            <Button size="sm" variant="destructive" onClick={handleCancel} disabled={isPendingAction} className="cursor-pointer">
              <Ban className="h-4 w-4 mr-1" />
              {t("actions.cancelRequest")}
            </Button>
          )}
          {/* Add applicant button (disabled with tooltip when not OPEN) */}
          <Button
            onClick={() => handleCreateApplicant()}
            disabled={!isOpenStatus}
            title={!isOpenStatus ? t("timeline.onlyAddInOpenStatus") : undefined}
            className="cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("applicants.add")}
          </Button>
        </div>
      </div>

      {/* Balanced 1:2 Column Split Layout (Zero Whitespace Void) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Left Column (1/3 Width): Open Positions & Employment Type stacked */}
        <div className="lg:col-span-1 flex flex-col justify-between gap-4">
          {/* Card 1: Open Positions */}
          <Card className="p-4 flex-1 flex flex-col justify-between shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("openPositions")}</p>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-extrabold tracking-tight text-foreground">{request.filled_count}</p>
                <span className="text-muted-foreground text-sm font-semibold">/ {request.required_count} {t("filledCount")}</span>
              </div>
              <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Card 2: Employment Type */}
          <Card className="p-4 flex-1 flex flex-col justify-between shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("employmentType.label")}</p>
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3">
              <p className="text-xl font-bold text-foreground">{t(`employmentType.${request.employment_type}`)}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("timeline.jobTypeDesc")}</p>
            </div>
          </Card>
        </div>

        {/* Right Column (2/3 Width): Integrated Detail Information, Schedule & Requirements Card */}
        <div className="lg:col-span-2">
          <Card className="p-5 h-full flex flex-col justify-between shadow-sm hover:shadow transition-shadow space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                  <FileText className="h-4 w-4 text-primary" />
                  {t("detailInfo")}
                </h3>
              </div>

              {/* Meta Details 4-Column Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/20 p-3 rounded-lg border border-border/50">
                <div className="space-y-1">
                  <span className="text-muted-foreground block font-medium">{t("requestedBy")}:</span>
                  <span className="font-semibold text-foreground block truncate">{request.requested_by?.name || "-"}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground block font-medium">{t("division")}:</span>
                  <span className="font-semibold text-foreground block truncate">{request.division_name}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground block font-medium">{t("position")}:</span>
                  <span className="font-semibold text-foreground block truncate">{request.position_name}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground block font-medium">{t("salaryRange")}:</span>
                  <span className="font-semibold font-mono text-foreground block truncate">
                    {request.salary_range_min != null && request.salary_range_max != null
                      ? `${formatCurrency(request.salary_range_min)} - ${formatCurrency(request.salary_range_max)}`
                      : request.salary_range_min != null
                        ? formatCurrency(request.salary_range_min)
                        : request.salary_range_max != null
                          ? formatCurrency(request.salary_range_max!)
                          : "-"}
                  </span>
                </div>
              </div>

              {/* Integrated Recruitment Schedule & Timeline Sub-Card */}
              <div className="bg-muted/30 p-3.5 rounded-lg border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {t("timeline.scheduleTitle")}
                  </p>
                  <Badge variant={timelineInfo.badgeVariant} className="text-[10px] px-2 py-0.5 font-semibold">
                    {timelineInfo.badgeText}
                  </Badge>
                </div>
                <div className="space-y-0.5 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{timelineInfo.phrase}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-5">
                    {t("timeline.targetEmploymentDate")}: <span className="font-mono font-medium text-foreground">{formatHumanDateStr(request.expected_start_date)}</span>
                  </p>
                </div>
              </div>

              {/* Sub-grid for Job Description & Qualifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Job Description */}
                {request.job_description && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">{t("jobDescription")}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-4">
                      {request.job_description}
                    </p>
                  </div>
                )}

                {/* Qualifications */}
                {request.qualifications && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">{t("qualifications")}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-4">
                      {request.qualifications}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {request.notes && (
              <div className="pt-2 border-t text-xs">
                <p className="font-semibold text-foreground mb-0.5">{t("notes")}:</p>
                <p className="text-muted-foreground italic line-clamp-2">{request.notes}</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Main Content: Applicants Kanban Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t("applicants.title")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t("applicants.dragHelp")}</p>
          </div>
        </div>

        <ApplicantKanbanBoard
          recruitmentRequestId={id}
          onApplicantClick={handleApplicantClick}
          onCreateApplicant={handleCreateApplicant}
          isCreateDisabled={!isOpenStatus}
        />
      </div>

      {/* Applicant Detail Sheet */}
      <ApplicantDetailSheet
        applicantId={viewingApplicant?.id || null}
        open={!!viewingApplicant}
        onOpenChange={(open) => !open && setViewingApplicant(null)}
        onEdit={handleEditApplicant}
        onDelete={setDeletingApplicantId}
      />

      {/* Applicant Form Dialog */}
      <ApplicantForm
        open={isApplicantFormOpen}
        onClose={handleApplicantFormClose}
        recruitmentRequestId={id}
        applicant={editingApplicant}
        defaultStageId={defaultStageId}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingApplicantId}
        onOpenChange={(open) => !open && setDeletingApplicantId(null)}
        onConfirm={handleDeleteApplicant}
        title={t("applicants.delete")}
        description={t("applicants.deleteDesc")}
        itemName={t("applicants.singular")}
        isLoading={deleteApplicantMutation.isPending}
      />
    </div>
  );
}
