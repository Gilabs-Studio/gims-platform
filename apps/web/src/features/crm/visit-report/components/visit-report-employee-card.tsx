"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CalendarDays,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  MapPin,
  Send,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatTime } from "@/lib/utils";
import { useVisitReports, useSubmitVisitReport, useApproveVisitReport, useRejectVisitReport } from "../hooks/use-visit-reports";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useRouter } from "@/i18n/routing";
import type { VisitReportEmployeeSummary, VisitReportStatus, VisitReportOutcome } from "../types";

const STATUS_VARIANTS: Record<VisitReportStatus, "default" | "secondary" | "outline" | "destructive" | "success"> = {
  draft: "secondary",
  submitted: "default",
  approved: "success",
  rejected: "destructive",
};

const OUTCOME_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  very_positive: "default",
  positive: "default",
  neutral: "secondary",
  negative: "destructive",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface VisitReportEmployeeCardProps {
  summary: VisitReportEmployeeSummary;
}

/** Expandable card showing an employee's visit report summary with lazy-loaded report rows. */
export function VisitReportEmployeeCard({ summary }: VisitReportEmployeeCardProps) {
  const t = useTranslations("crmVisitReport");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const canApprove = useUserPermission("crm_visit.approve");
  const submitMutation = useSubmitVisitReport();
  const approveMutation = useApproveVisitReport();
  const rejectMutation = useRejectVisitReport();

  // Lazy-load visit reports for this employee only when the card is expanded
  const { data, isLoading } = useVisitReports(
    expanded ? { employee_id: summary.employee_id, per_page: 5, sort_by: "visit_date", sort_dir: "desc" } : undefined
  );
  const visits = data?.data ?? [];

  const hasReports = summary.total_reports > 0;

  return (
    <div className="rounded-lg border bg-card transition-shadow hover:shadow-md">
      {/* Card Header — always visible */}
      <button
        type="button"
        className="w-full p-4 flex items-center gap-4 cursor-pointer text-left"
        onClick={() => hasReports && setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        {/* Avatar */}
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {getInitials(summary.employee_name)}
          </AvatarFallback>
        </Avatar>

        {/* Employee Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm leading-snug truncate">{summary.employee_name}</p>
            <span className="text-xs text-muted-foreground font-mono">{summary.employee_code}</span>
          </div>
          {summary.latest_visit && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <CalendarDays className="h-3 w-3" />
              {t("employeeView.lastVisit")}: {formatDate(summary.latest_visit)}
            </p>
          )}
        </div>

        {/* Metrics Summary: use a fixed grid so badges align neatly */}
        <div className="hidden sm:grid grid-cols-5 gap-4 items-center shrink-0 text-center">
          <div className="py-1">
            <BarChart3 className="mx-auto h-4 w-4 text-muted-foreground" />
            <div className="mt-1 text-lg font-bold leading-none">{summary.total_reports}</div>
            <div className="text-xs text-muted-foreground">{t("metrics.total")}</div>
          </div>

          <div className="py-1">
            <Clock className="mx-auto h-4 w-4 text-amber-500" />
            <div className="mt-1 text-lg font-bold text-amber-600 leading-none">{summary.status_counts.submitted}</div>
            <div className="text-xs text-muted-foreground">{t("status.submitted")}</div>
          </div>

          <div className="py-1">
            <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" />
            <div className="mt-1 text-lg font-bold text-green-600 leading-none">{summary.status_counts.approved}</div>
            <div className="text-xs text-muted-foreground">{t("status.approved")}</div>
          </div>

          <div className="py-1">
            <XCircle className="mx-auto h-4 w-4 text-destructive" />
            <div className="mt-1 text-lg font-bold text-destructive leading-none">{summary.status_counts.rejected}</div>
            <div className="text-xs text-muted-foreground">{t("status.rejected")}</div>
          </div>

          <div className="py-1">
            <FileText className="mx-auto h-4 w-4 text-muted-foreground" />
            <div className="mt-1 text-lg font-bold leading-none">{summary.status_counts.draft}</div>
            <div className="text-xs text-muted-foreground">{t("status.draft")}</div>
          </div>
        </div>

        {/* Mobile compact metric badge */}
        <div className="flex sm:hidden items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs">
            {summary.total_reports} {t("metrics.total")}
          </Badge>
        </div>

        {/* Expand toggle */}
        {hasReports && (
          <div className="shrink-0 text-muted-foreground ml-1">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        )}
      </button>

      {/* Expandable: recent visit reports (lazy-loaded) */}
      {expanded && (
        <div className="border-t">
          {/* Loading state */}
          {isLoading && (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {/* Visit list */}
          {!isLoading && visits.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">{t("emptyState")}</p>
          )}

          {!isLoading && visits.length > 0 && (
            <div className="divide-y">
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                >
                  {/* Row: navigate to detail on click */}
                  <button
                    type="button"
                    className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5 cursor-pointer text-left items-center"
                    onClick={() => router.push(`/crm/visits/${visit.id}`)}
                  >
                    <span className="font-mono text-xs text-muted-foreground">{visit.code}</span>
                    <span className="text-sm">{formatDate(visit.visit_date)}</span>
                    <span className="text-sm truncate">{visit.customer?.name ?? "-"}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={STATUS_VARIANTS[visit.status as VisitReportStatus] ?? "outline"}
                        className="text-xs"
                      >
                        {t(`status.${visit.status as VisitReportStatus}`)}
                      </Badge>
                      {visit.outcome && (
                        <Badge
                          variant={OUTCOME_VARIANTS[visit.outcome] ?? "secondary"}
                          className="text-xs"
                        >
                          {t(`outcome.${visit.outcome as VisitReportOutcome}`)}
                        </Badge>
                      )}
                    </div>
                  </button>

                  {/* Fixed width container for trailing elements so they don't break flex alignment */}
                  <div className="flex items-center justify-end gap-3 shrink-0 w-[160px]">
                    {/* Check-in indicator */}
                    <div className="flex justify-end w-[60px]">
                      {visit.check_in_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {formatTime(visit.check_in_at)}
                        </span>
                      )}
                    </div>

                    {/* Action shortcuts */}
                    <div className="flex items-center justify-end gap-1 w-[88px]">
                      {visit.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-primary"
                          title={t("actions.submit")}
                          disabled={submitMutation.isPending}
                          onClick={() => submitMutation.mutate({ id: visit.id })}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {visit.status === "submitted" && canApprove && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-green-600"
                            title={t("actions.approve")}
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate({ id: visit.id })}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive"
                            title={t("actions.reject")}
                            disabled={rejectMutation.isPending}
                            onClick={() => rejectMutation.mutate({ id: visit.id, data: { reason: "" } })}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Eye
                        className="h-3.5 w-3.5 text-muted-foreground cursor-pointer"
                        onClick={() => router.push(`/crm/visits/${visit.id}`)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* View All link */}
          {!isLoading && summary.total_reports > 5 && (
            <div className="px-4 py-2 border-t bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs cursor-pointer text-primary"
                onClick={() =>
                  router.push(`/crm/visits?employee_id=${summary.employee_id}` as Parameters<typeof router.push>[0])
                }
              >
                {t("employeeView.viewAll")} ({summary.total_reports})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
