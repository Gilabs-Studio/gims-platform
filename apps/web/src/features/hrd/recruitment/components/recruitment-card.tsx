"use client";

import { useTranslations, useLocale } from "next-intl";
import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Briefcase,
  Lock,
  Ban,
  Calendar,
  Banknote,
  Users,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import type { RecruitmentRequest, RecruitmentStatus, RecruitmentEmploymentType } from "../types";

interface RecruitmentCardProps {
  readonly request: RecruitmentRequest;
  readonly onClick: (request: RecruitmentRequest) => void;
  readonly index?: number;
}

function getStatusBadge(status: RecruitmentStatus, t: ReturnType<typeof useTranslations>) {
  switch (status) {
    case "DRAFT":
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          <FileText className="h-3 w-3 mr-1" />
          {t("status.draft")}
        </Badge>
      );
    case "PENDING":
      return (
        <Badge variant="outline" className="text-xs font-medium">
          <Clock className="h-3 w-3 mr-1" />
          {t("status.pending")}
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t("status.approved")}
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="destructive" className="text-xs font-medium">
          <XCircle className="h-3 w-3 mr-1" />
          {t("status.rejected")}
        </Badge>
      );
    case "OPEN":
      return (
        <Badge variant="info" className="text-xs font-medium">
          <Briefcase className="h-3 w-3 mr-1" />
          {t("status.open")}
        </Badge>
      );
    case "CLOSED":
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          <Lock className="h-3 w-3 mr-1" />
          {t("status.closed")}
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="destructive" className="text-xs font-medium">
          <Ban className="h-3 w-3 mr-1" />
          {t("status.cancelled")}
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getEmploymentTypeLabel(type: RecruitmentEmploymentType, t: ReturnType<typeof useTranslations>) {
  switch (type) {
    case "FULL_TIME":
      return t("employmentType.fullTime");
    case "PART_TIME":
      return t("employmentType.partTime");
    case "CONTRACT":
      return t("employmentType.contract");
    case "INTERN":
      return t("employmentType.intern");
    default:
      return type;
  }
}

function getRecruitmentTimelineInfo(
  t: (key: string, values?: Record<string, string | number>) => string,
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
      phrase: `${reqFormatted} → ${expFormatted}`,
      badgeText: t("timeline.daysOverdue", { days: daysAgo }),
      badgeVariant: "destructive" as const,
    };
  } else if (diffDays === 0) {
    return {
      phrase: `${reqFormatted} → ${expFormatted}`,
      badgeText: t("timeline.targetToday"),
      badgeVariant: "success" as const,
    };
  } else {
    return {
      phrase: `${reqFormatted} → ${expFormatted}`,
      badgeText: t("timeline.daysLeft", { days: diffDays }),
      badgeVariant: "default" as const,
    };
  }
}

export function RecruitmentCard({ request, onClick, index = 0 }: RecruitmentCardProps) {
  const t = useTranslations("recruitment");
  const locale = useLocale();

  const filledCount = request.filled_count ?? 0;
  const requiredCount = request.required_count ?? 0;
  const applicantsCount = request.applicants_count ?? 0;
  const progressPercent = requiredCount > 0 ? (filledCount / requiredCount) * 100 : 0;

  const hasSalaryRange = request.salary_range_min != null || request.salary_range_max != null;
  const timelineInfo = getRecruitmentTimelineInfo(t, locale, request.request_date, request.expected_start_date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="h-full"
    >
      <Card
        className="group cursor-pointer border bg-card shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 h-full flex flex-col hover:-translate-y-0.5"
        onClick={() => onClick(request)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClick(request);
          }
        }}
      >
        {/* Header */}
        <CardHeader className="pb-3 space-y-0">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-muted-foreground font-mono font-medium block mb-1">
                {request.request_code}
              </span>
              <h3 className="text-base font-bold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                {request.position_name ?? "-"}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                <span className="line-clamp-1 font-medium">{request.division_name ?? "-"}</span>
              </div>
            </div>
            <div className="shrink-0">
              {getStatusBadge(request.status, t)}
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 flex flex-col justify-between gap-4 pt-0">
          <div className="space-y-3">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-medium border-primary/20 bg-primary/5 text-primary">
                {getEmploymentTypeLabel(request.employment_type, t)}
              </Badge>
              {applicantsCount > 0 && (
                <Badge variant="secondary" className="text-[10px] font-medium">
                  {applicantsCount} {t("applicants.title")}
                </Badge>
              )}
            </div>

            {/* Job Description Snippet */}
            {request.job_description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {request.job_description}
              </p>
            )}
          </div>

          <div className="space-y-3 pt-2">
            {/* Progress Section */}
            <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-lg border border-border/50">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span>{t("progressLabel")} ({t("filledCount")})</span>
                </div>
                <span className="font-mono font-semibold text-foreground">
                  {filledCount}/{requiredCount}
                </span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>

            {/* Visual Date Schedule Bar (Human-Readable Timeline) */}
            <div className="bg-muted/20 border border-border/40 p-2.5 rounded-lg flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-foreground font-medium min-w-0">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{timelineInfo.phrase}</span>
              </div>
              <Badge variant={timelineInfo.badgeVariant} className="text-[10px] px-2 py-0.5 font-semibold shrink-0">
                {timelineInfo.badgeText}
              </Badge>
            </div>

            {/* Salary Range */}
            {hasSalaryRange && (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Banknote className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("salaryRange")}</span>
                </div>
                <span className="font-medium font-mono text-foreground">
                  {request.salary_range_min != null && request.salary_range_max != null
                    ? `${formatCurrency(request.salary_range_min)} - ${formatCurrency(request.salary_range_max)}`
                    : request.salary_range_min != null
                      ? formatCurrency(request.salary_range_min)
                      : request.salary_range_max != null
                        ? formatCurrency(request.salary_range_max)
                        : "-"}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
