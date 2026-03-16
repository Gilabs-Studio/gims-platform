"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  CheckCircle,
  Clock,
  Download,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { getDisplayFilename } from "@/components/ui/file-upload";
import { resolveImageUrl } from "@/lib/utils";
import type { EmployeeEducationHistory, DegreeLevel } from "../../types";

interface EducationTimelineProps {
  readonly educations: EmployeeEducationHistory[];
  readonly onAdd?: () => void;
  readonly onEdit?: (education: EmployeeEducationHistory) => void;
  readonly onDelete?: (education: EmployeeEducationHistory) => void;
  readonly canEdit?: boolean;
  readonly canDelete?: boolean;
}

export function EducationTimeline({
  educations,
  onAdd,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}: EducationTimelineProps) {
  const t = useTranslations("employee");

  const getDegreeColor = (degree: DegreeLevel) => {
    switch (degree) {
      case "DOCTORATE":
        return "bg-purple";
      case "MASTER":
        return "bg-primary";
      case "BACHELOR":
        return "bg-primary";
      case "DIPLOMA":
        return "bg-cyan";
      case "SENIOR_HIGH":
        return "bg-success";
      case "JUNIOR_HIGH":
        return "bg-warning";
      case "ELEMENTARY":
        return "bg-warning";
      default:
        return "bg-mutedgray";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "PPP");
  };

  const sortedEducations = [...educations].sort(
    (a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
  );

  return (
    <div>
      {onAdd && canEdit && (
        <div className="mb-4 flex justify-end">
          <Button
            size="sm"
            onClick={onAdd}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("education.actions.create")}
          </Button>
        </div>
      )}

      {sortedEducations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("education.empty.noHistory")}</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            {sortedEducations.map((education) => {
              const degreeLabel =
                t(
                  `education.degrees.${education.degree}` as Parameters<
                    typeof t
                  >[0],
                ) ?? education.degree;

              return (
                <div key={education.id} className="relative flex gap-4">
                  <div
                    className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full ${getDegreeColor(
                      education.degree,
                    )} flex items-center justify-center shadow-md`}
                  >
                    {education.is_completed ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <Clock className="h-5 w-5 text-white" />
                    )}
                  </div>

                  <div className="flex-1 pb-6">
                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h4 className="font-semibold text-base">
                            {education.institution}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {degreeLabel}
                            {education.field_of_study
                              ? ` - ${education.field_of_study}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              education.is_completed
                                ? "bg-success/15 text-success border-emerald-500/20"
                                : "bg-primary/15 text-primary border-blue-500/20"
                            }
                          >
                            {education.is_completed
                              ? t("education.fields.completed")
                              : t("education.fields.ongoing")}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            {t("education.fields.startDate")}:{" "}
                          </span>
                          <span className="font-medium">
                            {formatDate(education.start_date)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {t("education.fields.endDate")}:{" "}
                          </span>
                          <span className="font-medium">
                            {education.end_date
                              ? formatDate(education.end_date)
                              : "-"}
                          </span>
                        </div>
                      </div>

                      {education.gpa != null && (
                        <div className="mb-3 text-sm">
                          <span className="text-muted-foreground">
                            {t("education.fields.gpa")}:{" "}
                          </span>
                          <span className="font-medium">
                            {education.gpa.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {education.description && (
                        <div className="mb-3 p-3 bg-muted/50 rounded-md text-sm">
                          <p className="text-muted-foreground">
                            {education.description}
                          </p>
                        </div>
                      )}

                      {education.document_path && (
                        <div className="mb-3 p-3 bg-muted/50 rounded-md text-sm flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {t("education.fields.document")}:{" "}
                          </span>
                          <a
                            href={
                              resolveImageUrl(education.document_path) ?? "#"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:text-primary hover:underline cursor-pointer font-medium"
                          >
                            <Download className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[300px]">
                              {getDisplayFilename(education.document_path) ||
                                t("education.fields.document")}
                            </span>
                          </a>
                        </div>
                      )}

                      {(canEdit || canDelete) && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          {canEdit && onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(education)}
                              className="cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              {t("education.actions.edit")}
                            </Button>
                          )}
                          {canDelete && onDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(education)}
                              className="text-destructive hover:text-destructive hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              {t("education.actions.delete")}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
