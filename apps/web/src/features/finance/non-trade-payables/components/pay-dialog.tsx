"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import DatePicker from "@/features/finance/assets/components/date-picker";

import { useFinanceBankAccounts } from "@/features/finance/bank-accounts/hooks/use-finance-bank-accounts";
import { usePayFinanceNonTradePayable } from "../hooks/use-finance-non-trade-payables";
import type { NonTradePayable } from "../types";

const paySchema = z.object({
  payment_date: z.string().min(1),
  bank_account_id: z.string().min(1),
  reference_no: z.string().optional(),
  notes: z.string().optional(),
});

type PayValues = z.infer<typeof paySchema>;

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

  const defaultValues: PayValues = useMemo(
    () => ({
      payment_date: new Date().toISOString().slice(0, 10),
      bank_account_id: "",
      reference_no: "",
      notes: "",
    }),
    [],
  );

  const form = useForm<PayValues>({
    resolver: zodResolver(paySchema),
    defaultValues,
  });

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
              value={form.watch("payment_date")}
              onChange={(value) => form.setValue("payment_date", value, { shouldDirty: true })}
              placeholder={t("fields.paymentDate")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("fields.bankAccount")}</Label>
            <Select
              onValueChange={(v) => form.setValue("bank_account_id", v)}
              value={form.watch("bank_account_id")}
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
            <Input {...form.register("reference_no")} />
          </div>

          <div className="space-y-2">
            <Label>{t("fields.notes")}</Label>
            <Textarea {...form.register("notes")} />
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
