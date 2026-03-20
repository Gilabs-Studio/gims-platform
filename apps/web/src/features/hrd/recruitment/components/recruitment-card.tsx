"use client";

import { useTranslations } from "next-intl";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import type { RecruitmentRequest, RecruitmentStatus, RecruitmentPriority, RecruitmentEmploymentType } from "../types";

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

function getPriorityBadge(priority: RecruitmentPriority, t: ReturnType<typeof useTranslations>) {
  switch (priority) {
    case "LOW":
      return (
        <Badge variant="secondary" className="text-[10px] font-medium">
          {t("priority.low")}
        </Badge>
      );
    case "MEDIUM":
      return (
        <Badge variant="outline" className="text-[10px] font-medium">
          {t("priority.medium")}
        </Badge>
      );
    case "HIGH":
      return (
        <Badge variant="warning" className="text-[10px] font-medium">
          {t("priority.high")}
        </Badge>
      );
    case "URGENT":
      return (
        <Badge variant="destructive" className="text-[10px] font-medium">
          {t("priority.urgent")}
        </Badge>
      );
    default:
      return <Badge variant="secondary">{priority}</Badge>;
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

export function RecruitmentCard({ request, onClick, index = 0 }: RecruitmentCardProps) {
  const t = useTranslations("recruitment");

  const filledCount = request.filled_count ?? 0;
  const requiredCount = request.required_count ?? 0;
  const openPositions = request.open_positions ?? (requiredCount - filledCount);
  const progressPercent = requiredCount > 0 ? (filledCount / requiredCount) * 100 : 0;

  const hasSalaryRange = request.salary_range_min != null || request.salary_range_max != null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card
        className="group cursor-pointer border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 h-full flex flex-col"
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
              <p className="text-xs text-muted-foreground font-mono mb-1">
                {request.request_code}
              </p>
              <h3 className="text-base font-semibold leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                {request.division_name ?? "-"}
              </h3>
            </div>
            <div className="shrink-0">
              {getStatusBadge(request.status, t)}
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 flex flex-col gap-4 pt-0">
          {/* Position Name */}
          <div>
            <p className="text-sm font-medium text-foreground">
              {request.position_name ?? "-"}
            </p>
          </div>

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            {getPriorityBadge(request.priority, t)}
            <Badge variant="outline" className="text-[10px] font-medium">
              {getEmploymentTypeLabel(request.employment_type, t)}
            </Badge>
          </div>

          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{t("progressLabel")}</span>
              </div>
              <span className="font-mono font-medium">
                {filledCount}/{requiredCount}
              </span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>

          {/* Details Grid */}
          <div className="space-y-2 pt-2 border-t border-dashed">
            {/* Expected Start Date */}
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{t("expectedStartDate")}:</span>
              <span className="font-medium">
                {request.expected_start_date
                  ? new Date(request.expected_start_date).toLocaleDateString()
                  : "-"}
              </span>
            </div>

            {/* Salary Range */}
            {hasSalaryRange && (
              <div className="flex items-center gap-2 text-xs">
                <Banknote className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{t("salaryRange")}:</span>
                <span className="font-medium font-mono">
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

          {/* Click hint */}
          <div className="pt-2 mt-auto">
            <p className="text-[10px] text-muted-foreground/70 text-center group-hover:text-primary/70 transition-colors">
              {t("card.clickToView")}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
