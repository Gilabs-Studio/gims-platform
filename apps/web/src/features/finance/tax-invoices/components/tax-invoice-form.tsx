"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupplierInvoices, useSupplierInvoice } from "@/features/purchase/supplier-invoices/hooks/use-supplier-invoices";
import { formatCurrency } from "@/lib/utils";

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
  const tCommon = useTranslations("common");

  const createMutation = useCreateFinanceTaxInvoice();
  const updateMutation = useUpdateFinanceTaxInvoice();

  const { data: siData } = useSupplierInvoices({ page: 1, per_page: 100 });
  const supplierInvoices = siData?.data ?? [];

  const defaultValues = useMemo(
    () => ({
      tax_invoice_number: initialData?.tax_invoice_number ?? "",
      tax_invoice_date: (initialData?.tax_invoice_date ?? "").slice(0, 10),
      supplier_invoice_id: initialData?.supplier_invoice_id ?? null,
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

  const selectedSIId = form.watch("supplier_invoice_id");
  const { data: selectedSIReponse } = useSupplierInvoice(selectedSIId ?? "", { enabled: !!selectedSIId });
  const selectedSI = selectedSIReponse?.data;

  useEffect(() => {
    if (selectedSI && mode === "create") {
      form.setValue("dpp_amount", selectedSI.sub_total);
      form.setValue("vat_amount", selectedSI.tax_amount);
      form.setValue("total_amount", selectedSI.amount);
    }
  }, [selectedSI, mode, form]);

  const onSubmit = async (values: TaxInvoiceFormValues) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          tax_invoice_number: values.tax_invoice_number,
          tax_invoice_date: values.tax_invoice_date,
          supplier_invoice_id: values.supplier_invoice_id,
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
            supplier_invoice_id: values.supplier_invoice_id,
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
              <Label>{t("fields.number")}</Label>
              <Input {...form.register("tax_invoice_number")} />
            </div>
            <div className="space-y-2">
              <Label>{t("fields.date")}</Label>
              <Input type="date" {...form.register("tax_invoice_date")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("fields.linkedInvoice")}</Label>
            <Controller
              control={form.control}
              name="supplier_invoice_id"
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder={tCommon("select_placeholder") || "Select Invoice"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {supplierInvoices.map((inv: any) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} ({inv.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {selectedSI && (
            <div className="bg-muted/30 rounded-md p-3 text-xs flex justify-between border">
              <div>
                <p className="font-semibold text-muted-foreground uppercase">{t("fields.invoiceValue")}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                  <span>DPP:</span> <span className="text-right font-medium">{formatCurrency(selectedSI?.sub_total ?? 0)}</span>
                  <span>VAT:</span> <span className="text-right font-medium text-blue-600">{formatCurrency(selectedSI?.tax_amount ?? 0)}</span>
                </div>
              </div>
              <div className="text-right flex flex-col justify-center">
                <p className="text-[10px] text-muted-foreground italic">Syncing values from Purchase record...</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("fields.dpp")}</Label>
              <Input type="number" step="0.01" {...form.register("dpp_amount", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>{t("fields.vat")}</Label>
              <Input type="number" step="0.01" {...form.register("vat_amount", { valueAsNumber: true })} />
              {selectedSI && Math.abs((selectedSI?.tax_amount ?? 0) - (form.watch("vat_amount") ?? 0)) > 1 && (
                <p className="text-[10px] text-destructive font-medium">{t("fields.discrepancy")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("fields.total")}</Label>
              <Input
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
