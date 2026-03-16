"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { useFinanceCoaTree } from "@/features/finance/coa/hooks/use-finance-coa";
import type { ChartOfAccountTreeNode } from "@/features/finance/coa/types";
import { budgetFormSchema, type BudgetFormValues } from "../schemas/budget.schema";
import { useCreateFinanceBudget, useFinanceBudget, useUpdateFinanceBudget } from "../hooks/use-finance-budget";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  id?: string | null;
};

type CoaOption = { id: string; code: string; name: string };

function flattenCoa(nodes: ChartOfAccountTreeNode[]): CoaOption[] {
  const out: CoaOption[] = [];
  const walk = (ns: ChartOfAccountTreeNode[]) => {
    ns.forEach((n) => {
      out.push({ id: n.id, code: n.code, name: n.name });
      if (n.children?.length) walk(n.children);
    });
  };
  walk(nodes);
  return out;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BudgetForm({ open, onOpenChange, mode, id }: Props) {
  const t = useTranslations("financeBudget");

  const budgetQuery = useFinanceBudget(id ?? "", { enabled: mode === "edit" && !!id && open });
  const createMutation = useCreateFinanceBudget();
  const updateMutation = useUpdateFinanceBudget();

  const { data: coaTree } = useFinanceCoaTree({ only_active: true });
  const coaOptions = useMemo(() => flattenCoa(coaTree?.data ?? []), [coaTree?.data]);

  const defaultValues: BudgetFormValues = useMemo(() => {
    if (mode === "edit") {
      const b = budgetQuery.data?.data;
      if (b) {
        return {
          name: b.name ?? "",
          description: b.description ?? "",
          department: b.department ?? "",
          fiscal_year: b.fiscal_year ?? "",
          start_date: (b.start_date ?? "").slice(0, 10) || todayISO(),
          end_date: (b.end_date ?? "").slice(0, 10) || todayISO(),
          items: (b.items ?? []).map((it) => ({
            chart_of_account_id: it.chart_of_account_id,
            amount: Number(it.amount ?? 0),
            memo: it.memo ?? "",
          })),
        };
      }
    }

    return {
      name: "",
      description: "",
      department: "",
      fiscal_year: String(new Date().getFullYear()),
      start_date: todayISO(),
      end_date: todayISO(),
      items: [{ chart_of_account_id: "", amount: 0, memo: "" }],
    };
  }, [mode, budgetQuery.data?.data]);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: BudgetFormValues) => {
    try {
      const payload = {
        name: values.name,
        description: values.description ?? "",
        department: values.department ?? undefined,
        fiscal_year: values.fiscal_year ?? undefined,
        start_date: values.start_date,
        end_date: values.end_date,
        items: values.items.map((it) => ({
          chart_of_account_id: it.chart_of_account_id,
          amount: it.amount,
          memo: it.memo ?? "",
        })),
      };

      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success(t("toast.created"));
      } else {
        const budgetId = id ?? "";
        if (!budgetId) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id: budgetId, data: payload });
        toast.success(t("toast.updated"));
      }
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
        </DialogHeader>

        {mode === "edit" && budgetQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Section: Budget Header */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-muted-foreground border-b pb-1">{t("form.headerSection")}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("fields.name")}</Label>
                  <Input id="name" {...form.register("name")} placeholder={t("fields.name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t("fields.description")}</Label>
                  <Input id="description" {...form.register("description")} placeholder={t("fields.description")} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">{t("fields.department")}</Label>
                  <Input
                    id="department"
                    {...form.register("department")}
                    placeholder={t("placeholders.department")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fiscal_year">{t("fields.fiscalYear")}</Label>
                  <Input
                    id="fiscal_year"
                    {...form.register("fiscal_year")}
                    placeholder={t("placeholders.fiscalYear")}
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">{t("fields.startDate")}</Label>
                  <Input id="start_date" type="date" {...form.register("start_date")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">{t("fields.endDate")}</Label>
                  <Input id="end_date" type="date" {...form.register("end_date")} />
                </div>
              </div>
            </div>

            {/* Section: Budget Lines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-1">
                <p className="text-sm font-semibold text-muted-foreground">{t("form.linesSection")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => append({ chart_of_account_id: "", amount: 0, memo: "" })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("form.addItem")}
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((f, idx) => (
                  <div key={f.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6 space-y-1">
                      <Label>{t("fields.account")}</Label>
                      <Select
                        value={form.watch(`items.${idx}.chart_of_account_id`) || ""}
                        onValueChange={(v) => form.setValue(`items.${idx}.chart_of_account_id`, v, { shouldDirty: true })}
                      >
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("placeholders.select")} />
                        </SelectTrigger>
                        <SelectContent>
                          {coaOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id} className="cursor-pointer">
                              {opt.code} - {opt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <Label>{t("fields.amount")}</Label>
                      <Input type="number" step="0.01" {...form.register(`items.${idx}.amount`, { valueAsNumber: true })} />
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <Label>{t("fields.memo")}</Label>
                      <Input {...form.register(`items.${idx}.memo`)} />
                    </div>

                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => remove(idx)}
                        disabled={fields.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
