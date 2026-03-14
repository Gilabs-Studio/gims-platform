"use client";

import { useTranslations } from "next-intl";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import type { SalaryStructure } from "../types";

interface SalaryDeleteDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly salary: SalaryStructure | null;
  readonly onConfirm: (id: string) => void;
  readonly isLoading?: boolean;
}

export function SalaryDeleteDialog({
  open,
  onOpenChange,
  salary,
  onConfirm,
  isLoading = false,
}: SalaryDeleteDialogProps) {
  const t = useTranslations("financeSalary");

  const handleConfirm = async () => {
    if (salary?.id) {
      onConfirm(salary.id);
    }
  };

  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
      title={t("delete.title")}
      description={t("delete.description")}
      itemName={salary?.employee?.name ?? t("delete.item")}
      isLoading={isLoading}
    />
  );
}
