"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { CalendarIcon, FileText, ShoppingCart, DollarSign, Paperclip, X, Upload } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { getFirstFormErrorMessage, getSalesErrorMessage } from "@/features/sales/utils/error-utils";
import { usePaginatedComboboxOptions } from "@/hooks/use-paginated-combobox-options";
import { useOrder } from "@/features/sales/order/hooks/use-orders";
import { orderService } from "@/features/sales/order/services/order-service";

import {
  useCreateCustomerInvoiceDP,
  useCustomerInvoiceDP,
  useCustomerInvoiceDPs,
  useUpdateCustomerInvoiceDP,
} from "../hooks/use-customer-invoice-dp";
import { customerInvoiceDPService } from "../services/customer-invoice-dp-service";
import {
  getCustomerInvoiceDPSchema,
  type CustomerInvoiceDPFormData,
} from "../schemas/customer-invoice-dp.schema";

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function CustomerInvoiceDPFormDialog({
  open,
  onOpenChange,
  invoiceId,
  defaultSalesOrderId,
  defaultSalesOrderLabel,
  defaultAmount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string;
  defaultSalesOrderId?: string;
  defaultSalesOrderLabel?: string;
  defaultAmount?: number;
}) {
  const t = useTranslations("customerInvoiceDP");

  const isEdit = !!invoiceId;
  const detailQuery = useCustomerInvoiceDP(invoiceId ?? "", { enabled: open && isEdit });

  const createMutation = useCreateCustomerInvoiceDP();
  const updateMutation = useUpdateCustomerInvoiceDP();

  const [attachments, setAttachments] = useState<File[]>([]);

  const form = useForm<CustomerInvoiceDPFormData>({
    resolver: zodResolver(getCustomerInvoiceDPSchema(t)),
    defaultValues: {
      sales_order_id: "",
      invoice_date: "",
      due_date: "",
      amount: 0,
      attachment_url: null,
      notes: null,
    },
  });

  const invoiceDate = useWatch({ control: form.control, name: "invoice_date" });
  const dueDate = useWatch({ control: form.control, name: "due_date" });
  const amount = useWatch({ control: form.control, name: "amount" });
  const notes = useWatch({ control: form.control, name: "notes" });

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => setAttachments([]));
      return;
    }

    if (!isEdit) {
      form.reset({
        sales_order_id: defaultSalesOrderId ?? "",
        invoice_date: format(new Date(), "yyyy-MM-dd"),
        due_date: "",
        amount: defaultAmount ?? 0,
        attachment_url: null,
        notes: null,
      });
      return;
    }

    const detail = detailQuery.data?.success ? detailQuery.data.data : null;
    if (!detail) return;

    form.reset({
      sales_order_id: detail.sales_order?.id ?? "",
      invoice_date: detail.invoice_date,
      due_date: detail.due_date ?? "",
      amount: detail.amount,
      attachment_url: detail.attachment_url ?? null,
      notes: detail.notes ?? null,
    });
  }, [open, isEdit, detailQuery.data, form, defaultSalesOrderId, defaultAmount]);

  const selectedSOId = useWatch({ control: form.control, name: "sales_order_id" });
  const selectedSOQuery = useOrder(selectedSOId ?? "", {
    enabled: open && !!selectedSOId,
  });

  // Fetch existing DP invoices for the selected SO to compute available amount
  const dpInvoicesQuery = useCustomerInvoiceDPs(
    selectedSOId ? { sales_order_id: selectedSOId, limit: 1000 } : undefined,
    { enabled: open && !!selectedSOId },
  );

  const selectedSO = selectedSOQuery.data?.success ? selectedSOQuery.data.data : null;
  const pinnedSalesOrderOption = useMemo(() => {
    if (selectedSO) {
      return {
        value: selectedSO.id,
        label: `${selectedSO.code} - ${formatCurrency(selectedSO.total_amount ?? 0)}`,
      };
    }

    if (defaultSalesOrderId && defaultSalesOrderLabel) {
      return {
        value: defaultSalesOrderId,
        label: defaultSalesOrderLabel,
      };
    }

    return undefined;
  }, [selectedSO, defaultSalesOrderId, defaultSalesOrderLabel]);

  const salesOrderOptions = usePaginatedComboboxOptions({
    queryKey: ["customer-invoice-dp", "sales-order-options"],
    enabled: open,
    lazyLoad: true,
    queryFn: (params) => orderService.list(params),
    baseParams: {
      status: "approved",
      exclude_with_active_cidp: true,
      exclude_with_paid_ci: true,
    },
    mapOption: (order) => ({
      value: order.id,
      label: `${order.code} - ${formatCurrency(order.total_amount ?? 0)}`,
    }),
    pinnedOptions: pinnedSalesOrderOption ? [pinnedSalesOrderOption] : undefined,
  });

  const dpAmount = useWatch({ control: form.control, name: "amount" });

  // Invoice summary computations
  const invoiceSummary = useMemo(() => {
    if (!selectedSO) return null;
    const orderTotal = selectedSO.total_amount ?? 0;
    
    // Compute regular invoices amount
    const regularInvoiced =
      (selectedSO.customer_invoices ?? [])
        .filter((inv) => {
          const status = (inv.status ?? "").toLowerCase();
          return status !== "cancelled" && status !== "rejected";
        })
        .reduce((sum, inv) => sum + (inv.amount ?? 0), 0) ?? 0;
    
    // Compute DP invoices amount
    const dpInvoiced =
      (dpInvoicesQuery.data?.data ?? [])
        .filter((dp) => {
          const status = (dp.status ?? "").toLowerCase();
          return status !== "cancelled" && status !== "rejected";
        })
        .reduce((sum, dp) => sum + (dp.amount ?? 0), 0) ?? 0;
    
    // Total already invoiced (regular + DP, excluding edit item if in edit mode)
    const totalInvoiced = isEdit ? regularInvoiced + (dpInvoiced - (dpAmount ?? 0)) : regularInvoiced + dpInvoiced;
    const availableAmount = Math.max(0, orderTotal - totalInvoiced);
    const dpPercentage = orderTotal > 0 ? ((dpAmount ?? 0) / orderTotal * 100).toFixed(1) : "0.0";
    const availablePercentage = orderTotal > 0 ? (availableAmount / orderTotal * 100).toFixed(1) : "0.0";
    
    return {
      orderTotal,
      regularInvoiced,
      dpInvoiced,
      totalInvoiced,
      availableAmount,
      dpPercentage,
      availablePercentage,
    };
  }, [selectedSO, dpAmount, dpInvoicesQuery.data, isEdit]);

  const handleFileAdd = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const validFiles = files.filter((file) => {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type. Allowed: JPG, PNG, PDF`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File too large. Max 10MB`);
        return false;
      }
      return true;
    });
    setAttachments((prev) => [...prev, ...validFiles]);
    // Reset file input
    e.target.value = "";
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const isBusy =
    detailQuery.isLoading ||
    dpInvoicesQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending;

  async function onSubmit(values: CustomerInvoiceDPFormData) {
    try {
      // Validate amount does not exceed SO total
      if (selectedSO && values.amount > (selectedSO.total_amount ?? 0)) {
        form.setError("amount", {
          message: `Amount cannot exceed SO total (${formatCurrency(selectedSO.total_amount ?? 0)})`,
        });
        return;
      }

      // Validate amount does not exceed available amount (total - already invoiced)
      if (invoiceSummary && values.amount > invoiceSummary.availableAmount) {
        form.setError("amount", {
          message: `Amount cannot exceed available amount (${formatCurrency(invoiceSummary.availableAmount)})`,
        });
        return;
      }

      let attachmentUrl = values.attachment_url ?? null;
      if (attachments.length > 0) {
        const uploadResult = await customerInvoiceDPService.uploadAttachment(attachments[0]);
        const uploadedUrl = uploadResult.data?.url;
        if (!uploadedUrl) {
          toast.error(t("toast.uploadFailed") || "Attachment upload failed. Please try again.");
          return;
        }
        attachmentUrl = uploadedUrl;
      }

      const payload: CustomerInvoiceDPFormData = {
        ...values,
        attachment_url: attachmentUrl,
      };

      if (isEdit && invoiceId) {
        const response = await updateMutation.mutateAsync({ id: invoiceId, data: payload });
        if (!response.success) throw new Error(response.error ?? "update_failed");
        toast.success(t("toast.updated"));
      } else {
        const response = await createMutation.mutateAsync(payload);
        if (!response.success) throw new Error(response.error ?? "create_failed");
        toast.success(t("toast.created"));
      }

      onOpenChange(false);
    } catch (error) {
      toast.error(getSalesErrorMessage(error, t("toast.failed")));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
        </DialogHeader>

        {salesOrderOptions.isLoading ? <Skeleton className="h-40 w-full" /> : null}

        <form
          className="space-y-6"
          onSubmit={form.handleSubmit(onSubmit, (formErrors) => {
            toast.error(
              getFirstFormErrorMessage(formErrors) ||
              t("common.validationError") ||
              "Please complete all required fields.",
            );
          })}
        >
          {/* Invoice Info Section */}
          <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">{t("form.sections.invoiceInfo")}</h3>
          </div>

          <Field orientation="vertical">
            <FieldLabel>{t("fields.salesOrder")}</FieldLabel>
            <Select
              value={selectedSOId ?? ""}
              onValueChange={(value) => form.setValue("sales_order_id", value, { shouldValidate: true })}
              onOpenChange={salesOrderOptions.onOpenChange}
              onSearchChange={salesOrderOptions.onSearchChange}
              searchDebounceMs={300}
              disabled={isBusy || isEdit}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t("placeholders.select")} />
              </SelectTrigger>
              <SelectContent
                onLoadMore={salesOrderOptions.onLoadMore}
                hasMore={salesOrderOptions.hasMore}
                isLoadingMore={salesOrderOptions.isLoadingMore}
              >
                {salesOrderOptions.options.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.sales_order_id?.message ? (
              <FieldError>{String(form.formState.errors.sales_order_id.message)}</FieldError>
            ) : null}
          </Field>

          {/* Sales Order Detail Card */}
          {selectedSO && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{t("form.salesOrderDetail")}</span>
                </div>
                <Badge variant="outline" className="text-xs font-mono uppercase">
                  {selectedSO.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {selectedSO.customer && (
                  <>
                    <span className="text-muted-foreground">{t("columns.customer")}</span>
                    <span className="font-medium">{selectedSO.customer.name}</span>
                  </>
                )}
                <span className="text-muted-foreground">{t("detail.orderDate") ?? "Order Date"}</span>
                <span>{selectedSO.order_date ? format(new Date(selectedSO.order_date), "dd MMM yyyy") : "-"}</span>
                <span className="text-muted-foreground">{t("detail.totalAmount") ?? "Total"}</span>
                <span className="font-semibold text-primary">{formatCurrency(selectedSO.total_amount ?? 0)}</span>
              </div>

              {selectedSO.items && selectedSO.items.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Items ({selectedSO.items.length})
                  </p>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs h-8">{t("detail.product") ?? "Product"}</TableHead>
                          <TableHead className="text-xs h-8 text-right">{t("detail.qty") ?? "Qty"}</TableHead>
                          <TableHead className="text-xs h-8 text-right">{t("detail.price") ?? "Price"}</TableHead>
                          <TableHead className="text-xs h-8 text-right">{t("detail.subtotal") ?? "Subtotal"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSO.items.map((item) => (
                            <TableRow key={item.id} className="text-xs">
                            <TableCell className="py-1.5">
                              {item.product?.name ?? item.product?.code ?? item.product?.id ?? "-"}
                            </TableCell>
                            <TableCell className="py-1.5 text-right">{item.quantity}</TableCell>
                            <TableCell className="py-1.5 text-right">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="py-1.5 text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Financial Section */}
          <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
            <DollarSign className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">{t("form.sections.financial")}</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field orientation="vertical">
              <FieldLabel>{t("fields.invoiceDate")}</FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBusy}
                    className={cn(
                      "w-full justify-start text-left font-normal cursor-pointer",
                      !invoiceDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                      {invoiceDate
                        ? format(new Date(invoiceDate), "dd MMM yyyy")
                      : t("placeholders.pickDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                      selected={invoiceDate ? new Date(invoiceDate) : undefined}
                    onSelect={(date: Date | undefined) =>
                      form.setValue("invoice_date", date ? format(date, "yyyy-MM-dd") : "", { shouldValidate: true })
                    }
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.invoice_date?.message ? (
                <FieldError>{String(form.formState.errors.invoice_date.message)}</FieldError>
              ) : null}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("fields.dueDate")}</FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBusy}
                    className={cn(
                      "w-full justify-start text-left font-normal cursor-pointer",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate
                        ? format(new Date(dueDate), "dd MMM yyyy")
                      : t("placeholders.pickDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                      selected={dueDate ? new Date(dueDate) : undefined}
                    onSelect={(date: Date | undefined) =>
                      form.setValue("due_date", date ? format(date, "yyyy-MM-dd") : "", { shouldValidate: true })
                    }
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.due_date?.message ? (
                <FieldError>{String(form.formState.errors.due_date.message)}</FieldError>
              ) : null}
            </Field>

            <Field orientation="vertical" className="col-span-2">
              <FieldLabel>{t("fields.amount")}</FieldLabel>
              <NumericInput
                value={amount}
                onChange={(value) => form.setValue("amount", value ?? 0, { shouldValidate: true })}
                disabled={isBusy}
              />
              {form.formState.errors.amount?.message ? (
                <FieldError>{String(form.formState.errors.amount.message)}</FieldError>
              ) : null}
            </Field>
          </div>

          {/* Invoice Summary */}
          {invoiceSummary && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Invoice Summary
              </h4>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Total</span>
                  <span className="font-medium">{formatCurrency(invoiceSummary.orderTotal)}</span>
                </div>
                {invoiceSummary.regularInvoiced > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Regular Invoices</span>
                    <span>{formatCurrency(invoiceSummary.regularInvoiced)}</span>
                  </div>
                )}
                {invoiceSummary.dpInvoiced > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>DP Invoices</span>
                    <span>{formatCurrency(invoiceSummary.dpInvoiced)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-primary border-t pt-1.5 mt-1.5">
                  <span>This Down Payment ({invoiceSummary.dpPercentage}%)</span>
                  <span className="font-medium">{formatCurrency(dpAmount ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-1.5 mt-1.5">
                  <span>Available for Invoice</span>
                  <span
                    className={invoiceSummary.availableAmount <= 0 ? "text-destructive" : "text-muted-foreground"}
                  >
                    {formatCurrency(invoiceSummary.availableAmount)}
                  </span>
                </div>
              </div>
              {invoiceSummary.availableAmount <= 0 && (
                <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  This sales order is fully invoiced. No additional invoices can be created.
                </div>
              )}
              {dpAmount > invoiceSummary.availableAmount && (
                <div className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
                  DP amount exceeds available invoice amount by {formatCurrency(dpAmount - invoiceSummary.availableAmount)}
                </div>
              )}
            </div>
          )}

          {/* Attachments Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
              <Paperclip className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">Attachments</h3>
              <span className="text-xs text-muted-foreground">(Optional)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload transfer receipt, payment slip, or contract. Allowed: JPG, PNG, PDF (max 10MB each)
            </p>

            <div className="space-y-2">
              {/* Show existing attachment in edit mode when no new file is selected */}
              {isEdit && form.watch("attachment_url") && attachments.length === 0 ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded border bg-muted/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <a
                      href={form.watch("attachment_url") ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm truncate text-primary hover:underline"
                    >
                      {form.watch("attachment_url")?.split("/").pop() ?? "attachment"}
                    </a>
                    <span className="text-xs text-muted-foreground shrink-0">(existing)</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 cursor-pointer text-destructive hover:text-destructive"
                    onClick={() => form.setValue("attachment_url", null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}

              {attachments.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-2 px-3 py-2 rounded border bg-muted/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 cursor-pointer text-destructive hover:text-destructive"
                    onClick={() => removeAttachment(idx)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              <label className="flex items-center justify-center gap-2 px-3 py-3 rounded border border-dashed cursor-pointer hover:bg-muted/30 transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Add attachment</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.pdf"
                  multiple
                  onChange={handleFileAdd}
                />
              </label>
            </div>
          </div>

          {/* Notes */}
          <Field orientation="vertical">
            <FieldLabel>{t("fields.notes")}</FieldLabel>
            <Textarea
              value={notes ?? ""}
              onChange={(e) => form.setValue("notes", e.target.value, { shouldValidate: true })}
              disabled={isBusy}
              rows={3}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t">
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
