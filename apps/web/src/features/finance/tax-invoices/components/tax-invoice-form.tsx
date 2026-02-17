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

import { taxInvoiceFormSchema, type TaxInvoiceFormValues } from "../schemas/tax-invoice.schema";
import type { TaxInvoice } from "../types";
import { useCreateFinanceTaxInvoice, useUpdateFinanceTaxInvoice } from "../hooks/use-finance-tax-invoices";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: TaxInvoice | null;
};

export function TaxInvoiceForm({ open, onOpenChange, mode, initialData }: Props) {
  const t = useTranslations("financeTaxInvoices");

  const createMutation = useCreateFinanceTaxInvoice();
  const updateMutation = useUpdateFinanceTaxInvoice();

  const defaultValues = useMemo(
    () => ({
      tax_invoice_number: initialData?.tax_invoice_number ?? "",
      tax_invoice_date: (initialData?.tax_invoice_date ?? "").slice(0, 10),
      dpp_amount: initialData?.dpp_amount ?? 0,
      vat_amount: initialData?.vat_amount ?? 0,
      total_amount: initialData?.total_amount ?? 0,
      notes: initialData?.notes ?? "",
    }),
    [initialData],
  );

  const form = useForm<TaxInvoiceFormValues>({
    resolver: zodResolver(taxInvoiceFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: TaxInvoiceFormValues) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          tax_invoice_number: values.tax_invoice_number,
          tax_invoice_date: values.tax_invoice_date,
          dpp_amount: values.dpp_amount ?? 0,
          vat_amount: values.vat_amount ?? 0,
          total_amount: values.total_amount ?? 0,
          notes: values.notes ?? "",
        });
        toast.success(t("toast.created"));
      } else {
        const id = initialData?.id ?? "";
        if (!id) throw new Error("Missing id");
        await updateMutation.mutateAsync({
          id,
          data: {
            tax_invoice_number: values.tax_invoice_number,
            tax_invoice_date: values.tax_invoice_date,
            dpp_amount: values.dpp_amount ?? 0,
            vat_amount: values.vat_amount ?? 0,
            total_amount: values.total_amount ?? 0,
            notes: values.notes ?? "",
          },
        });
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
              <Label htmlFor="tax_invoice_number">{t("fields.number")}</Label>
              <Input id="tax_invoice_number" {...form.register("tax_invoice_number")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_invoice_date">{t("fields.date")}</Label>
              <Input id="tax_invoice_date" type="date" {...form.register("tax_invoice_date")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dpp_amount">{t("fields.dpp")}</Label>
              <Input id="dpp_amount" type="number" step="0.01" {...form.register("dpp_amount", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat_amount">{t("fields.vat")}</Label>
              <Input id="vat_amount" type="number" step="0.01" {...form.register("vat_amount", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_amount">{t("fields.total")}</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                {...form.register("total_amount", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("fields.notes")}</Label>
            <Textarea id="notes" rows={4} {...form.register("notes")} />
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
