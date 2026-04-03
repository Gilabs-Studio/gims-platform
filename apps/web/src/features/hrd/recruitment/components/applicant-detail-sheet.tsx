"use client";

import { useTranslations } from "next-intl";
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
    linkedin: "bg-blue-100 text-blue-800",
    jobstreet: "bg-orange-100 text-orange-800",
    glints: "bg-purple-100 text-purple-800",
    referral: "bg-green-100 text-green-800",
    direct: "bg-gray-100 text-gray-800",
    other: "bg-slate-100 text-slate-800",
  };
  return colors[source] || "bg-gray-100 text-gray-800";
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
      return "bg-green-100 text-green-700";
    case "rejected":
    case "offer_declined":
      return "bg-red-100 text-red-700";
    case "interview_scheduled":
      return "bg-blue-100 text-blue-700";
    case "converted":
      return "bg-purple-100 text-purple-700";
    case "created":
      return "bg-primary/10 text-primary";
    default:
      return "bg-muted text-muted-foreground";
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
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200"
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

  // Helper function to get full URL for resume
  const getResumeUrl = (resumePath: string) => {
    if (resumePath.startsWith("http://") || resumePath.startsWith("https://")) {
      return resumePath;
    }
    // If it's a relative path, prepend the API base URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}${resumePath.startsWith("/") ? "" : "/"}${resumePath}`;
  };

  const isLoading = isLoadingApplicant;

  // Helper function to format date nicely
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
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
          <div className="flex items-center gap-2 px-6 pb-2">
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
                style={{ borderColor: applicant.stage.color }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full mr-1"
                  style={{ backgroundColor: applicant.stage.color }}
                />
                {applicant.stage.name}
              </Badge>
            )}
          </div>
        ) : null
      }
    >
      <div className="px-4 py-4 md:px-5 md:py-5 flex flex-col h-full">
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
              <h4 className="text-sm font-semibold">
                {t("applicants.contactInfo")}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{applicant.email}</span>
                </div>
                {applicant.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{applicant.phone}</span>
                  </div>
                )}
                {applicant.linkedin_url && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-primary"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    <a
                      href={`https://linkedin.com/in/${applicant.linkedin_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      linkedin.com/in/{applicant.linkedin_url}
                    </a>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Application Details */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold">
                {t("applicants.applicationDetails")}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {t("applicants.appliedAt")}:{" "}
                    {new Date(applicant.applied_at).toLocaleDateString()}
                  </span>
                </div>
                {applicant.resume_url && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <a
                      href={getResumeUrl(applicant.resume_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {t("applicants.viewResume")}
                    </a>
                  </div>
                )}
              </div>
            </section>

            {applicant.notes && (
              <>
                <Separator />
                <section className="space-y-3">
                  <h4 className="text-sm font-semibold">
                    {t("applicants.notes")}
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
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
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    {t("applicants.employeeInfo")}
                  </h4>
                  <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {t("applicants.employeeCode")}
                        </span>
                        <span className="font-medium">
                          {applicant.employee.employee_code}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {t("applicants.fields.name")}
                        </span>
                        <span className="font-medium">
                          {applicant.employee.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {t("applicants.fields.email")}
                        </span>
                        <span className="font-medium">
                          {applicant.employee.email}
                        </span>
                      </div>
                      <div className="pt-2">
                        <Link
                          href={{
                            pathname: "/master-data/employees",
                            query: { openId: applicant.employee.id },
                          }}
                          className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
                        >
                          {t("applicants.viewEmployee")}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            <Separator />

            {/* Activity History - Timeline Design */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold">
                {t("applicants.activityHistory")}
              </h4>
              {isLoadingActivities ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("applicants.noActivities")}
                </p>
              ) : (
                <div className="relative pl-4">
                  {/* Vertical timeline line */}
                  <div className="absolute left-6 top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="relative flex gap-4">
                        {/* Timeline dot/icon */}
                        <div className="relative z-10 shrink-0">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center ${getActivityIconBgColor(
                              activity.type as ActivityType,
                            )}`}
                          >
                            {getActivityIcon(activity.type as ActivityType)}
                          </div>
                        </div>
                        {/* Activity content */}
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm">{activity.description}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                            <span>{formatDate(activity.created_at)}</span>
                            {activity.created_by_name && (
                              <div className="flex items-center gap-1">
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

        {/* Actions */}
        {applicant && (
          <div className="flex flex-col gap-2 pt-4 pb-6 border-t mt-6">
            {/* Convert to Employee Button */}
            {canConvert && (
              <Button
                variant="default"
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => setConvertDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t("applicants.convertToEmployee")}
              </Button>
            )}
            {applicant.employee_id && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 p-2 rounded-md border border-primary/20">
                <UserCheck className="h-4 w-4" />
                <span>{t("applicants.alreadyConverted")}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onEdit?.(applicant)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                {t("common.edit")}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  onDelete?.(applicant.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("common.delete")}
              </Button>
            </div>
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
