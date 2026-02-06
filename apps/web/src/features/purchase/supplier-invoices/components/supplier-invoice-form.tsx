"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

import {
  useCreateSupplierInvoice,
  useSupplierInvoice,
  useSupplierInvoiceAddData,
  useUpdateSupplierInvoice,
} from "../hooks/use-supplier-invoices";
import {
  supplierInvoiceSchema,
  type SupplierInvoiceFormData,
} from "../schemas/supplier-invoice.schema";

export function SupplierInvoiceFormDialog({
  open,
  onOpenChange,
  invoiceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string;
}) {
  const t = useTranslations("supplierInvoice");

  const isEdit = !!invoiceId;

  const addDataQuery = useSupplierInvoiceAddData({ enabled: open });
  const detailQuery = useSupplierInvoice(invoiceId ?? "", { enabled: open && isEdit });

  const refetchAddData = addDataQuery.refetch;

  useEffect(() => {
    if (!open) return;
    void refetchAddData();
  }, [open, refetchAddData]);

  const createMutation = useCreateSupplierInvoice();
  const updateMutation = useUpdateSupplierInvoice();

  const form = useForm<SupplierInvoiceFormData>({
    resolver: zodResolver(supplierInvoiceSchema),
    defaultValues: {
      purchase_order_id: "",
      payment_terms_id: "",
      invoice_number: "",
      invoice_date: "",
      due_date: "",
      tax_rate: 0,
      delivery_cost: 0,
      other_cost: 0,
      notes: null,
      items: [],
    },
  });

  const addData = addDataQuery.data?.success ? addDataQuery.data.data : null;

  const selectedPOId = form.watch("purchase_order_id");
  const setFormValue = form.setValue;

  const selectedPO = useMemo(() => {
    if (!addData?.purchase_orders?.length || !selectedPOId) return null;
    return addData.purchase_orders.find((po) => po.id === selectedPOId) ?? null;
  }, [addData?.purchase_orders, selectedPOId]);

  useEffect(() => {
    if (!open) return;

    if (!isEdit) {
      form.reset({
        purchase_order_id: "",
        payment_terms_id: "",
        invoice_number: "",
        invoice_date: "",
        due_date: "",
        tax_rate: 0,
        delivery_cost: 0,
        other_cost: 0,
        notes: null,
        items: [],
      });
      return;
    }

    const detail = detailQuery.data?.success ? detailQuery.data.data : null;
    if (!detail) return;

    form.reset({
      purchase_order_id: detail.purchase_order?.id ?? "",
      payment_terms_id: detail.payment_terms?.id ?? "",
      invoice_number: detail.invoice_number,
      invoice_date: detail.invoice_date,
      due_date: detail.due_date,
      tax_rate: detail.tax_rate,
      delivery_cost: detail.delivery_cost,
      other_cost: detail.other_cost,
      notes: detail.notes ?? null,
      items: detail.items.map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        price: it.price,
        discount: it.discount,
      })),
    });
  }, [open, isEdit, detailQuery.data, form]);

  useEffect(() => {
    if (!open) return;
    if (isEdit) return;

    if (!selectedPO) return;

    setFormValue(
      "items",
      selectedPO.items.map((it) => ({
        product_id: it.product?.id ?? "",
        quantity: it.quantity,
        price: it.price,
        discount: 0,
      })),
      { shouldValidate: true },
    );
  }, [open, isEdit, selectedPO, setFormValue]);

  const isBusy =
    addDataQuery.isLoading ||
    detailQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending;

  async function onSubmit(values: SupplierInvoiceFormData) {
    const cleaned = {
      ...values,
      items: values.items.filter((it) => it.product_id.length > 0),
    };

    try {
      if (isEdit && invoiceId) {
        const response = await updateMutation.mutateAsync({ id: invoiceId, data: cleaned });
        if (!response.success) throw new Error(response.error ?? "update_failed");
        toast.success(t("toast.updated"));
      } else {
        const response = await createMutation.mutateAsync(cleaned);
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
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("form.editTitle") : t("form.createTitle")}
          </DialogTitle>
        </DialogHeader>

        {addDataQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("fields.purchaseOrder")}</Label>
                <Select
                  value={selectedPOId}
                  onValueChange={(value) =>
                    setFormValue("purchase_order_id", value, { shouldValidate: true })
                  }
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
              </div>

              <div className="space-y-2">
                <Label>{t("fields.paymentTerms")}</Label>
                <Select
                  value={form.watch("payment_terms_id")}
                  onValueChange={(value) => form.setValue("payment_terms_id", value, { shouldValidate: true })}
                  disabled={isBusy}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder={t("placeholders.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(addData?.payment_terms ?? []).map((pt) => (
                      <SelectItem key={pt.id} value={pt.id} className="cursor-pointer">
                        {pt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("fields.invoiceNumber")}</Label>
                <Input
                  value={form.watch("invoice_number")}
                  onChange={(e) => form.setValue("invoice_number", e.target.value, { shouldValidate: true })}
                  disabled={isBusy}
                />
              </div>

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

              <div className="space-y-2">
                <Label>{t("fields.taxRate")}</Label>
                <Input
                  type="number"
                  value={form.watch("tax_rate")}
                  onChange={(e) => form.setValue("tax_rate", Number(e.target.value), { shouldValidate: true })}
                  disabled={isBusy}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("fields.deliveryCost")}</Label>
                <Input
                  type="number"
                  value={form.watch("delivery_cost")}
                  onChange={(e) => form.setValue("delivery_cost", Number(e.target.value), { shouldValidate: true })}
                  disabled={isBusy}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("fields.otherCost")}</Label>
                <Input
                  type="number"
                  value={form.watch("other_cost")}
                  onChange={(e) => form.setValue("other_cost", Number(e.target.value), { shouldValidate: true })}
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

            <div className="space-y-2">
              <div className="font-medium">{t("items.title")}</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("items.fields.product")}</TableHead>
                    <TableHead className="text-right">{t("items.fields.quantity")}</TableHead>
                    <TableHead className="text-right">{t("items.fields.price")}</TableHead>
                    <TableHead className="text-right">{t("items.fields.discount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.watch("items").map((row, idx) => (
                    <TableRow key={`${row.product_id}-${idx}`}>
                      <TableCell className="max-w-[240px] truncate">{row.product_id}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="h-8 text-right"
                          value={row.quantity}
                          onChange={(e) => {
                            const items = form.getValues("items");
                            items[idx] = { ...items[idx], quantity: Number(e.target.value) };
                            form.setValue("items", items, { shouldValidate: true });
                          }}
                          disabled={isBusy}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="h-8 text-right"
                          value={row.price}
                          onChange={(e) => {
                            const items = form.getValues("items");
                            items[idx] = { ...items[idx], price: Number(e.target.value) };
                            form.setValue("items", items, { shouldValidate: true });
                          }}
                          disabled={isBusy}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="h-8 text-right"
                          value={row.discount ?? 0}
                          onChange={(e) => {
                            const items = form.getValues("items");
                            items[idx] = { ...items[idx], discount: Number(e.target.value) };
                            form.setValue("items", items, { shouldValidate: true });
                          }}
                          disabled={isBusy}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isBusy}
                className="cursor-pointer"
              >
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
