"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, FileText, DollarSign } from "lucide-react";
import {
  createSupplierInvoiceDownPaymentSchema,
  updateSupplierInvoiceDownPaymentSchema,
  type CreateSupplierInvoiceDownPaymentFormData,
  type UpdateSupplierInvoiceDownPaymentFormData,
} from "../schemas/supplier-invoice-down-payment.schema";
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
import { useSupplierInvoiceDownPaymentAddData } from "../hooks/use-supplier-invoice-down-payments";
import type { SupplierInvoiceDownPayment } from "../types";
import { useMemo, useState } from "react";
import { useWatch } from "react-hook-form";
import { Calendar as CalendarIcon } from "lucide-react";

interface SupplierInvoiceDownPaymentFormProps {
  readonly invoice?: SupplierInvoiceDownPayment;
  readonly onSubmit: (
    data: CreateSupplierInvoiceDownPaymentFormData | UpdateSupplierInvoiceDownPaymentFormData
  ) => Promise<void>;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
}

export function SupplierInvoiceDownPaymentForm({
  invoice,
  onSubmit,
  onCancel,
  isLoading,
}: SupplierInvoiceDownPaymentFormProps) {
  const isEdit = !!invoice;
  const { data: addData, isLoading: isLoadingAddData } = useSupplierInvoiceDownPaymentAddData();
  const t = useTranslations("supplierInvoiceDownPayments.form");

  const purchaseOrders = useMemo(
    () => addData?.data?.purchase_orders ?? [],
    [addData?.data?.purchase_orders]
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateSupplierInvoiceDownPaymentFormData | UpdateSupplierInvoiceDownPaymentFormData>(
    {
      resolver: zodResolver(
        isEdit ? updateSupplierInvoiceDownPaymentSchema : createSupplierInvoiceDownPaymentSchema
      ),
      defaultValues: invoice
        ? {
            purchase_order_id: invoice.purchase_order_id,
            invoice_date: invoice.invoice_date,
            due_date: invoice.due_date,
            amount: invoice.amount,
            notes: invoice.notes ?? "",
          }
        : {
            amount: 0,
            notes: "",
          },
    }
  );

  const purchaseOrderId = useWatch({ control, name: "purchase_order_id" });
  const watchedInvoiceDate = useWatch({ control, name: "invoice_date" });
  const watchedDueDate = useWatch({ control, name: "due_date" });

  // Calculate amount from selected purchase order
  const selectedPurchaseOrder = useMemo(() => {
    if (!purchaseOrderId) return null;
    return purchaseOrders.find((po) => po.id === purchaseOrderId);
  }, [purchaseOrderId, purchaseOrders]);

  // Auto-fill amount when purchase order is selected (only for create)
  useMemo(() => {
    if (!isEdit && selectedPurchaseOrder && selectedPurchaseOrder.total_amount) {
      setValue("amount", selectedPurchaseOrder.total_amount, { shouldValidate: true });
    }
  }, [selectedPurchaseOrder, isEdit, setValue]);

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
          <Field orientation="vertical">
            <FieldLabel>{t("purchaseOrderLabel")} *</FieldLabel>
            <Select
              value={purchaseOrderId?.toString() || ""}
              onValueChange={(value) =>
                setValue("purchase_order_id", parseInt(value), { shouldValidate: true })
              }
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("purchaseOrderPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {purchaseOrders.map((po) => (
                  <SelectItem key={po.id} value={po.id.toString()}>
                    {po.code} {po.supplier?.name ? `- ${po.supplier.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.purchase_order_id && (
              <FieldError>{errors.purchase_order_id.message}</FieldError>
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
            {errors.invoice_date && <FieldError>{errors.invoice_date.message}</FieldError>}
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
            {errors.due_date && <FieldError>{errors.due_date.message}</FieldError>}
          </Field>
        </div>
      </div>

      {/* Financial Information Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
          <DollarSign className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("financialInfo.title")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field orientation="vertical">
            <FieldLabel>{t("amountLabel")} *</FieldLabel>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register("amount", { valueAsNumber: true })}
              placeholder={t("amountPlaceholder")}
            />
            {errors.amount && <FieldError>{errors.amount.message}</FieldError>}
            {selectedPurchaseOrder && selectedPurchaseOrder.total_amount && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("purchaseOrderTotal")}: {selectedPurchaseOrder.total_amount.toLocaleString()}
              </p>
            )}
          </Field>
        </div>

        <Field orientation="vertical">
          <FieldLabel>{t("notesLabel")}</FieldLabel>
          <Textarea {...register("notes")} placeholder={t("notesPlaceholder")} rows={3} />
          {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
        </Field>
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
          onSelect={(selectedDate: Date | undefined) => {
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
          onSelect={(selectedDate: Date | undefined) => {
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




