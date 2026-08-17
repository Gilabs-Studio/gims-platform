"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  Star,
  Mail,
  Phone,
  FileText,
  Calendar,
  Clock,
  User,
  Briefcase,
  Tag,
  Trash2,
  Pencil,
  UserPlus,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useApplicant,
  useApplicantActivities,
  useCanConvertToEmployee,
} from "../hooks/use-applicants";
import { ConvertToEmployeeDialog } from "./convert-to-employee-dialog";
import type {
  RecruitmentApplicant,
  ApplicantSource,
  ActivityType,
} from "../types";

interface ApplicantDetailSheetProps {
  applicantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (applicant: RecruitmentApplicant) => void;
  onDelete?: (applicantId: string) => void;
}

function getTranslatedSourceLabel(
  t: (key: string) => string,
  source: ApplicantSource,
): string {
  const labels: Record<ApplicantSource, string> = {
    linkedin: t("applicants.sources.linkedin"),
    jobstreet: t("applicants.sources.jobstreet"),
    glints: t("applicants.sources.glints"),
    referral: t("applicants.sources.referral"),
    direct: t("applicants.sources.direct"),
    other: t("applicants.sources.other"),
  };
  return labels[source] || source;
}

function getSourceColor(source: ApplicantSource): string {
  const colors: Record<ApplicantSource, string> = {
    linkedin: "bg-primary/10 text-primary border-primary/20",
    jobstreet: "bg-warning/10 text-warning border-warning/20",
    glints: "bg-purple/10 text-purple border-purple/20",
    referral: "bg-success/10 text-success border-success/20",
    direct: "bg-secondary text-secondary-foreground border-border",
    other: "bg-muted text-muted-foreground border-border",
  };
  return colors[source] || "bg-muted text-muted-foreground";
}

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case "stage_change":
    case "hired":
    case "rejected":
      return <Briefcase className="h-4 w-4" />;
    case "note_added":
      return <User className="h-4 w-4" />;
    case "interview_scheduled":
    case "interview_completed":
      return <Clock className="h-4 w-4" />;
    case "offer_sent":
    case "offer_accepted":
    case "offer_declined":
      return <Mail className="h-4 w-4" />;
    case "created":
      return <User className="h-4 w-4" />;
    case "updated":
      return <Pencil className="h-4 w-4" />;
    case "resume_uploaded":
      return <FileText className="h-4 w-4" />;
    case "rating_changed":
      return <Star className="h-4 w-4" />;
    case "converted":
      return <UserCheck className="h-4 w-4" />;
    default:
      return <Tag className="h-4 w-4" />;
  }
}

function getActivityIconBgColor(type: ActivityType): string {
  switch (type) {
    case "hired":
    case "offer_accepted":
      return "bg-success text-white shadow-sm ring-2 ring-success/20";
    case "rejected":
    case "offer_declined":
      return "bg-destructive text-destructive-foreground shadow-sm ring-2 ring-destructive/20";
    case "interview_scheduled":
    case "interview_completed":
      return "bg-warning text-white shadow-sm ring-2 ring-warning/20";
    case "converted":
      return "bg-purple text-purple-foreground shadow-sm ring-2 ring-purple/20";
    case "created":
      return "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20";
    default:
      return "bg-muted text-muted-foreground shadow-sm ring-2 ring-muted/20";
  }
}

