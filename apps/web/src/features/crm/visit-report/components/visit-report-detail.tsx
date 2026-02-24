"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  User,
  Building2,
  Target,
  FileText,
  CheckCircle2,
  XCircle,
  Send,
  ThumbsUp,
  ThumbsDown,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/utils";
import { useRouter } from "@/i18n/routing";
import { useVisitReportById, useDeleteVisitReport, useSubmitVisitReport, useApproveVisitReport, useVisitReportHistory } from "../hooks/use-visit-reports";
import { VisitReportFormDialog } from "./visit-report-form-dialog";
import { VisitReportRejectDialog } from "./visit-report-reject-dialog";
import { useUserPermission } from "@/hooks/use-user-permission";
import { PageMotion } from "@/components/motion";
import { toast } from "sonner";
import type { VisitReport, VisitReportStatus, VisitReportDetail as VisitReportDetailType } from "../types";

interface VisitReportDetailProps {
  readonly visitId: string;
}

const STATUS_VARIANTS: Record<VisitReportStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  submitted: "default",
  approved: "default",
  rejected: "destructive",
};

const OUTCOME_LABELS: Record<string, string> = {
  very_positive: "Very Positive",
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

function InterestBar({ level }: { level: number }) {
  const percentage = Math.min((level / 5) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium">{level}/5</span>
    </div>
  );
}

export function VisitReportDetail({ visitId }: VisitReportDetailProps) {
  const t = useTranslations("crmVisitReport");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const { data: response, isLoading, isError, refetch } = useVisitReportById(visitId);
  const { data: historyResponse } = useVisitReportHistory(visitId);
  const deleteMutation = useDeleteVisitReport();
  const submitMutation = useSubmitVisitReport();
  const approveMutation = useApproveVisitReport();

  const canUpdate = useUserPermission("crm_visit.update");
  const canDelete = useUserPermission("crm_visit.delete");
  const canApprove = useUserPermission("crm_visit.approve");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const visit: VisitReport | undefined = response?.data;
  const history = historyResponse?.data ?? [];
  const isDraft = visit?.status === "draft";
  const isSubmitted = visit?.status === "submitted";

  const handleDelete = async () => {
    if (!visit) return;
    try {
      await deleteMutation.mutateAsync(visit.id);
      toast.success(t("deleted"));
      router.push("/crm/visits");
    } catch {
      toast.error(tCommon("error"));
    }
    setShowDeleteDialog(false);
  };

  const handleSubmit = async () => {
    if (!visit) return;
    try {
      await submitMutation.mutateAsync({ id: visit.id });
      toast.success(t("submitted"));
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleApprove = async () => {
    if (!visit) return;
    try {
      await approveMutation.mutateAsync({ id: visit.id, data: {} });
      toast.success(t("approved"));
    } catch {
      toast.error(tCommon("error"));
    }
  };

  if (isLoading) {
    return <VisitReportDetailSkeleton />;
  }

  if (isError || !visit) {
    return (
      <PageMotion>
        <div className="p-6 text-center">
          <p className="text-muted-foreground mb-4">{tCommon("noData")}</p>
          <Button variant="outline" onClick={() => refetch()} className="cursor-pointer">
            {tCommon("retry")}
          </Button>
        </div>
      </PageMotion>
    );
  }

  return (
    <PageMotion>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer mt-0.5"
              onClick={() => router.push("/crm/visits")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{visit.code}</h1>
                <Badge variant={STATUS_VARIANTS[visit.status]}>
                  {t(`status.${visit.status}`)}
                </Badge>
                {visit.outcome && (
                  <Badge variant="outline">
                    {t(`outcome.${visit.outcome}`)}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t("detail.visitCode")}: {visit.code}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDraft && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
              >
                <Send className="h-4 w-4 mr-1" />
                {t("actions.submit")}
              </Button>
            )}
            {isSubmitted && canApprove && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  className="cursor-pointer"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  {t("actions.approve")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer text-destructive hover:text-destructive"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  {t("actions.reject")}
                </Button>
              </>
            )}
            {isDraft && canUpdate && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                {tCommon("edit")}
              </Button>
            )}
            {isDraft && canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("table.status")}</p>
            <Badge variant={STATUS_VARIANTS[visit.status]} className="mt-1">
              {t(`status.${visit.status}`)}
            </Badge>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("table.outcome")}</p>
            <p className="text-lg font-semibold mt-1">
              {visit.outcome ? (OUTCOME_LABELS[visit.outcome] ?? visit.outcome) : "-"}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("detail.checkedInAt")}</p>
            <p className="text-sm font-medium mt-1">
              {visit.check_in_at ? formatDate(visit.check_in_at) : "-"}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("detail.checkedOutAt")}</p>
            <p className="text-sm font-medium mt-1">
              {visit.check_out_at ? formatDate(visit.check_out_at) : "-"}
            </p>
          </div>
        </div>

        {/* Main content: two columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: main info */}
          <div className="md:col-span-2 space-y-6">
            {/* Visit Information */}
            <div className="rounded-lg border p-4 space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                {t("sections.visitInfo")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Calendar} label={t("form.visitDate")} value={visit.visit_date ? formatDate(visit.visit_date) : null} />
                <InfoRow icon={Clock} label={t("form.scheduledTime")} value={visit.scheduled_time} />
                <InfoRow icon={Target} label={t("form.purpose")} value={visit.purpose} />
                <InfoRow icon={MapPin} label={t("form.address")} value={visit.address} />
              </div>
            </div>

            {/* Contact Information */}
            <div className="rounded-lg border p-4 space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                {t("sections.contactInfo")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Building2} label={t("form.customer")} value={visit.customer?.name} />
                <InfoRow icon={User} label={t("form.contact")} value={visit.contact?.name} />
                <InfoRow icon={User} label={t("form.contactPerson")} value={visit.contact_person} />
                <InfoRow icon={Phone} label={t("form.contactPhone")} value={visit.contact_phone} />
                {visit.deal && (
                  <InfoRow icon={FileText} label={t("form.deal")} value={`${visit.deal.code} - ${visit.deal.title}`} />
                )}
                {visit.lead && (
                  <InfoRow icon={User} label={t("form.lead")} value={`${visit.lead.code} - ${visit.lead.first_name} ${visit.lead.last_name}`} />
                )}
              </div>
            </div>

            {/* Product Interest Details */}
            {visit.details && visit.details.length > 0 && (
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                  {t("sections.productInterest")}
                </h3>
                <div className="space-y-4">
                  {visit.details.map((detail: VisitReportDetailType) => (
                    <div key={detail.id} className="border rounded-lg p-4 space-y-3 bg-card">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {detail.product?.name ?? detail.product_id}
                        </span>
                        {detail.product?.code && (
                          <Badge variant="outline" className="text-xs">{detail.product.code}</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">{t("form.interestLevel")}</p>
                          <InterestBar level={detail.interest_level} />
                        </div>
                        {detail.quantity != null && detail.quantity > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("form.quantity")}</p>
                            <p className="text-sm font-medium">{detail.quantity}</p>
                          </div>
                        )}
                        {detail.price != null && detail.price > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("form.price")}</p>
                            <p className="text-sm font-medium">
                              {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(detail.price)}
                            </p>
                          </div>
                        )}
                      </div>

                      {detail.notes && (
                        <p className="text-sm text-muted-foreground">{detail.notes}</p>
                      )}

                      {/* Interest survey answers */}
                      {detail.answers && detail.answers.length > 0 && (
                        <div className="space-y-2 border-t pt-3">
                          <p className="text-xs font-medium text-muted-foreground">{t("form.interestSurvey")}</p>
                          {detail.answers.map((answer) => (
                            <div key={answer.id} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{answer.question_text}</span>
                              <Badge variant="outline" className="text-xs">{answer.option_text} ({answer.score})</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visit Results */}
            {(visit.result || visit.next_steps) && (
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                  {t("sections.results")}
                </h3>
                {visit.result && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t("form.result")}</p>
                    <p className="text-sm whitespace-pre-wrap">{visit.result}</p>
                  </div>
                )}
                {visit.next_steps && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t("form.nextSteps")}</p>
                    <p className="text-sm whitespace-pre-wrap">{visit.next_steps}</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {visit.notes && (
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                  {t("form.notes")}
                </h3>
                <p className="text-sm whitespace-pre-wrap">{visit.notes}</p>
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <div className="space-y-4">
            {/* Employee */}
            {visit.employee && (
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("form.employee")}
                </h4>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {visit.employee.name.charAt(0)}
                  </div>
                  <span className="text-sm">{visit.employee.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{visit.employee.employee_code}</p>
              </div>
            )}

            {/* Check-in/out Info */}
            <div className="rounded-lg border p-3 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                {t("actions.checkIn")} / {t("actions.checkOut")}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {visit.check_in_at ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">{t("detail.checkedInAt")}</p>
                    <p className="text-sm">{visit.check_in_at ? formatDate(visit.check_in_at) : "-"}</p>
                  </div>
                </div>
                {visit.check_in_location && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground ml-6">
                    <MapPin className="h-3 w-3" />
                    <span>{visit.check_in_location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {visit.check_out_at ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">{t("detail.checkedOutAt")}</p>
                    <p className="text-sm">{visit.check_out_at ? formatDate(visit.check_out_at) : "-"}</p>
                  </div>
                </div>
                {visit.check_out_location && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground ml-6">
                    <MapPin className="h-3 w-3" />
                    <span>{visit.check_out_location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Approval */}
            {(visit.status === "approved" || visit.status === "rejected") && (
              <div className="rounded-lg border p-3 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("sections.approval")}
                </h4>
                {visit.status === "approved" && visit.approved_at && (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">{t("status.approved")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>{formatDate(visit.approved_at)}</span>
                    </div>
                  </>
                )}
                {visit.status === "rejected" && (
                  <>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">{t("status.rejected")}</span>
                    </div>
                    {visit.rejected_at && (
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{formatDate(visit.rejected_at)}</span>
                      </div>
                    )}
                    {visit.rejection_reason && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t("detail.rejectionReason")}</p>
                        <p className="text-sm">{visit.rejection_reason}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="rounded-lg border p-3 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                {t("table.createdAt")}
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>{formatDate(visit.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(visit.updated_at)}</span>
              </div>
            </div>

            {/* Progress History */}
            {history.length > 0 && (
              <div className="rounded-lg border p-3 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("sections.history")}
                </h4>
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-start gap-2 text-xs">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1 shrink-0" />
                      <div>
                        <p className="font-medium">
                          {h.from_status} → {h.to_status}
                        </p>
                        {h.notes && <p className="text-muted-foreground">{h.notes}</p>}
                        <p className="text-muted-foreground">{formatDate(h.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {canUpdate && isDraft && (
        <VisitReportFormDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          visit={visit}
        />
      )}

      {/* Reject Dialog */}
      {canApprove && isSubmitted && (
        <VisitReportRejectDialog
          open={showRejectDialog}
          onClose={() => setShowRejectDialog(false)}
          visitId={visit.id}
        />
      )}

      {/* Delete Dialog */}
      {canDelete && isDraft && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">{tCommon("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? tCommon("deleting") : tCommon("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </PageMotion>
  );
}

function VisitReportDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-4">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
