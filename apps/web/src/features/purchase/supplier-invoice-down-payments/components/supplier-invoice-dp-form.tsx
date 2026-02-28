"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ButtonLoading } from "@/components/loading";

import {
  useCreateSupplierInvoiceDP,
  useSupplierInvoiceDP,
  useSupplierInvoiceDPAddData,
  useUpdateSupplierInvoiceDP,
} from "../hooks/use-supplier-invoice-dp";
import {
  supplierInvoiceDPSchema,
  type SupplierInvoiceDPFormData,
} from "../schemas/supplier-invoice-dp.schema";

export function SupplierInvoiceDPFormDialog({
  open,
  onOpenChange,
  invoiceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string;
}) {
  const t = useTranslations("supplierInvoiceDP");
  const isEdit = !!invoiceId;

  const addDataQuery = useSupplierInvoiceDPAddData({ enabled: open });
  const detailQuery = useSupplierInvoiceDP(invoiceId ?? "", { enabled: open && isEdit });

  const createMutation = useCreateSupplierInvoiceDP();
  const updateMutation = useUpdateSupplierInvoiceDP();

  const form = useForm<SupplierInvoiceDPFormData>({
    resolver: zodResolver(supplierInvoiceDPSchema),
    defaultValues: {
      purchase_order_id: "",
      invoice_date: "",
      due_date: "",
      amount: 0,
      notes: null,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (!isEdit) {
      form.reset({ purchase_order_id: "", invoice_date: "", due_date: "", amount: 0, notes: null });
      return;
    }
    const detail = detailQuery.data?.success ? detailQuery.data.data : null;
    if (!detail) return;
    form.reset({
      purchase_order_id: detail.purchase_order?.id ?? "",
      invoice_date: detail.invoice_date,
      due_date: detail.due_date,
      amount: detail.amount,
      notes: detail.notes ?? null,
    });
  }, [open, isEdit, detailQuery.data, form]);

  const isBusy = addDataQuery.isLoading || detailQuery.isLoading || createMutation.isPending || updateMutation.isPending;
  const addData = addDataQuery.data?.success ? addDataQuery.data.data : null;

  async function onSubmit(values: SupplierInvoiceDPFormData) {
    try {
      if (isEdit && invoiceId) {
        const response = await updateMutation.mutateAsync({ id: invoiceId, data: values });
        if (!response.success) throw new Error(response.error ?? "update_failed");
        toast.success(t("toast.updated"));
      } else {
        const response = await createMutation.mutateAsync(values);
        if (!response.success) throw new Error(response.error ?? "create_failed");
        toast.success(t("toast.created"));
      }
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
        </DialogHeader>

        {addDataQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Field orientation="vertical">
            <FieldLabel>{t("fields.purchaseOrder")}</FieldLabel>
            <Controller
              control={form.control}
              name="purchase_order_id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isBusy || isEdit}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder={t("placeholders.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(addData?.purchase_orders ?? []).map((po) => (
                      <SelectItem key={po.id} value={po.id} className="cursor-pointer">
                        {po.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field orientation="vertical">
              <FieldLabel>{t("fields.invoiceDate")}</FieldLabel>
              <Input
                type="date"
                value={form.watch("invoice_date")}
                onChange={(e) => form.setValue("invoice_date", e.target.value, { shouldValidate: true })}
                disabled={isBusy}
              />
            </Field>
            <Field orientation="vertical">
              <FieldLabel>{t("fields.dueDate")}</FieldLabel>
              <Input
                type="date"
                value={form.watch("due_date")}
                onChange={(e) => form.setValue("due_date", e.target.value, { shouldValidate: true })}
                disabled={isBusy}
              />
            </Field>
          </div>

          <Field orientation="vertical">
            <FieldLabel>{t("fields.amount")}</FieldLabel>
            <Controller
              control={form.control}
              name="amount"
              render={({ field }) => (
                <NumericInput value={field.value ?? 0} onChange={field.onChange} disabled={isBusy} />
              )}
            />
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("fields.notes")}</FieldLabel>
            <Textarea
              value={form.watch("notes") ?? ""}
              onChange={(e) => form.setValue("notes", e.target.value, { shouldValidate: true })}
              disabled={isBusy}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy} className="cursor-pointer">
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isBusy} className="cursor-pointer">
              <ButtonLoading loading={isBusy}>
                {t("actions.save")}
              </ButtonLoading>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
