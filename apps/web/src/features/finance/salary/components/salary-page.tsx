"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";

import { PageMotion } from "@/components/motion";

import { SalaryHeader } from "./salary-header";
import { SalaryTableWithChart } from "./salary-table-with-chart";
import { SalaryForm } from "./salary-form";
import { SalaryApproveDialog } from "./salary-approve-dialog";
import { SalaryDeleteDialog } from "./salary-delete-dialog";

import {
  useApproveFinanceSalary,
  useDeleteFinanceSalary,
  useToggleFinanceSalaryStatus,
  financeSalaryKeys,
} from "../hooks/use-finance-salary";
import type { SalaryStructure } from "../types";

export function SalaryPage() {
  const t = useTranslations("financeSalary");
  const queryClient = useQueryClient();

  // Modal/dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedSalary, setSelectedSalary] = useState<SalaryStructure | null>(null);
  const [defaultEmployeeId, setDefaultEmployeeId] = useState<string | undefined>();

  const [approveOpen, setApproveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const approveMutation = useApproveFinanceSalary();
  const deleteMutation = useDeleteFinanceSalary();

  const handleCreate = useCallback((employeeId?: string) => {
    setSelectedSalary(null);
    setDefaultEmployeeId(employeeId);
    setFormMode("create");
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((salary: SalaryStructure) => {
    setSelectedSalary(salary);
    setDefaultEmployeeId(undefined);
    setFormMode("edit");
    setFormOpen(true);
  }, []);

  const handleApproveClick = useCallback((salary: SalaryStructure) => {
    setSelectedSalary(salary);
    setApproveOpen(true);
  }, []);

  const handleDeleteClick = useCallback((salary: SalaryStructure) => {
    setSelectedSalary(salary);
    setDeleteOpen(true);
  }, []);

  const toggleStatusMutation = useToggleFinanceSalaryStatus();

  const handleToggleStatus = useCallback(
    async (salary: SalaryStructure) => {
      try {
        setSelectedSalary(salary);
        await toggleStatusMutation.mutateAsync(salary.id);
        toast.success(
          salary.status === "active"
            ? t("toast.deactivated")
            : t("toast.activated")
        );
      } catch {
        toast.error(t("toast.failed"));
      }
    },
    [toggleStatusMutation, t]
  );

  const handleApproveConfirm = useCallback(
    async (id: string) => {
      try {
        await approveMutation.mutateAsync(id);
        toast.success(t("toast.approved"));
        setApproveOpen(false);
      } catch {
        toast.error(t("toast.failed"));
      }
    },
    [approveMutation, t]
  );

  const handleDeleteConfirm = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success(t("toast.deleted"));
        setDeleteOpen(false);
      } catch {
        toast.error(t("toast.failed"));
      }
    },
    [deleteMutation, t]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: financeSalaryKeys.all });
    setIsRefreshing(false);
  }, [queryClient]);
  return (
    <PageMotion className="space-y-6">
      {/* Header with stats */}
      <SalaryHeader
        onCreateClick={() => handleCreate()}
        onRefreshClick={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Expandable table */}
      <SalaryTableWithChart
        search={search}
        onSearchChange={setSearch}
        page={page}
        onPageChange={setPage}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onApprove={handleApproveClick}
        onDelete={handleDeleteClick}
        onToggleStatus={handleToggleStatus}
      />

      {/* Dialogs & Modals */}
      <SalaryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialData={selectedSalary}
        defaultEmployeeId={defaultEmployeeId}
      />

      <SalaryApproveDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        salary={selectedSalary}
        onConfirm={handleApproveConfirm}
        isLoading={approveMutation.isPending}
      />

      <SalaryDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        salary={selectedSalary}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />
    </PageMotion>
  );
}
