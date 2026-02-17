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
import { useFinanceBankAccounts } from "@/features/finance/bank-accounts/hooks/use-finance-bank-accounts";
import { paymentFormSchema, type PaymentFormValues } from "../schemas/payment.schema";
import { useCreateFinancePayment, useFinancePayment, useUpdateFinancePayment } from "../hooks/use-finance-payments";

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

export function PaymentForm({ open, onOpenChange, mode, id }: Props) {
  const t = useTranslations("financePayments");

  const paymentQuery = useFinancePayment(id ?? "", { enabled: mode === "edit" && !!id && open });
  const createMutation = useCreateFinancePayment();
  const updateMutation = useUpdateFinancePayment();

  const { data: coaTree } = useFinanceCoaTree({ only_active: true });
  const coaOptions = useMemo(() => flattenCoa(coaTree?.data ?? []), [coaTree?.data]);

  const { data: bankAccountsData } = useFinanceBankAccounts({ per_page: 100, is_active: true, sort_by: "name", sort_dir: "asc" });
  const bankAccounts = bankAccountsData?.data ?? [];

  const defaultValues: PaymentFormValues = useMemo(() => {
    if (mode === "edit") {
      const p = paymentQuery.data?.data;
      if (p) {
        return {
          payment_date: (p.payment_date ?? "").slice(0, 10) || todayISO(),
          description: p.description ?? "",
          bank_account_id: p.bank_account_id ?? "",
          total_amount: Number(p.total_amount ?? 0),
          allocations: (p.allocations ?? []).map((a) => ({
            chart_of_account_id: a.chart_of_account_id,
            amount: Number(a.amount ?? 0),
            memo: a.memo ?? "",
            reference_type: a.reference_type ?? null,
            reference_id: a.reference_id ?? null,
          })),
        };
      }
    }

    return {
      payment_date: todayISO(),
      description: "",
      bank_account_id: "",
      total_amount: 0,
      allocations: [{ chart_of_account_id: "", amount: 0, memo: "", reference_type: null, reference_id: null }],
    };
  }, [mode, paymentQuery.data?.data]);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "allocations" });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      const payload = {
        payment_date: values.payment_date,
        description: values.description ?? "",
        bank_account_id: values.bank_account_id,
        total_amount: values.total_amount,
        allocations: values.allocations.map((a) => ({
          chart_of_account_id: a.chart_of_account_id,
          amount: a.amount,
          memo: a.memo ?? "",
          reference_type: a.reference_type ?? null,
          reference_id: a.reference_id ?? null,
        })),
      };

      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success(t("toast.created"));
      } else {
        const paymentId = id ?? "";
        if (!paymentId) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id: paymentId, data: payload });
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

        {mode === "edit" && paymentQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_date">{t("fields.paymentDate")}</Label>
                <Input id="payment_date" type="date" {...form.register("payment_date")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_amount">{t("fields.totalAmount")}</Label>
                <Input type="number" step="0.01" {...form.register("total_amount", { valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">{t("fields.description")}</Label>
                <Input id="description" {...form.register("description")} />
              </div>
              <div className="space-y-2">
                <Label>{t("fields.bankAccount")}</Label>
                <Select
                  value={form.watch("bank_account_id") || ""}
                  onValueChange={(v) => form.setValue("bank_account_id", v, { shouldDirty: true })}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder={t("placeholders.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((ba) => (
                      <SelectItem key={ba.id} value={ba.id} className="cursor-pointer">
                        {ba.name} - {ba.account_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border">
              <div className="flex items-center justify-between p-3 border-b">
                <div className="text-sm font-medium">{t("title")}</div>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => append({ chart_of_account_id: "", amount: 0, memo: "", reference_type: null, reference_id: null })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("form.addAllocation")}
                </Button>
              </div>

              <div className="p-3 space-y-3">
                {fields.map((f, idx) => (
                  <div key={f.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6 space-y-1">
                      <Label>{t("fields.account")}</Label>
                      <Select
                        value={form.watch(`allocations.${idx}.chart_of_account_id`) || ""}
                        onValueChange={(v) => form.setValue(`allocations.${idx}.chart_of_account_id`, v, { shouldDirty: true })}
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
                      <Input type="number" step="0.01" {...form.register(`allocations.${idx}.amount`, { valueAsNumber: true })} />
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <Label>{t("fields.memo")}</Label>
                      <Input {...form.register(`allocations.${idx}.memo`)} />
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
