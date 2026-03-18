"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import {
  ArrowLeft,
  Briefcase,
  Users,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  User,
  Building2,
  Banknote,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRecruitmentRequest } from "../hooks/use-recruitment";
import {
  useDeleteApplicant,
} from "../hooks/use-applicants";
import { ApplicantKanbanBoard } from "./applicant-kanban-board";
import { ApplicantDetailSheet } from "./applicant-detail-sheet";
import { ApplicantForm } from "./applicant-form";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import type {
  RecruitmentRequest,
  RecruitmentStatus,
  RecruitmentApplicant,
} from "../types";

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
          <Clock className="h-3 w-3 mr-1" />
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
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t("status.closed")}
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="destructive">
          <Clock className="h-3 w-3 mr-1" />
          {t("status.cancelled")}
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}

function getPriorityBadge(priority: string, t: (key: string) => string) {
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
}

export function RecruitmentDetailPage({ id }: RecruitmentDetailPageProps) {
  const t = useTranslations("recruitment");
  const router = useRouter();
  const locale = useLocale();

  const { data, isLoading } = useRecruitmentRequest(id);
  const deleteApplicantMutation = useDeleteApplicant();

  const [viewingApplicant, setViewingApplicant] =
    useState<RecruitmentApplicant | null>(null);
  const [editingApplicant, setEditingApplicant] =
    useState<RecruitmentApplicant | null>(null);
  const [deletingApplicantId, setDeletingApplicantId] = useState<string | null>(
    null
  );
  const [isApplicantFormOpen, setIsApplicantFormOpen] = useState(false);
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>();

  const request = data?.data;

  const handleApplicantClick = (applicant: RecruitmentApplicant) => {
    setViewingApplicant(applicant);
  };

  const handleCreateApplicant = (stageId?: string) => {
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
        <Skeleton className="h-32 w-full" />
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
          className="mt-4"
          onClick={() => router.push("/hrd/recruitment", { locale })}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("backToList")}
        </Button>
      </div>
    );
  }

  const progressPercent = request.required_count > 0
    ? (request.filled_count / request.required_count) * 100
    : 0;

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
              <h1 className="text-2xl font-bold tracking-tight">
                {request.request_code}
              </h1>
              {getStatusBadge(request.status, t)}
              {getPriorityBadge(request.priority, t)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {request.division_name} - {request.position_name}
            </p>
          </div>
        </div>

        <Button onClick={() => handleCreateApplicant()}>
          <Plus className="h-4 w-4 mr-2" />
          {t("applicants.add")}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("openPositions")}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold">{request.filled_count}</p>
            <span className="text-muted-foreground">/ {request.required_count}</span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("employmentType.label")}</p>
          <p className="text-lg font-semibold">{t(`employmentType.${request.employment_type.toLowerCase()}`)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("expectedStartDate")}</p>
          <p className="text-lg font-semibold">
            {new Date(request.expected_start_date).toLocaleDateString()}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("requestDate")}</p>
          <p className="text-lg font-semibold">
            {new Date(request.request_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Main Content: Info + Kanban */}
      <div className="space-y-6">
        {/* Detail Information Card */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            {t("detailInfo")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">{t("requestedBy")}:</span>
                <span className="text-sm font-medium">{request.requested_by?.name || "-"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">{t("division")}:</span>
                <span className="text-sm font-medium">{request.division_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">{t("position")}:</span>
                <span className="text-sm font-medium">{request.position_name}</span>
              </div>
              {(request.salary_range_min || request.salary_range_max) && (
                <div className="flex items-center gap-3">
                  <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{t("salaryRange")}:</span>
                  <span className="text-sm font-medium">
                    {request.salary_range_min?.toLocaleString()} - {request.salary_range_max?.toLocaleString()}
                  </span>
                </div>
              )}
              {request.notes && (
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{t("notes")}:</span>
                  <span className="text-sm font-medium line-clamp-1">{request.notes}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-3">
              {request.job_description && (
                <div>
                  <p className="text-sm font-medium mb-1">{t("jobDescription")}</p>
                  <p className="text-sm text-muted-foreground line-clamp-3">{request.job_description}</p>
                </div>
              )}
              {request.qualifications && (
                <div>
                  <p className="text-sm font-medium mb-1">{t("qualifications")}</p>
                  <p className="text-sm text-muted-foreground line-clamp-3">{request.qualifications}</p>
                </div>
              )}
            </div>
          </div>

          {request.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">{t("notes")}</p>
                <p className="text-sm text-muted-foreground">{request.notes}</p>
              </div>
            </>
          )}
        </div>

        {/* Applicants Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                {t("applicants.title")}
              </h3>
              <p className="text-sm text-muted-foreground">{t("applicants.dragHelp")}</p>
            </div>
          </div>

          <ApplicantKanbanBoard
            recruitmentRequestId={id}
            onApplicantClick={handleApplicantClick}
            onCreateApplicant={handleCreateApplicant}
          />
        </div>
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
