"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/utils";
import type { SalaryStructure } from "../types";

interface SalaryApproveDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly salary: SalaryStructure | null;
  readonly onConfirm: (id: string) => void;
  readonly isLoading?: boolean;
}

export function SalaryApproveDialog({
  open,
  onOpenChange,
  salary,
  onConfirm,
  isLoading = false,
}: SalaryApproveDialogProps) {
  const t = useTranslations("financeSalary");

  const handleConfirm = () => {
    if (salary?.id) {
      onConfirm(salary.id);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("approve.title")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>{t("approve.description")}</p>
              {salary && (
                <div className="rounded-lg border p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("fields.employee")}:
                    </span>
                    <span className="font-medium">
                      {salary.employee?.name ?? salary.employee_id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("fields.basicSalary")}:
                    </span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(salary.basic_salary)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("fields.effectiveDate")}:
                    </span>
                    <span>
                      {format(new Date(salary.effective_date), "MMM dd, yyyy")}
                    </span>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t("approve.warning")}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t("form.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || !salary}
            className="cursor-pointer"
          >
            {isLoading ? t("approve.processing") : t("actions.approve")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
