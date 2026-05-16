"use client";

import { useState } from "react";
import { SalesTargetsList } from "./sales-targets-list";
import { SalesTargetProgress } from "./sales-target-progress";
import { useSalesTargets, useDeleteSalesTarget } from "../hooks/use-sales-targets";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SalesTargetForm } from "./sales-target-form";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { useUserPermission } from "@/hooks/use-user-permission";
import { usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";
import type { EmployeeSalesTarget } from "../types";
import { toast } from "sonner";

export function SalesTargetsDualUI() {
  const t = useTranslations("salesTargets");
  
  // Resolve permission scope for sales_target.read (OWN, AREA, DIVISION, ALL, etc.)
  const readScope = (usePermissionScope("sales_target.read") ?? "").toString().trim().toUpperCase();
  const isOwnScope = readScope === "OWN";
  // Any scope other than OWN should be treated as manager view (table)
  const isManagerScope = !isOwnScope && readScope.length > 0;

  const canCreate = useUserPermission("sales_target.create");
  const canUpdate = useUserPermission("sales_target.update");
  const canDelete = useUserPermission("sales_target.delete");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<EmployeeSalesTarget | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteTarget = useDeleteSalesTarget();

  // For OWN scope, fetch all visible targets and choose the most relevant record.
  const currentYear = new Date().getFullYear();
  const { data, isLoading } = useSalesTargets({
    year: undefined,
    scope: isManagerScope ? readScope : undefined,
  });

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteTarget.mutateAsync(deletingId);
        toast.success(t("deleted"));
        setDeletingId(null);
      } catch {
        toast.error(t("common.error"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTarget(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // If user has a manager scope (AREA, DIVISION, ALL, etc.), show the list.
  if (isManagerScope) {
    return <SalesTargetsList />;
  }

  // If user only has OWN permission, they are a sales rep. Show their personal target.
  if (isOwnScope) {
    const ownTargets = (data?.data ?? []) as EmployeeSalesTarget[];
    const target =
      ownTargets.find((item) => item.year === currentYear) ||
      [...ownTargets].sort((a, b) => b.year - a.year)[0];
    
    return (
      <div className="space-y-4">
        {!target ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-card shadow-sm">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Target className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t("noTarget")}</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              {t("noTargetDesc")}
            </p>
            {canCreate && (
              <Button onClick={() => setIsFormOpen(true)} className="cursor-pointer shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                {t("createTarget")}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              {canUpdate && (
                <Button variant="outline" size="sm" onClick={() => { setEditingTarget(target); setIsFormOpen(true); }} className="cursor-pointer">
                  <Pencil className="h-4 w-4 mr-2" />
                  {t("common.edit")}
                </Button>
              )}
              {canDelete && (
                <Button variant="outline" size="sm" onClick={() => setDeletingId(target.id)} className="cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("common.delete")}
                </Button>
              )}
            </div>
            <SalesTargetProgress target={target} />
          </div>
        )}

        {canCreate && (
          <SalesTargetForm
            open={isFormOpen}
            onClose={handleFormClose}
            target={editingTarget}
          />
        )}

        {canDelete && (
          <DeleteDialog
            open={!!deletingId}
            onOpenChange={(open) => !open && setDeletingId(null)}
            onConfirm={handleDelete}
            title={t("delete")}
            description={t("deleteDesc")}
            itemName={t("common.salesTarget")}
            isLoading={deleteTarget.isPending}
          />
        )}
      </div>
    );
  }

  return null;
}