function RatingStars({ rating }: { rating?: number }) {
  if (!rating) return null;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating
              ? "fill-warning text-warning"
              : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export function ApplicantDetailSheet({
  applicantId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ApplicantDetailSheetProps) {
  const t = useTranslations("recruitment");
  const locale = useLocale();
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  const { data: applicantData, isLoading: isLoadingApplicant } = useApplicant(
    applicantId || "",
    { enabled: !!applicantId && open },
  );

  const { data: activitiesData, isLoading: isLoadingActivities } =
    useApplicantActivities(applicantId || "", 1, 50);

  const { data: canConvertData } = useCanConvertToEmployee(applicantId || "");

  const applicant = applicantData?.data;
  const activities = activitiesData?.data || [];
  const canConvert =
    canConvertData?.data?.can_convert && !applicant?.employee_id;

  const getResumeUrl = (resumePath: string) => {
    if (resumePath.startsWith("http://") || resumePath.startsWith("https://")) {
      return resumePath;
    }
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${resumePath.startsWith("/") ? "" : "/"}${resumePath}`;
  };

  const isLoading = isLoadingApplicant;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      defaultWidth={672}
      resizable
      title={
        isLoading
          ? t("applicants.detail")
          : applicant?.full_name || t("applicants.detail")
      }
      headerExtra={
        !isLoading && applicant ? (
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
            <RatingStars rating={applicant.rating} />
            <Badge
              variant="secondary"
              className={getSourceColor(applicant.source)}
            >
              {getTranslatedSourceLabel(t, applicant.source)}
            </Badge>
            {applicant.stage && (
              <Badge
                variant="outline"
                className="font-medium"
                style={{ borderColor: applicant.stage.color }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full mr-1.5"
                  style={{ backgroundColor: applicant.stage.color }}
                />
                {applicant.stage.name}
              </Badge>
            )}
          </div>
        ) : null
      }
    >
      <div className="px-6 py-5 flex flex-col h-full">
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : applicant ? (
          <div className="flex-1 space-y-6">
            {/* Contact Information */}
            <section className="space-y-3">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                {t("applicants.contactInfo")}
              </h4>
              <div className="space-y-2.5 text-sm bg-muted/20 p-3.5 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 text-foreground">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{applicant.email}</span>
                </div>
                {applicant.phone && (
                  <div className="flex items-center gap-2 text-foreground">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{applicant.phone}</span>
                  </div>
                )}
                {applicant.linkedin_url && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-primary shrink-0"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    <a
                      href={`https://linkedin.com/in/${applicant.linkedin_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      linkedin.com/in/{applicant.linkedin_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Application Details */}
            <section className="space-y-3">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                {t("applicants.applicationDetails")}
              </h4>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    {t("applicants.appliedAt")}:{" "}
                    <strong className="text-foreground">
                      {new Date(applicant.applied_at).toLocaleDateString(
                        locale === "id" ? "id-ID" : "en-US",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </strong>
                  </span>
                </div>
                {applicant.resume_url && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <a
                      href={getResumeUrl(applicant.resume_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      {t("applicants.viewResume")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </section>

            {applicant.notes && (
              <>
                <Separator />
                <section className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    {t("applicants.notes")}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 p-3.5 rounded-lg border border-border/50">
                    {applicant.notes}
                  </p>
                </section>
              </>
            )}

            {/* Employee Info (if converted) */}
            {applicant.employee_id && applicant.employee && (
              <>
                <Separator />
                <section className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    {t("applicants.employeeInfo")}
                  </h4>
                  <div className="rounded-lg bg-primary/10 p-3.5 border border-primary/20 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("applicants.employeeCode")}
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {applicant.employee.employee_code}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("applicants.fields.name")}
                      </span>
                      <span className="font-semibold text-foreground">
                        {applicant.employee.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("applicants.fields.email")}
                      </span>
                      <span className="font-medium text-foreground">
                        {applicant.employee.email}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-primary/20">
                      <Link
                        href={{
                          pathname: "/master-data/employees",
                          query: { openId: applicant.employee.id },
                        }}
                        className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-semibold"
                      >
                        {t("applicants.viewEmployee")}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </section>
              </>
            )}

            <Separator />

            {/* Activity History - Timeline Design with Center-Aligned Connecting Line */}
            <section className="space-y-4">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                {t("applicants.activityHistory")}
              </h4>
              {isLoadingActivities ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  {t("applicants.noActivities")}
                </p>
              ) : (
                <div className="relative pt-1">
                  {/* Vertical line running EXACTLY through center of 32px (h-8) icons (left-[15px]) */}
                  <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-border z-0" />
                  <div className="space-y-5">
                    {activities.map((activity) => (
                      <div key={activity.id} className="relative flex items-start gap-4">
                        {/* Solid background circular icon centered over the timeline line */}
                        <div className="relative z-10 shrink-0">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center ${getActivityIconBgColor(
                              activity.type as ActivityType,
                            )}`}
                          >
                            {getActivityIcon(activity.type as ActivityType)}
                          </div>
                        </div>

                        {/* Activity details */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-sm font-medium text-foreground leading-snug">
                            {activity.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="font-mono">{formatDate(activity.created_at)}</span>
                            {activity.created_by_name && (
                              <div className="flex items-center gap-1 font-medium">
                                <span>•</span>
                                <User className="h-3 w-3" />
                                <span>{activity.created_by_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : null}

        {/* Actions Footer */}
        {applicant && (
          <div className="flex flex-col gap-2 pt-4 pb-4 border-t mt-6 bg-background">
            {/* Convert to Employee Button */}
            {canConvert && (
              <Button
                variant="default"
                className="w-full bg-success text-white font-semibold cursor-pointer"
                onClick={() => setConvertDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t("applicants.convertToEmployee")}
              </Button>
            )}
            {applicant.employee_id && (
              <div className="flex items-center justify-center gap-2 text-sm text-primary bg-primary/10 p-2.5 rounded-md border border-primary/20 font-medium">
                <UserCheck className="h-4 w-4" />
                <span>{t("applicants.alreadyConverted")}</span>
              </div>
            )}
            {!applicant.employee_id && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="flex-1 cursor-pointer"
                  onClick={() => onEdit?.(applicant)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  {t("common.edit")}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    onDelete?.(applicant.id);
                    onOpenChange(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("common.delete")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Convert to Employee Dialog */}
      <ConvertToEmployeeDialog
        applicant={applicant || null}
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        onSuccess={() => {
          // Refresh applicant data
        }}
      />
    </Drawer>
  );
}
