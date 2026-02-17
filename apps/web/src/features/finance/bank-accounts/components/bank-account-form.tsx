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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useFinanceCoaTree } from "@/features/finance/coa/hooks/use-finance-coa";
import type { ChartOfAccountTreeNode } from "@/features/finance/coa/types";
import { bankAccountFormSchema, type BankAccountFormValues } from "../schemas/bank-account.schema";
import type { BankAccount } from "../types";
import { useCreateFinanceBankAccount, useFinanceBankAccount, useUpdateFinanceBankAccount } from "../hooks/use-finance-bank-accounts";

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

export function BankAccountForm({ open, onOpenChange, mode, id }: Props) {
  const t = useTranslations("financeBankAccounts");

  const accountQuery = useFinanceBankAccount(id ?? "", { enabled: mode === "edit" && !!id && open });
  const createMutation = useCreateFinanceBankAccount();
  const updateMutation = useUpdateFinanceBankAccount();

  const { data: coaTree } = useFinanceCoaTree({ only_active: true });
  const coaOptions = useMemo(() => flattenCoa(coaTree?.data ?? []), [coaTree?.data]);

  const initial: BankAccount | null = accountQuery.data?.data ?? null;

  const defaultValues: BankAccountFormValues = useMemo(
    () => ({
      name: initial?.name ?? "",
      account_number: initial?.account_number ?? "",
      account_holder: initial?.account_holder ?? "",
      currency: initial?.currency ?? "IDR",
      chart_of_account_id: initial?.chart_of_account_id ?? null,
      is_active: initial?.is_active ?? true,
    }),
    [initial],
  );

  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: BankAccountFormValues) => {
    try {
      const payload = {
        name: values.name,
        account_number: values.account_number,
        account_holder: values.account_holder,
        currency: values.currency,
        chart_of_account_id: values.chart_of_account_id ?? null,
        is_active: values.is_active ?? true,
      };

      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success(t("toast.created"));
      } else {
        const accountId = id ?? "";
        if (!accountId) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id: accountId, data: payload });
        toast.success(t("toast.updated"));
      }
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("fields.name")}</Label>
              <Input id="name" {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">{t("fields.currency")}</Label>
              <Input id="currency" {...form.register("currency")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_number">{t("fields.accountNumber")}</Label>
              <Input id="account_number" {...form.register("account_number")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_holder">{t("fields.accountHolder")}</Label>
              <Input id="account_holder" {...form.register("account_holder")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("fields.coa")}</Label>
            <Select
              value={form.watch("chart_of_account_id") ?? ""}
              onValueChange={(v) => form.setValue("chart_of_account_id", v ? v : null, { shouldDirty: true })}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t("placeholders.select")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="cursor-pointer">
                  -
                </SelectItem>
                {coaOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id} className="cursor-pointer">
                    {opt.code} - {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">{t("fields.status")}</div>
            </div>
            <Switch
              checked={form.watch("is_active") ?? true}
              onCheckedChange={(checked) => form.setValue("is_active", checked, { shouldDirty: true })}
              className="cursor-pointer"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
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
