"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, FileText, DollarSign } from "lucide-react";
import {
  createSupplierInvoiceSchema,
  updateSupplierInvoiceSchema,
  type CreateSupplierInvoiceFormData,
  type UpdateSupplierInvoiceFormData,
} from "../schemas/supplier-invoice.schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSupplierInvoiceAddData } from "../hooks/use-supplier-invoices";
import type { SupplierInvoice } from "../types";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";

interface SupplierInvoiceFormProps {
  readonly invoice?: SupplierInvoice;
  readonly onSubmit: (
    data: CreateSupplierInvoiceFormData | UpdateSupplierInvoiceFormData
  ) => Promise<void>;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
}

export function SupplierInvoiceForm({
  invoice,
  onSubmit,
  onCancel,
  isLoading,
}: SupplierInvoiceFormProps) {
  const isEdit = !!invoice;
  const { data: addData, isLoading: isLoadingAddData } = useSupplierInvoiceAddData();
  const t = useTranslations("supplierInvoices.form");

  const paymentTerms = useMemo(() => addData?.data?.payment_terms ?? [], [addData?.data?.payment_terms]);
  const purchaseOrders = useMemo(() => addData?.data?.purchase_orders ?? [], [addData?.data?.purchase_orders]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateSupplierInvoiceFormData | UpdateSupplierInvoiceFormData>({
    resolver: zodResolver(isEdit ? updateSupplierInvoiceSchema : createSupplierInvoiceSchema),
    defaultValues: invoice
      ? {
          payment_terms_id: invoice.payment_terms.id,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date,
          tax_rate: invoice.tax_rate,
          delivery_cost: invoice.delivery_cost,
          other_cost: invoice.other_cost,
          notes: invoice.notes ?? "",
          items:
            invoice.items?.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
            })) ?? [],
        }
      : {
          purchase_order_id: 0,
          payment_terms_id: 0,
          invoice_number: "",
          invoice_date: "",
          due_date: "",
          tax_rate: 0,
          delivery_cost: 0,
          other_cost: 0,
          items: [],
        },
  });

  // Get selected purchase order and its items
  const purchaseOrderId = useWatch({ control, name: "purchase_order_id" as any }) as number | undefined;
  const paymentTermsId = useWatch({ control, name: "payment_terms_id" as any }) as number | undefined;
  const selectedPurchaseOrder = useMemo(
    () => purchaseOrders.find((po) => po.id === purchaseOrderId),
    [purchaseOrders, purchaseOrderId]
  );
  const poItems = useMemo(() => selectedPurchaseOrder?.items ?? [], [selectedPurchaseOrder]);

  const watchedItems = useWatch({ control, name: "items" });
  const watchedInvoiceDate = useWatch({ control, name: "invoice_date" });
  const watchedDueDate = useWatch({ control, name: "due_date" });

  // Initialize items from purchase order when PO is selected (create mode only)
  const handlePurchaseOrderChange = (poId: string) => {
    if (isEdit) return; // Don't change items in edit mode
    
    const po = purchaseOrders.find((p) => p.id === parseInt(poId));
    if (po && po.items) {
      const items = po.items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.price,
        discount: 0,
      }));
      setValue("items", items, { shouldValidate: true });
    }
    setValue("purchase_order_id", parseInt(poId), { shouldValidate: true });
  };


  if (isLoadingAddData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">{t("loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("basicInfo.title")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!isEdit && (
            <Field orientation="vertical">
              <FieldLabel>{t("purchaseOrderLabel")} *</FieldLabel>
              <Select
                value={purchaseOrderId?.toString() || ""}
                onValueChange={handlePurchaseOrderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("purchaseOrderPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id.toString()}>
                      {po.code} - {po.supplier?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.purchase_order_id && (
                <FieldError>{errors.purchase_order_id.message}</FieldError>
              )}
            </Field>
          )}

          <Field orientation="vertical">
            <FieldLabel>{t("paymentTermsLabel")} *</FieldLabel>
            <Select
              value={paymentTermsId?.toString() || ""}
              onValueChange={(value) =>
                setValue("payment_terms_id", parseInt(value), { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("paymentTermsPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {paymentTerms.map((term) => (
                  <SelectItem key={term.id} value={term.id.toString()}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.payment_terms_id && (
              <FieldError>{errors.payment_terms_id.message}</FieldError>
            )}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("invoiceNumberLabel")} *</FieldLabel>
            <Input
              {...register("invoice_number")}
              placeholder={t("invoiceNumberPlaceholder")}
            />
            {errors.invoice_number && (
              <FieldError>{errors.invoice_number.message}</FieldError>
            )}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("invoiceDateLabel")} *</FieldLabel>
            <InvoiceDatePicker
              value={watchedInvoiceDate}
              onChange={(dateString) => {
                setValue("invoice_date", dateString || "", { shouldValidate: true });
              }}
              disabled={isLoading}
              placeholder={t("invoiceDatePlaceholder")}
            />
            {errors.invoice_date && (
              <FieldError>{errors.invoice_date.message}</FieldError>
            )}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("dueDateLabel")} *</FieldLabel>
            <DueDatePicker
              value={watchedDueDate}
              onChange={(dateString) => {
                setValue("due_date", dateString || "", { shouldValidate: true });
              }}
              disabled={isLoading}
              placeholder={t("dueDatePlaceholder")}
            />
            {errors.due_date && (
              <FieldError>{errors.due_date.message}</FieldError>
            )}
          </Field>
        </div>
      </div>

      {/* Financial Information Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
          <DollarSign className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("financialInfo.title")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field orientation="vertical">
            <FieldLabel>{t("taxRateLabel")}</FieldLabel>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register("tax_rate", { valueAsNumber: true })}
              placeholder={t("taxRatePlaceholder")}
            />
            {errors.tax_rate && <FieldError>{errors.tax_rate.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("deliveryCostLabel")}</FieldLabel>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register("delivery_cost", { valueAsNumber: true })}
              placeholder={t("deliveryCostPlaceholder")}
            />
            {errors.delivery_cost && (
              <FieldError>{errors.delivery_cost.message}</FieldError>
            )}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("otherCostLabel")}</FieldLabel>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register("other_cost", { valueAsNumber: true })}
              placeholder={t("otherCostPlaceholder")}
            />
            {errors.other_cost && (
              <FieldError>{errors.other_cost.message}</FieldError>
            )}
          </Field>
        </div>

        <Field orientation="vertical">
          <FieldLabel>{t("notesLabel")}</FieldLabel>
          <Textarea {...register("notes")} placeholder={t("notesPlaceholder")} rows={3} />
          {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
        </Field>
      </div>

      {/* Items Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("itemsInfo.title")}</h3>
        </div>

        <div className="space-y-4">
            {watchedItems?.map((item, index) => {
            const poItem = poItems.find((poi) => poi.product.id === item.product_id);
            const product = invoice?.items?.find((i) => i.product_id === item.product_id)?.product || poItem?.product;

            if (!product) {
              // Fallback: try to get from invoice items if available
              const invoiceItem = invoice?.items?.find((i) => i.product_id === item.product_id);
              if (!invoiceItem?.product) return null;
            }
            
            const displayProduct = product || invoice?.items?.find((i) => i.product_id === item.product_id)?.product;
            if (!displayProduct) return null;

            const subtotal = item.quantity * item.price * (1 - item.discount / 100);

            return (
              <div
                key={index}
                className="border rounded-lg p-4 space-y-4 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Item {index + 1}</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field orientation="vertical">
                    <FieldLabel>{t("productLabel")}</FieldLabel>
                    <Input
                      value={`${displayProduct.name} (${displayProduct.code})`}
                      disabled
                      className="bg-muted"
                    />
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("quantityLabel")}</FieldLabel>
                    <Input
                      value={item.quantity}
                      disabled
                      className="bg-muted"
                    />
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("priceLabel")} *</FieldLabel>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`items.${index}.price`, { valueAsNumber: true })}
                      placeholder={t("pricePlaceholder")}
                    />
                    {errors.items?.[index]?.price && (
                      <FieldError>{errors.items[index]?.price?.message}</FieldError>
                    )}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("discountLabel")}</FieldLabel>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...register(`items.${index}.discount`, { valueAsNumber: true })}
                      placeholder={t("discountPlaceholder")}
                    />
                    {errors.items?.[index]?.discount && (
                      <FieldError>{errors.items[index]?.discount?.message}</FieldError>
                    )}
                  </Field>

                  <Field orientation="vertical" className="md:col-span-2">
                    <FieldLabel>{t("subtotalLabel")}</FieldLabel>
                    <Input
                      value={formatCurrency(subtotal)}
                      disabled
                      className="bg-muted font-medium"
                    />
                  </Field>
                </div>
              </div>
            );
          })}
          {errors.items && typeof errors.items === "object" && "message" in errors.items && (
            <FieldError>{errors.items.message}</FieldError>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("submitting")}
            </>
          ) : isEdit ? (
            t("submitUpdate")
          ) : (
            t("submitCreate")
          )}
        </Button>
      </div>
    </form>
  );
}

// Helper function to format date as YYYY-MM-DD
const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper function to format date for display
const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Date picker component props
interface DatePickerProps {
  readonly value?: string;
  readonly onChange: (dateString: string | null) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
}

// Invoice date picker component
function InvoiceDatePicker({ value, onChange, disabled, placeholder }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const date = value ? (() => {
    try {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  })() : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-left font-normal"
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDateForDisplay(date) : <span className="text-muted-foreground">{placeholder || "Select date"}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            if (selectedDate) {
              // Format as YYYY-MM-DD
              const dateString = formatDateToString(selectedDate);
              onChange(dateString);
            } else {
              onChange(null);
            }
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// Due date picker component
function DueDatePicker({ value, onChange, disabled, placeholder }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const date = value ? (() => {
    try {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  })() : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-left font-normal"
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDateForDisplay(date) : <span className="text-muted-foreground">{placeholder || "Select date"}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            if (selectedDate) {
              // Format as YYYY-MM-DD
              const dateString = formatDateToString(selectedDate);
              onChange(dateString);
            } else {
              onChange(null);
            }
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}


