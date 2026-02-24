"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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
      form.reset({
        purchase_order_id: "",
        invoice_date: "",
        due_date: "",
        amount: 0,
        notes: null,
      });
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

  const isBusy =
    addDataQuery.isLoading ||
    detailQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending;

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

  const addData = addDataQuery.data?.success ? addDataQuery.data.data : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
        </DialogHeader>

        {addDataQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>{t("fields.purchaseOrder")}</Label>
            <Select
              value={form.watch("purchase_order_id")}
              onValueChange={(value) => form.setValue("purchase_order_id", value, { shouldValidate: true })}
              disabled={isBusy || isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("placeholders.select")} />
              </SelectTrigger>
              <SelectContent>
                {(addData?.purchase_orders ?? []).map((po) => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("fields.invoiceDate")}</Label>
              <Input
                type="date"
                value={form.watch("invoice_date")}
                onChange={(e) => form.setValue("invoice_date", e.target.value, { shouldValidate: true })}
                disabled={isBusy}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("fields.dueDate")}</Label>
              <Input
                type="date"
                value={form.watch("due_date")}
                onChange={(e) => form.setValue("due_date", e.target.value, { shouldValidate: true })}
                disabled={isBusy}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t("fields.amount")}</Label>
              <Input
                type="number"
                value={form.watch("amount")}
                onChange={(e) => form.setValue("amount", Number(e.target.value), { shouldValidate: true })}
                disabled={isBusy}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t("fields.notes")}</Label>
              <Textarea
                value={form.watch("notes") ?? ""}
                onChange={(e) => form.setValue("notes", e.target.value, { shouldValidate: true })}
                disabled={isBusy}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy} className="cursor-pointer">
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isBusy} className="cursor-pointer">
              {t("actions.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
