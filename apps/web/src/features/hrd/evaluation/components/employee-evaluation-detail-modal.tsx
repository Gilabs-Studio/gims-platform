"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Star,
  User,
  Calendar,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { EmployeeEvaluationForm } from "./employee-evaluation-form";
import {
  useEmployeeEvaluation,
  useDeleteEmployeeEvaluation,
  useUpdateEmployeeEvaluationStatus,
} from "../hooks/use-evaluations";
import { useUserPermission } from "@/hooks/use-user-permission";
import { toast } from "sonner";
import type { EmployeeEvaluation, EmployeeEvaluationStatus } from "../types";

interface EmployeeEvaluationDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly evaluation: EmployeeEvaluation | null;
}

export function EmployeeEvaluationDetailModal({
  open,
  onClose,
  evaluation,
}: EmployeeEvaluationDetailModalProps) {
  const t = useTranslations("evaluation");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const canEdit = useUserPermission("evaluation.update");
  const canDelete = useUserPermission("evaluation.delete");

  const deleteEvaluation = useDeleteEmployeeEvaluation();
  const updateStatus = useUpdateEmployeeEvaluationStatus();

  const { data: detailData, isLoading } = useEmployeeEvaluation(evaluation?.id ?? "", {
    enabled: open && !!evaluation?.id,
  });

  if (!evaluation) return null;

  const displayEvaluation = detailData?.data ?? evaluation;
  const criteriaScores = displayEvaluation.criteria_scores ?? [];

  const handleDelete = async () => {
    try {
      await deleteEvaluation.mutateAsync(evaluation.id);
      toast.success(t("evaluation.deleted"));
      setIsDeleteOpen(false);
      onClose();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleStatusChange = async (status: EmployeeEvaluationStatus) => {
    try {
      await updateStatus.mutateAsync({ id: evaluation.id, data: { status } });
      toast.success(t("evaluation.statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <FileText className="h-3 w-3 mr-1.5" />
            {t("status.draft")}
          </Badge>
        );
      case "SUBMITTED":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Send className="h-3 w-3 mr-1.5" />
            {t("status.submitted")}
          </Badge>
        );
      case "REVIEWED":
        return (
          <Badge variant="warning" className="text-xs font-medium">
            <ClipboardCheck className="h-3 w-3 mr-1.5" />
            {t("status.reviewed")}
          </Badge>
        );
      case "FINALIZED":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {t("status.finalized")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open && !isEditOpen} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              {t("evaluation.detail")}
            </DialogTitle>
          </DialogHeader>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {canEdit && displayEvaluation.status === "DRAFT" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditOpen(true)}
                className="cursor-pointer"
              >
                <Pencil className="h-3 w-3 mr-1" />
                {t("common.edit")}
              </Button>
            )}
            {canEdit && displayEvaluation.status === "DRAFT" && (
              <Button
                size="sm"
                onClick={() => handleStatusChange("SUBMITTED")}
                className="cursor-pointer"
              >
                <Send className="h-3 w-3 mr-1" />
                {t("actions.submit")}
              </Button>
            )}
            {canEdit && displayEvaluation.status === "SUBMITTED" && (
              <Button
                size="sm"
                onClick={() => handleStatusChange("REVIEWED")}
                className="cursor-pointer"
              >
                <ClipboardCheck className="h-3 w-3 mr-1" />
                {t("actions.review")}
              </Button>
            )}
            {canEdit && displayEvaluation.status === "REVIEWED" && (
              <Button
                size="sm"
                onClick={() => handleStatusChange("FINALIZED")}
                className="cursor-pointer"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t("actions.finalize")}
              </Button>
            )}
            {canDelete && displayEvaluation.status === "DRAFT" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setIsDeleteOpen(true)}
                className="cursor-pointer"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {t("common.delete")}
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="overview">
              <TabsList className="w-full">
                <TabsTrigger value="overview" className="flex-1 cursor-pointer">
                  {t("evaluation.overview")}
                </TabsTrigger>
                <TabsTrigger value="criteria-scores" className="flex-1 cursor-pointer">
                  {t("evaluation.criteriaScores")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="space-y-6 pt-4">
                  {/* Overall Score */}
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Star className="h-8 w-8 text-amber-500" />
                      <div>
                        <p className="text-2xl font-bold">
                          {displayEvaluation.overall_score > 0
                            ? displayEvaluation.overall_score.toFixed(1)
                            : "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">{t("evaluation.overallScore")}</p>
                      </div>
                    </div>
                    <div className="flex-1">
                      <Progress
                        value={displayEvaluation.overall_score}
                        className="h-2"
                      />
                    </div>
                    <div>{getStatusBadge(displayEvaluation.status)}</div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t("evaluation.employee")}</p>
                        <p className="font-medium">{displayEvaluation.employee?.name ?? "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t("evaluation.evaluator")}</p>
                        <p className="font-medium">{displayEvaluation.evaluator?.name ?? "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <ListChecks className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t("evaluation.evaluationGroup")}</p>
                        <p className="font-medium">{displayEvaluation.evaluation_group?.name ?? "-"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("evaluation.type")}</p>
                      <Badge variant="outline" className="mt-1">
                        {displayEvaluation.evaluation_type === "SELF"
                          ? t("evaluationType.self")
                          : t("evaluationType.manager")}
                      </Badge>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t("evaluation.period")}</p>
                        <p className="font-medium">
                          {displayEvaluation.period_start
                            ? new Date(displayEvaluation.period_start).toLocaleDateString()
                            : "-"}{" "}
                          -{" "}
                          {displayEvaluation.period_end
                            ? new Date(displayEvaluation.period_end).toLocaleDateString()
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {displayEvaluation.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t("evaluation.notes")}</p>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{displayEvaluation.notes}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="criteria-scores">
                <div className="space-y-3 pt-4">
                  {criteriaScores.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      {t("evaluation.noScores")}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("criteria.name")}</TableHead>
                            <TableHead className="text-center w-20">{t("evaluation.score")}</TableHead>
                            <TableHead className="text-center w-24">{t("criteria.weight")}</TableHead>
                            <TableHead className="text-center w-28">{t("evaluation.weightedScore")}</TableHead>
                            <TableHead>{t("evaluation.notes")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {criteriaScores.map((cs) => (
                            <TableRow key={cs.id}>
                              <TableCell className="font-medium">{cs.criteria_name ?? "-"}</TableCell>
                              <TableCell className="text-center">{cs.score}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{cs.weight}%</Badge>
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {cs.weighted_score.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {cs.notes ?? "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Form */}
      <EmployeeEvaluationForm
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        evaluation={displayEvaluation}
      />

      {/* Delete Confirmation */}
      <DeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        title={t("evaluation.delete")}
        description={t("evaluation.deleteDesc")}
        itemName={t("evaluation.label")}
        isLoading={deleteEvaluation.isPending}
      />
    </>
  );
}
