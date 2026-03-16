"use client";

import { useTranslations } from "next-intl";
import { Star, Mail, Phone, FileText, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RecruitmentApplicant, ApplicantSource } from "../types";

interface ApplicantCardProps {
  applicant: RecruitmentApplicant;
  onClick?: (applicant: RecruitmentApplicant) => void;
  className?: string;
}

function getSourceLabel(source: ApplicantSource): string {
  const labels: Record<ApplicantSource, string> = {
    linkedin: "LinkedIn",
    jobstreet: "JobStreet",
    glints: "Glints",
    referral: "Referral",
    direct: "Direct",
    other: "Other",
  };
  return labels[source] || source;
}

function getSourceColor(source: ApplicantSource): string {
  const colors: Record<ApplicantSource, string> = {
    linkedin: "bg-blue-100 text-blue-800",
    jobstreet: "bg-orange-100 text-orange-800",
    glints: "bg-purple-100 text-purple-800",
    referral: "bg-green-100 text-green-800",
    direct: "bg-gray-100 text-gray-800",
    other: "bg-slate-100 text-slate-800",
  };
  return colors[source] || "bg-gray-100 text-gray-800";
}

function RatingStars({ rating }: { rating?: number }) {
  if (!rating) return null;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i < rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200"
          )}
        />
      ))}
    </div>
  );
}

export function ApplicantCard({ applicant, onClick, className }: ApplicantCardProps) {
  const t = useTranslations("recruitment");

  const appliedDate = applicant.applied_at
    ? new Date(applicant.applied_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div
      className={cn(
        "group cursor-pointer rounded-lg border bg-card p-3 shadow-sm",
        "hover:border-primary/50 hover:shadow-md transition-all duration-200",
        className
      )}
      onClick={() => onClick?.(applicant)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.(applicant);
        }
      }}
    >
      {/* Header: Rating and Source */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <RatingStars rating={applicant.rating} />
        <Badge
          variant="secondary"
          className={cn("text-[10px] px-1.5 py-0", getSourceColor(applicant.source))}
        >
          {getSourceLabel(applicant.source)}
        </Badge>
      </div>

      {/* Name */}
      <h4 className="font-medium text-sm mb-1 line-clamp-1 group-hover:text-primary transition-colors">
        {applicant.full_name}
      </h4>

      {/* Email */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
        <Mail className="h-3 w-3 shrink-0" />
        <span className="truncate">{applicant.email}</span>
      </div>

      {/* Phone (if available) */}
      {applicant.phone && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
          <Phone className="h-3 w-3 shrink-0" />
          <span>{applicant.phone}</span>
        </div>
      )}

      {/* Footer: Resume and Date */}
      <div className="flex items-center justify-between pt-2 border-t border-dashed">
        <div className="flex items-center gap-2">
          {applicant.resume_url ? (
            <div className="flex items-center gap-1 text-xs text-primary">
              <FileText className="h-3 w-3" />
              <span>CV</span>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground/60">
              {t("applicants.noResume")}
            </span>
          )}
        </div>

        {appliedDate && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{appliedDate}</span>
          </div>
        )}
      </div>
    </div>
  );
}
