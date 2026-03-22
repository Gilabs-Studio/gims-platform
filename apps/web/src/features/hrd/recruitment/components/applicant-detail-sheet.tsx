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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useApplicant,
  useApplicantActivities,
  useCanConvertToEmployee,
} from "../hooks/use-applicants";
import { ConvertToEmployeeDialog } from "./convert-to-employee-dialog";
import type { RecruitmentApplicant, ApplicantSource, ActivityType } from "../types";

interface ApplicantDetailSheetProps {
  applicantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (applicant: RecruitmentApplicant) => void;
  onDelete?: (applicantId: string) => void;
}

function getTranslatedSourceLabel(t: (key: string) => string, source: ApplicantSource): string {
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
    { enabled: !!applicantId && open }
  );

  const { data: activitiesData, isLoading: isLoadingActivities } =
    useApplicantActivities(applicantId || "", 1, 50);

  const { data: canConvertData } = useCanConvertToEmployee(applicantId || "");

  const applicant = applicantData?.data;
  const activities = activitiesData?.data || [];
  const canConvert = canConvertData?.data?.can_convert && !applicant?.employee_id;

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="space-y-4 px-6">
          {isLoading ? (
            <>
              <SheetTitle className="sr-only">{t("applicants.detail")}</SheetTitle>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </>
          ) : applicant ? (
            <>
              <SheetTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary">
                  {applicant.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div>{applicant.full_name}</div>
                  <RatingStars rating={applicant.rating} />
                </div>
              </SheetTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={getSourceColor(applicant.source)}
                >
                  {getTranslatedSourceLabel(t, applicant.source)}
                </Badge>
                {applicant.stage && (
                  <Badge variant="outline" style={{ borderColor: applicant.stage.color }}>
                    <span
                      className="inline-block h-2 w-2 rounded-full mr-1"
                      style={{ backgroundColor: applicant.stage.color }}
                    />
                    {applicant.stage.name}
                  </Badge>
                )}
              </div>
            </>
          ) : null}
        </SheetHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="space-y-4 py-4 px-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : applicant ? (
            <div className="space-y-6 py-4 px-6">
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

              <Separator />

              {/* Activity History */}
              <Separator />

              {/* Employee Info (if converted) */}
              {applicant.employee_id && applicant.employee && (
                <section className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    {t("applicants.employeeInfo")}
                  </h4>
                  <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("applicants.employeeCode")}</span>
                        <span className="font-medium">{applicant.employee.employee_code}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("applicants.fields.name")}</span>
                        <span className="font-medium">{applicant.employee.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("applicants.fields.email")}</span>
                        <span className="font-medium">{applicant.employee.email}</span>
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
              )}

              <Separator />

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
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="shrink-0 mt-0.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {getActivityIcon(activity.type as ActivityType)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>
                              {new Date(activity.created_at).toLocaleDateString()}
                            </span>
                            {activity.created_by_name && (
                              <>
                                <span>•</span>
                                <span>{activity.created_by_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </ScrollArea>

        {/* Actions */}
        {applicant && (
          <div className="flex flex-col gap-2 pt-4 px-6 border-t">
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
      </SheetContent>

      {/* Convert to Employee Dialog */}
      <ConvertToEmployeeDialog
        applicant={applicant || null}
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        onSuccess={() => {
          // Refresh applicant data
        }}
      />
    </Sheet>
  );
}
