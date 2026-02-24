"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { salaryFormSchema, type SalaryFormValues } from "../schemas/salary.schema";
import type { SalaryStructure } from "../types";
import { useCreateFinanceSalary, useUpdateFinanceSalary } from "../hooks/use-finance-salary";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: SalaryStructure | null;
};

export function SalaryForm({ open, onOpenChange, mode, initialData }: Props) {
  const t = useTranslations("financeSalary");

  const createMutation = useCreateFinanceSalary();
  const updateMutation = useUpdateFinanceSalary();

  const defaultValues: SalaryFormValues = useMemo(
    () => ({
      employee_id: initialData?.employee_id ?? "",
      effective_date: (initialData?.effective_date ?? new Date().toISOString()).slice(0, 10),
      basic_salary: initialData?.basic_salary ?? 0,
      notes: initialData?.notes ?? "",
    }),
    [initialData],
  );

  const form = useForm<SalaryFormValues>({
    resolver: zodResolver(salaryFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: SalaryFormValues) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync(values);
        toast.success(t("toast.created"));
      } else {
        const id = initialData?.id ?? "";
        if (!id) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id, data: values });
        toast.success(t("toast.updated"));
      }
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="employee_id">{t("fields.employee")}</Label>
            <Input id="employee_id" placeholder="Employee UUID" {...form.register("employee_id")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effective_date">{t("fields.effectiveDate")}</Label>
              <Input id="effective_date" type="date" {...form.register("effective_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="basic_salary">{t("fields.basicSalary")}</Label>
              <Input id="basic_salary" type="number" step="0.01" {...form.register("basic_salary", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("fields.notes")}</Label>
            <Textarea id="notes" rows={3} {...form.register("notes")} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer" disabled={isSubmitting}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
              {t("form.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
