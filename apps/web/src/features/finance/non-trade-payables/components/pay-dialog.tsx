"use client";

import { useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DatePicker from "@/features/finance/assets/components/date-picker";

import { useFinanceBankAccounts } from "@/features/finance/bank-accounts/hooks/use-finance-bank-accounts";
import { usePayFinanceNonTradePayable } from "../hooks/use-finance-non-trade-payables";
import type { NonTradePayable } from "../types";

const paySchema = z.object({
  payment_date: z.string().min(1),
  bank_account_id: z.string().min(1),
  bank_reference: z.string().optional(),
  amount: z.preprocess((v) => {
    if (typeof v === "string") return v === "" ? NaN : Number(v);
    return v;
  }, z.number().min(0.01)),
});

type PayFormValues = z.input<typeof paySchema>;
type PayValues = z.output<typeof paySchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: NonTradePayable | null;
};

export function PayNonTradePayableDialog({ open, onOpenChange, item }: Props) {
  const t = useTranslations("financeNonTradePayables");
  const payMutation = usePayFinanceNonTradePayable();

  const { data: bankAccountsData } = useFinanceBankAccounts({ page: 1, per_page: 100 });
  const bankAccounts = bankAccountsData?.data ?? [];

  const defaultValues: PayFormValues = useMemo(
    () => ({
      payment_date: new Date().toISOString().slice(0, 10),
      bank_account_id: "",
      bank_reference: "",
      amount: 0,
    }),
    [],
  );

  const form = useForm<PayFormValues, unknown, PayValues>({
    resolver: zodResolver(paySchema),
    defaultValues,
  });

  useEffect(() => {
    if (item) {
      form.setValue("amount", item.remaining_amount ?? item.amount ?? 0, { shouldDirty: true });
    }
  }, [item, form]);

  const paymentDate = useWatch({ control: form.control, name: "payment_date" });
  const bankAccountId = useWatch({ control: form.control, name: "bank_account_id" });

  const onSubmit = async (values: PayValues) => {
    if (!item) return;
    try {
      await payMutation.mutateAsync({
        id: item.id,
        data: values,
      });
      toast.success(t("toast.paid"));
      onOpenChange(false);
      form.reset();
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("actions.pay")}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>{t("fields.paymentDate")}</Label>
            <DatePicker
              value={paymentDate}
              onChange={(value) => form.setValue("payment_date", value, { shouldDirty: true })}
              placeholder={t("fields.paymentDate")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("fields.bankAccount")}</Label>
            <Select
              onValueChange={(v) => form.setValue("bank_account_id", v)}
              value={bankAccountId}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t("placeholders.selectBank")} />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id} className="cursor-pointer">
                    {acc.name} - {acc.account_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("fields.referenceNo")}</Label>
            <Input {...form.register("bank_reference")} />
          </div>

          <div className="space-y-2">
            <Label>{t("fields.amount")}</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              {...form.register("amount")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              {t("form.cancel")}
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={payMutation.isPending}>
              {t("actions.pay")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
