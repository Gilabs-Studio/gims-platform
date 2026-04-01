"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarRange, Eye, Pencil, Trash2, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserPermission } from "@/hooks/use-user-permission";

import { toast } from "sonner";

import { EmployeeEvaluationAuditTrailContent } from "./evaluation-audit-trail";
import { EmployeeEvaluationForm } from "./employee-evaluation-form";
import {
  useDeleteEmployeeEvaluation,
  useEmployeeEvaluation,
} from "../hooks/use-evaluations";
import type { EmployeeEvaluation } from "../types";

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
  const [activeTab, setActiveTab] = useState("general");

  const canEdit = useUserPermission("evaluation.update");
  const canDelete = useUserPermission("evaluation.delete");
  const canAuditTrail = useUserPermission("evaluation.audit_trail");

  const deleteEvaluation = useDeleteEmployeeEvaluation();

  const { data: detailData, isLoading } = useEmployeeEvaluation(
    evaluation?.id ?? "",
    {
      enabled: open && !!evaluation?.id,
    },
  );

  if (!evaluation) {
    return null;
  }

  const displayEvaluation = detailData?.data ?? evaluation;
  const criteriaScores = displayEvaluation.criteria_scores ?? [];
  const employeeName = displayEvaluation.employee?.name ?? "-";
  const evaluatorName = displayEvaluation.evaluator?.name ?? "-";
  const criteriaCount = criteriaScores.length;

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  };

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

  return (
    <>
      <Dialog
        open={open && !isEditOpen}
        onOpenChange={(value) => !value && onClose()}
      >
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback
                      dataSeed={
                        displayEvaluation.employee?.employee_code ??
                        displayEvaluation.employee?.name ??
                        "employee"
                      }
                    >
                      {employeeName}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <DialogTitle className="truncate text-xl font-semibold">
                      {employeeName}
                    </DialogTitle>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {displayEvaluation.evaluation_type === "SELF"
                          ? t("evaluationType.self")
                          : t("evaluationType.manager")}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {displayEvaluation.evaluation_group?.name ?? "-"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("details.updatedAt")}:{" "}
                      {formatDate(displayEvaluation.updated_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer"
                    onClick={() => setIsEditOpen(true)}
                    title={t("common.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer text-destructive"
                    onClick={() => setIsDeleteOpen(true)}
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4 py-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="general" onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="general" className="cursor-pointer">
                  {t("tabs.general")}
                </TabsTrigger>
                {canAuditTrail ? (
                  <TabsTrigger value="audit_trail" className="cursor-pointer">
                    {t("tabs.auditTrail")}
                  </TabsTrigger>
                ) : null}
              </TabsList>

              <TabsContent value="general" className="space-y-6 pt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("evaluation.overallScore")}
                        </p>
                        <p className="mt-1 text-3xl font-semibold">
                          {displayEvaluation.overall_score > 0
                            ? displayEvaluation.overall_score.toFixed(1)
                            : "-"}
                        </p>
                      </div>
                      <UserRound className="h-6 w-6 text-primary" />
                    </div>
                    <div className="mt-4">
                      <Progress
                        value={displayEvaluation.overall_score}
                        className="h-2"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("evaluation.type")}
                        </p>
                        <div className="mt-2">
                          <Badge variant="outline">
                            {displayEvaluation.evaluation_type === "SELF"
                              ? t("evaluationType.self")
                              : t("evaluationType.manager")}
                          </Badge>
                        </div>
                      </div>
                      <CalendarRange className="h-6 w-6 text-primary" />
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {t("details.updatedAt")}:{" "}
                      {formatDate(displayEvaluation.updated_at)}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("details.criteriaCount")}
                        </p>
                        <p className="mt-1 text-3xl font-semibold">
                          {criteriaCount}
                        </p>
                      </div>
                      <Eye className="h-6 w-6 text-primary" />
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {t("details.createdAt")}:{" "}
                      {formatDate(displayEvaluation.created_at)}
                    </p>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("evaluation.employee")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback
                                dataSeed={
                                  displayEvaluation.employee?.employee_code ??
                                  displayEvaluation.employee?.name ??
                                  "employee"
                                }
                              >
                                {employeeName}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {employeeName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {displayEvaluation.employee?.employee_code ??
                                  "-"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("evaluation.evaluator")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback
                                dataSeed={
                                  displayEvaluation.evaluator?.employee_code ??
                                  displayEvaluation.evaluator?.name ??
                                  "evaluator"
                                }
                              >
                                {evaluatorName}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {evaluatorName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {displayEvaluation.evaluator?.employee_code ??
                                  "-"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("evaluation.evaluationGroup")}
                        </TableCell>
                        <TableCell>
                          {displayEvaluation.evaluation_group?.name ?? "-"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("evaluation.period")}
                        </TableCell>
                        <TableCell>
                          {formatDate(displayEvaluation.period_start)} -{" "}
                          {formatDate(displayEvaluation.period_end)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("evaluation.type")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {displayEvaluation.evaluation_type === "SELF"
                              ? t("evaluationType.self")
                              : t("evaluationType.manager")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("evaluation.notes")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {displayEvaluation.notes?.trim()
                            ? displayEvaluation.notes
                            : t("details.emptyDescription")}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                <h3 className="text-base font-semibold">
                  {t("evaluation.criteriaScores")}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  {criteriaScores.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                      {t("evaluation.noScores")}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("criteria.name")}</TableHead>
                          <TableHead className="w-24 text-center">
                            {t("evaluation.score")}
                          </TableHead>
                          <TableHead className="w-28 text-center">
                            {t("criteria.weight")}
                          </TableHead>
                          <TableHead className="w-32 text-center">
                            {t("evaluation.weightedScore")}
                          </TableHead>
                          <TableHead>{t("evaluation.notes")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {criteriaScores.map((criteriaScore) => (
                          <TableRow key={criteriaScore.id}>
                            <TableCell className="font-medium">
                              {criteriaScore.criteria_name ?? "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              {criteriaScore.score}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">
                                {criteriaScore.weight}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {criteriaScore.weighted_score.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {criteriaScore.notes?.trim()
                                ? criteriaScore.notes
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              {canAuditTrail ? (
                <TabsContent value="audit_trail" className="pt-4">
                  <EmployeeEvaluationAuditTrailContent
                    evaluationId={evaluation.id}
                    enabled={open && activeTab === "audit_trail"}
                  />
                </TabsContent>
              ) : null}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <EmployeeEvaluationForm
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        evaluation={displayEvaluation}
      />

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
