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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useFinanceCoaTree } from "@/features/finance/coa/hooks/use-finance-coa";
import type { ChartOfAccountTreeNode } from "@/features/finance/coa/types";

import { nonTradePayableSchema, type NonTradePayableValues } from "../schemas/non-trade-payable.schema";
import type { NonTradePayable } from "../types";
import { useCreateFinanceNonTradePayable, useUpdateFinanceNonTradePayable } from "../hooks/use-finance-non-trade-payables";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: NonTradePayable | null;
};

type CoaOption = { id: string; code: string; name: string };

function flattenCoa(nodes: ChartOfAccountTreeNode[]): CoaOption[] {
  const out: CoaOption[] = [];
  const walk = (arr: ChartOfAccountTreeNode[]) => {
    for (const n of arr) {
      out.push({ id: n.id, code: n.code, name: n.name });
      if (Array.isArray(n.children) && n.children.length > 0) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export function NonTradePayableForm({ open, onOpenChange, mode, initialData }: Props) {
  const t = useTranslations("financeNonTradePayables");

  const { data: coaData } = useFinanceCoaTree({ only_active: true });
  const coaOptions = useMemo(() => flattenCoa(coaData?.data ?? []), [coaData?.data]);

  const createMutation = useCreateFinanceNonTradePayable();
  const updateMutation = useUpdateFinanceNonTradePayable();

  const defaultValues: NonTradePayableValues = useMemo(
    () => ({
      transaction_date: (initialData?.transaction_date ?? new Date().toISOString()).slice(0, 10),
      description: initialData?.description ?? "",
      chart_of_account_id: initialData?.chart_of_account_id ?? "",
      amount: initialData?.amount ?? 0,
      vendor_name: initialData?.vendor_name ?? "",
      due_date: (initialData?.due_date ?? "")?.slice?.(0, 10) ?? null,
      reference_no: initialData?.reference_no ?? "",
    }),
    [initialData],
  );

  const form = useForm<NonTradePayableValues>({
    resolver: zodResolver(nonTradePayableSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: NonTradePayableValues) => {
    try {
      const payload = {
        transaction_date: values.transaction_date,
        description: values.description ?? "",
        chart_of_account_id: values.chart_of_account_id,
        amount: values.amount,
        vendor_name: values.vendor_name ?? "",
        due_date: values.due_date ?? null,
        reference_no: values.reference_no ?? "",
      };
      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success(t("toast.created"));
      } else {
        const id = initialData?.id ?? "";
        if (!id) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id, data: payload });
        toast.success(t("toast.updated"));
      }
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_date">{t("fields.transactionDate")}</Label>
              <Input id="transaction_date" type="date" {...form.register("transaction_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">{t("fields.dueDate")}</Label>
              <Input
                id="due_date"
                type="date"
                value={form.watch("due_date") ?? ""}
                onChange={(e) => form.setValue("due_date", e.target.value || null, { shouldDirty: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("fields.chartOfAccount")}</Label>
              <Select
                value={form.watch("chart_of_account_id") || ""}
                onValueChange={(v) => form.setValue("chart_of_account_id", v, { shouldDirty: true })}
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
            <div className="space-y-2">
              <Label htmlFor="amount">{t("fields.amount")}</Label>
              <Input id="amount" type="number" step="0.01" {...form.register("amount", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor_name">{t("fields.vendorName")}</Label>
              <Input id="vendor_name" {...form.register("vendor_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference_no">{t("fields.referenceNo")}</Label>
              <Input id="reference_no" {...form.register("reference_no")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("fields.description")}</Label>
            <Textarea id="description" rows={4} {...form.register("description")} />
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
