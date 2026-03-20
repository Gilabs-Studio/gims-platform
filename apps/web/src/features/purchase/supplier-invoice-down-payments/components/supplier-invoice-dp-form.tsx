"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { CalendarIcon, DollarSign, FileText, Package, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ButtonLoading } from "@/components/loading";
import { formatCurrency, formatDate } from "@/lib/utils";

import {
  useCreateSupplierInvoiceDP,
  useSupplierInvoiceDP,
  useSupplierInvoiceDPAddData,
  useUpdateSupplierInvoiceDP,
} from "../hooks/use-supplier-invoice-dp";
import { usePurchaseOrder } from "@/features/purchase/orders/hooks/use-purchase-orders";
import {
  supplierInvoiceDPSchema,
  type SupplierInvoiceDPFormData,
} from "../schemas/supplier-invoice-dp.schema";

export function SupplierInvoiceDPFormDialog({
  open,
  onOpenChange,
  invoiceId,
  defaultPurchaseOrderId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string;
  defaultPurchaseOrderId?: string | null;
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

  const poQuery = usePurchaseOrder(defaultPurchaseOrderId ?? "", { enabled: open && !!defaultPurchaseOrderId && !isEdit });

  useEffect(() => {
    if (!open) return;
    if (!isEdit) {
      const initial: SupplierInvoiceDPFormData = {
        purchase_order_id: defaultPurchaseOrderId ?? "",
        invoice_date: "",
        due_date: "",
        amount: 0,
        notes: null,
      };
      // If opened from a PO, try to prefill amount from PO total
      if (defaultPurchaseOrderId) {
        const po = poQuery.data?.success ? poQuery.data.data : null;
        if (po) {
          initial.amount = po.total_amount ?? 0;
        }
      }
      form.reset(initial);
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
  }, [open, isEdit, detailQuery.data, form, defaultPurchaseOrderId, poQuery.data]);

  const isBusy = addDataQuery.isLoading || detailQuery.isLoading || createMutation.isPending || updateMutation.isPending;
  const addData = addDataQuery.data?.success ? addDataQuery.data.data : null;

  const watchedPOId = form.watch("purchase_order_id");
  const selectedPO = useMemo(
    () => addData?.purchase_orders?.find((po) => po.id === watchedPOId) ?? null,
    [addData, watchedPOId],
  );
  const dpAmount = form.watch("amount");

  const invoiceSummary = useMemo(() => {
    if (!selectedPO) return null;
    const orderTotal = selectedPO.total_amount ?? 0;
    const dpApplied = dpAmount ?? 0;
    const remaining = Math.max(0, orderTotal - dpApplied);
    const dpPercentage = orderTotal > 0 ? ((dpApplied / orderTotal) * 100).toFixed(1) : "0.0";
    return { orderTotal, dpApplied, remaining, dpPercentage };
  }, [selectedPO, dpAmount]);

  const [invoiceDateOpen, setInvoiceDateOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);

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
          <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">{t("sections.invoiceInfo") || "Invoice Info"}</h3>
          </div>

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

          {/* PO Detail Card */}
          {selectedPO && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-medium">{t("sections.poDetail")}</h4>
                <Badge variant="outline" className="ml-auto text-xs">
                  {selectedPO.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("fields.supplier")}:</span>
                  <span className="font-medium">{selectedPO.supplier?.name ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("fields.orderDate")}:</span>
                  <span className="font-medium">{selectedPO.order_date ? formatDate(selectedPO.order_date) : "-"}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">{t("fields.totalAmount")}:</span>
                  <span className="font-semibold text-primary">{formatCurrency(selectedPO.total_amount)}</span>
                </div>
              </div>

              {selectedPO.items?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t("fields.items")} ({selectedPO.items.length})</p>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs py-1.5">{t("fields.product")}</TableHead>
                          <TableHead className="text-xs py-1.5 text-right">{t("fields.quantity")}</TableHead>
                          <TableHead className="text-xs py-1.5 text-right">{t("fields.price")}</TableHead>
                          <TableHead className="text-xs py-1.5 text-right">{t("fields.subtotal")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPO.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="py-1.5 text-xs">
                              <div className="flex items-center gap-1.5">
                                <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span>{item.product?.name ?? "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-1.5 text-xs text-right">{item.quantity}</TableCell>
                            <TableCell className="py-1.5 text-xs text-right">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="py-1.5 text-xs text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
            <DollarSign className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">{t("sections.financial") || "Financial"}</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field orientation="vertical">
              <FieldLabel>{t("fields.invoiceDate")}</FieldLabel>
              <Controller
                control={form.control}
                name="invoice_date"
                render={({ field }) => (
                  <Popover open={invoiceDateOpen} onOpenChange={setInvoiceDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isBusy}
                        className="w-full justify-start text-left font-normal cursor-pointer"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? formatDate(field.value) : t("placeholders.pickDate") || "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date: Date | undefined) => {
                          field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                          setInvoiceDateOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </Field>
            <Field orientation="vertical">
              <FieldLabel>{t("fields.dueDate")}</FieldLabel>
              <Controller
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isBusy}
                        className="w-full justify-start text-left font-normal cursor-pointer"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? formatDate(field.value) : t("placeholders.pickDate") || "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date: Date | undefined) => {
                          field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                          setDueDateOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
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

          {invoiceSummary && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                {t("sections.invoiceSummary") || "Invoice Summary"}
              </h4>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("fields.totalAmount") || "Order Total"}</span>
                  <span className="font-medium">{formatCurrency(invoiceSummary.orderTotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-primary">
                  <span>{t("fields.downPayment") || "Down Payment"} ({invoiceSummary.dpPercentage}%)</span>
                  <span className="font-medium">{formatCurrency(invoiceSummary.dpApplied)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-1.5 mt-1.5">
                  <span>{t("fields.amountDue") || "Amount Due"}</span>
                  <span className="text-muted-foreground">{formatCurrency(invoiceSummary.remaining)}</span>
                </div>
              </div>
            </div>
          )}

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
