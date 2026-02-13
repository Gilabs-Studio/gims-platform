"use client";

import { useState } from "react";
import { Edit, Trash2, GraduationCap, Calendar, FileText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { EducationHistoryForm } from "./education-history-form";
import {
  useDeleteEducationHistory,
  useEducationHistory,
} from "../hooks/use-education-history";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { EmployeeEducationHistory } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

// InfoRow component for displaying labeled values
function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number | null | undefined;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium wrap-break-word">{value || "-"}</p>
      </div>
    </div>
  );
}

interface EducationHistoryDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly educationHistory: EmployeeEducationHistory | null;
}

export function EducationHistoryDetailModal({
  open,
  onClose,
  educationHistory,
}: EducationHistoryDetailModalProps) {
  const deleteEducation = useDeleteEducationHistory();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const t = useTranslations("educationHistory");

  // Fetch full detail when modal opens
  const { data: detailData, isLoading } = useEducationHistory(
    educationHistory?.id ?? "",
    {
      enabled: open && !!educationHistory?.id,
    }
  );

  const canEdit = useUserPermission("education_history.update");
  const canDelete = useUserPermission("education_history.delete");

  if (!educationHistory) return null;

  // Use detailed data if available, otherwise use passed education history
  const displayEducation = detailData?.data ?? educationHistory;

  const handleDelete = async () => {
    try {
      await deleteEducation.mutateAsync(displayEducation.id);
      toast.success(t("deleted"));
      setIsDeleteDialogOpen(false);
      onClose();
    } catch {
      toast.error(t("common.error"));
    }
  };

  return (
    <>
      <Dialog open={open && !isEditDialogOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">
                    {t("details.title")}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {displayEducation.institution}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="cursor-pointer"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {t("common.edit")}
                  </Button>
                )}
                {canDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="cursor-pointer text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("common.delete")}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {isLoading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : (
              <>
                {/* Employee Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t("details.employeeInfo")}
                  </h3>
                  <div className="grid grid-cols-1 gap-2 bg-muted/50 p-4 rounded-lg">
                    <InfoRow
                      label={t("employee")}
                      value={displayEducation.employee_id}
                    />
                  </div>
                </div>

                <Separator />

                {/* Education Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    {t("details.educationInfo")}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow
                      label={t("institution")}
                      value={displayEducation.institution}
                    />
                    <div className="py-2">
                      <p className="text-sm text-muted-foreground mb-2">
                        {t("degree")}
                      </p>
                      <Badge variant="info" className="font-medium">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {t(`degrees.${displayEducation.degree}`)}
                      </Badge>
                    </div>
                    <InfoRow
                      label={t("fieldOfStudy")}
                      value={displayEducation.field_of_study}
                    />
                    <InfoRow
                      label={t("gpa")}
                      value={
                        displayEducation.gpa
                          ? displayEducation.gpa.toFixed(2)
                          : undefined
                      }
                    />
                  </div>
                </div>

                <Separator />

                {/* Timeline */}
                <div>
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t("details.timeline")}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow
                      label={t("startDate")}
                      value={new Date(
                        displayEducation.start_date
                      ).toLocaleDateString()}
                      icon={Calendar}
                    />
                    <InfoRow
                      label={t("endDate")}
                      value={
                        displayEducation.end_date
                          ? new Date(
                              displayEducation.end_date
                            ).toLocaleDateString()
                          : t("common.ongoing")
                      }
                      icon={Calendar}
                    />
                    <div className="py-2">
                      <p className="text-sm text-muted-foreground mb-2">
                        {t("isCompleted")}
                      </p>
                      {displayEducation.is_completed ? (
                        <Badge variant="success">{t("common.completed")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("common.ongoing")}</Badge>
                      )}
                    </div>
                    <InfoRow
                      label={t("durationYears")}
                      value={
                        displayEducation.duration_years
                          ? `${displayEducation.duration_years.toFixed(2)} ${t("durationYears").toLowerCase()}`
                          : undefined
                      }
                    />
                  </div>
                </div>

                {/* Description */}
                {displayEducation.description && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-2">
                        {t("description")}
                      </h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {displayEducation.description}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                {/* Document Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t("details.documentInfo")}
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <InfoRow
                      label={t("documentPath")}
                      value={
                        displayEducation.document_path ||
                        t("details.noDocument")
                      }
                      icon={FileText}
                    />
                  </div>
                </div>

                {/* Timestamps */}
                <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
                  <p>
                    Created:{" "}
                    {new Date(displayEducation.created_at).toLocaleString()}
                  </p>
                  <p>
                    Updated:{" "}
                    {new Date(displayEducation.updated_at).toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Form Dialog */}
      {isEditDialogOpen && (
        <EducationHistoryForm
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
          }}
          educationHistory={displayEducation}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDesc")}
        isLoading={deleteEducation.isPending}
      />
    </>
  );
}
