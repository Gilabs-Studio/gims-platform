"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Scale,
  Trash2,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import { EvaluationGroupAuditTrailContent } from "./evaluation-audit-trail";
import { EvaluationCriteriaForm } from "./evaluation-criteria-form";
import { EvaluationGroupForm } from "./evaluation-group-form";
import {
  useDeleteEvaluationCriteria,
  useDeleteEvaluationGroup,
  useEvaluationCriteriaByGroup,
  useEvaluationGroup,
} from "../hooks/use-evaluations";
import type { EvaluationCriteria, EvaluationGroup } from "../types";

interface EvaluationGroupDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly group: EvaluationGroup | null;
}

export function EvaluationGroupDetailModal({ open, onClose, group }: EvaluationGroupDetailModalProps) {
  const t = useTranslations("evaluation");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCriteriaFormOpen, setIsCriteriaFormOpen] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<EvaluationCriteria | null>(null);
  const [deletingCriteriaId, setDeletingCriteriaId] = useState<string | null>(null);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const canEdit = useUserPermission("evaluation.update");
  const canDelete = useUserPermission("evaluation.delete");
  const canAuditTrail = useUserPermission("evaluation.audit_trail");

  const { data: detailData, isLoading } = useEvaluationGroup(group?.id ?? "", {
    enabled: open && !!group?.id,
  });

  const { data: criteriaData, isLoading: criteriaLoading } = useEvaluationCriteriaByGroup(
    group?.id ?? "",
    { per_page: 100 },
    { enabled: open && !!group?.id },
  );

  const deleteCriteria = useDeleteEvaluationCriteria();
  const deleteGroup = useDeleteEvaluationGroup();

  if (!group) return null;

  const displayGroup = detailData?.data ?? group;
  const criteria = criteriaData?.data ?? displayGroup.criteria ?? [];

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroup.mutateAsync(displayGroup.id);
      toast.success(t("group.deleted"));
      setIsDeleteGroupOpen(false);
      onClose();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleDeleteCriteria = async () => {
    if (deletingCriteriaId) {
      try {
        await deleteCriteria.mutateAsync(deletingCriteriaId);
        toast.success(t("criteria.deleted"));
        setDeletingCriteriaId(null);
      } catch {
        toast.error(t("common.error"));
      }
    }
  };

  const handleEditCriteria = (c: EvaluationCriteria) => {
    setEditingCriteria(c);
    setIsCriteriaFormOpen(true);
  };

  const handleCriteriaFormClose = () => {
    setIsCriteriaFormOpen(false);
    setEditingCriteria(null);
  };

  return (
    <>
      <Dialog open={open && !isEditOpen} onOpenChange={(v) => !v && onClose()}>
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 truncate text-xl font-semibold">
                <ListChecks className="h-5 w-5" />
                {displayGroup.name}
                </DialogTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {displayGroup.is_active ? (
                    <Badge variant="success">{t("common.active")}</Badge>
                  ) : (
                    <Badge variant="secondary">{t("common.inactive")}</Badge>
                  )}
                  <Badge variant={displayGroup.total_weight === 100 ? "success" : "warning"}>
                    {displayGroup.total_weight}%
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {criteria.length} {t("details.criteriaCount")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer"
                    onClick={() => setIsCriteriaFormOpen(true)}
                    title={t("criteria.add")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                ) : null}
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
                    onClick={() => setIsDeleteGroupOpen(true)}
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
                        <p className="text-sm text-muted-foreground">{t("common.status")}</p>
                        <div className="mt-2">
                          {displayGroup.is_active ? (
                            <Badge variant="success">{t("common.active")}</Badge>
                          ) : (
                            <Badge variant="secondary">{t("common.inactive")}</Badge>
                          )}
                        </div>
                      </div>
                      {displayGroup.is_active ? (
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      ) : (
                        <XCircle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("group.totalWeight")}</p>
                        <p className="mt-1 text-3xl font-semibold">{displayGroup.total_weight}%</p>
                      </div>
                      <Scale className="h-6 w-6 text-primary" />
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("details.criteriaCount")}</p>
                        <p className="mt-1 text-3xl font-semibold">{criteria.length}</p>
                      </div>
                      <ListChecks className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <h3 className="mb-4 text-base font-semibold">{t("details.summary")}</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("group.description")}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground whitespace-pre-wrap">
                          {displayGroup.description?.trim() ? displayGroup.description : t("details.emptyDescription")}
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">{t("details.createdAt")}</p>
                          <p className="mt-2 font-medium">{formatDate(displayGroup.created_at)}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">{t("details.updatedAt")}</p>
                          <p className="mt-2 font-medium">{formatDate(displayGroup.updated_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-base font-semibold">{t("criteria.title")}</h3>
                      {canEdit ? (
                        <Button size="sm" onClick={() => setIsCriteriaFormOpen(true)} className="cursor-pointer">
                          <Plus className="mr-2 h-3 w-3" />
                          {t("criteria.add")}
                        </Button>
                      ) : null}
                    </div>

                    {criteriaLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton key={index} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : criteria.length === 0 ? (
                      <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                        {t("criteria.notFound")}
                      </div>
                    ) : (
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-14">#</TableHead>
                              <TableHead>{t("criteria.name")}</TableHead>
                              <TableHead className="w-28">{t("criteria.weight")}</TableHead>
                              <TableHead className="w-28">{t("criteria.maxScore")}</TableHead>
                              <TableHead className="w-16" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {criteria.map((criterion, index) => (
                              <TableRow key={criterion.id}>
                                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{criterion.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {criterion.description?.trim() ? criterion.description : t("details.emptyDescription")}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{criterion.weight}%</Badge>
                                </TableCell>
                                <TableCell>{criterion.max_score}</TableCell>
                                <TableCell>
                                  {(canEdit || canDelete) ? (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {canEdit ? (
                                          <DropdownMenuItem
                                            onClick={() => handleEditCriteria(criterion)}
                                            className="cursor-pointer"
                                          >
                                            <Pencil className="mr-2 h-4 w-4" />
                                            {t("common.edit")}
                                          </DropdownMenuItem>
                                        ) : null}
                                        {canDelete ? (
                                          <DropdownMenuItem
                                            onClick={() => setDeletingCriteriaId(criterion.id)}
                                            className="cursor-pointer text-destructive"
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            {t("common.delete")}
                                          </DropdownMenuItem>
                                        ) : null}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  ) : null}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {canAuditTrail ? (
                <TabsContent value="audit_trail" className="pt-4">
                  <EvaluationGroupAuditTrailContent
                    groupId={displayGroup.id}
                    enabled={open && activeTab === "audit_trail"}
                  />
                </TabsContent>
              ) : null}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <EvaluationGroupForm
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        group={displayGroup}
      />

      <EvaluationCriteriaForm
        open={isCriteriaFormOpen}
        onClose={handleCriteriaFormClose}
        criteria={editingCriteria}
        defaultGroupId={group.id}
      />

      <DeleteDialog
        open={isDeleteGroupOpen}
        onOpenChange={setIsDeleteGroupOpen}
        onConfirm={handleDeleteGroup}
        title={t("group.delete")}
        description={t("group.deleteDesc")}
        itemName={displayGroup.name}
        isLoading={deleteGroup.isPending}
      />

      <DeleteDialog
        open={!!deletingCriteriaId}
        onOpenChange={(open) => !open && setDeletingCriteriaId(null)}
        onConfirm={handleDeleteCriteria}
        title={t("criteria.delete")}
        description={t("criteria.deleteDesc")}
        itemName={t("criteria.label")}
        isLoading={deleteCriteria.isPending}
      />
    </>
  );
}
