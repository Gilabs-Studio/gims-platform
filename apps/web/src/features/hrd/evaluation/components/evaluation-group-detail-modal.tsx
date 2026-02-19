"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Plus, CheckCircle2, XCircle, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal } from "lucide-react";
import { EvaluationGroupForm } from "./evaluation-group-form";
import { EvaluationCriteriaForm } from "./evaluation-criteria-form";
import { useEvaluationGroup, useEvaluationCriteriaByGroup, useDeleteEvaluationCriteria } from "../hooks/use-evaluations";
import { useUserPermission } from "@/hooks/use-user-permission";
import { toast } from "sonner";
import type { EvaluationGroup, EvaluationCriteria } from "../types";

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

  const canEdit = useUserPermission("evaluation.update");
  const canDelete = useUserPermission("evaluation.delete");

  const { data: detailData, isLoading } = useEvaluationGroup(group?.id ?? "", {
    enabled: open && !!group?.id,
  });

  const { data: criteriaData, isLoading: criteriaLoading } = useEvaluationCriteriaByGroup(
    group?.id ?? "",
    { per_page: 100 },
    { enabled: open && !!group?.id },
  );

  const deleteCriteria = useDeleteEvaluationCriteria();

  if (!group) return null;

  const displayGroup = detailData?.data ?? group;
  const criteria = criteriaData?.data ?? displayGroup.criteria ?? [];

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
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                {displayGroup.name}
              </DialogTitle>
              <div className="flex gap-2">
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => setIsEditOpen(true)} className="cursor-pointer">
                    <Pencil className="h-3 w-3 mr-1" />
                    {t("common.edit")}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("common.status")}</p>
                  <div className="mt-1">
                    {displayGroup.is_active ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t("common.active")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        {t("common.inactive")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("group.totalWeight")}</p>
                  <p className="font-medium mt-1">
                    <Badge variant={displayGroup.total_weight === 100 ? "success" : "destructive"}>
                      {displayGroup.total_weight}%
                    </Badge>
                  </p>
                </div>
              </div>

              {displayGroup.description && (
                <div>
                  <p className="text-sm text-muted-foreground">{t("group.description")}</p>
                  <p className="mt-1">{displayGroup.description}</p>
                </div>
              )}

              <Separator />

              {/* Criteria List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{t("criteria.title")}</h3>
                  {canEdit && (
                    <Button
                      size="sm"
                      onClick={() => setIsCriteriaFormOpen(true)}
                      className="cursor-pointer"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t("criteria.add")}
                    </Button>
                  )}
                </div>

                {criteriaLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : criteria.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    {t("criteria.notFound")}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>{t("criteria.name")}</TableHead>
                          <TableHead>{t("criteria.weight")}</TableHead>
                          <TableHead>{t("criteria.maxScore")}</TableHead>
                          <TableHead className="w-[50px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {criteria.map((c, idx) => (
                          <TableRow key={c.id}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{c.name}</p>
                                {c.description && (
                                  <p className="text-xs text-muted-foreground truncate max-w-xs">
                                    {c.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{c.weight}%</Badge>
                            </TableCell>
                            <TableCell>{c.max_score}</TableCell>
                            <TableCell>
                              {(canEdit || canDelete) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="cursor-pointer h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {canEdit && (
                                      <DropdownMenuItem
                                        onClick={() => handleEditCriteria(c)}
                                        className="cursor-pointer"
                                      >
                                        <Pencil className="h-4 w-4 mr-2" />
                                        {t("common.edit")}
                                      </DropdownMenuItem>
                                    )}
                                    {canDelete && (
                                      <DropdownMenuItem
                                        onClick={() => setDeletingCriteriaId(c.id)}
                                        className="text-destructive cursor-pointer"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {t("common.delete")}
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Group Form */}
      <EvaluationGroupForm
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        group={displayGroup}
      />

      {/* Criteria Form (Add/Edit) */}
      <EvaluationCriteriaForm
        open={isCriteriaFormOpen}
        onClose={handleCriteriaFormClose}
        criteria={editingCriteria}
        defaultGroupId={group.id}
      />

      {/* Delete Criteria Confirmation */}
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
