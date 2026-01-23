"use client";

import { useForm, useFieldArray, useWatch, useFormContext, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, FileText, DollarSign, Plus, Trash2 } from "lucide-react";
import { ButtonLoading } from "@/components/loading";
import {
  createPaymentPOSchema,
  updatePaymentPOSchema,
  type CreatePaymentPOFormData,
  type UpdatePaymentPOFormData,
} from "../schemas/payment-po.schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
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
import { usePaymentPOAddData } from "../hooks/use-payment-pos";
import { sortOptions } from "@/lib/utils";
import type { PaymentPO } from "../types";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { Control } from "react-hook-form";
import type { ChartOfAccount } from "../types";
import { Calendar as CalendarIcon } from "lucide-react";

interface AllocationRowProps {
  readonly index: number;
  readonly control: Control<CreatePaymentPOFormData | UpdatePaymentPOFormData>;
  readonly chartOfAccounts: ChartOfAccount[];
  readonly onRemove: () => void;
  readonly errors?: {
    chart_of_account_id?: { message?: string };
    amount?: { message?: string };
  };
}

function AllocationRow({ index, control, chartOfAccounts, onRemove, errors }: AllocationRowProps) {
  const t = useTranslations("paymentPO.form");
  const sortedCoas = useMemo(() => sortOptions(chartOfAccounts, (coa) => coa.name), [chartOfAccounts]);
  const { setValue, register, control: formControl } = useFormContext<CreatePaymentPOFormData | UpdatePaymentPOFormData>();
  const chartOfAccountId = useWatch({
    control,
    name: `allocations.${index}.chart_of_account_id`,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
      <Field orientation="vertical">
        <FieldLabel>{t("chartOfAccountLabel")} *</FieldLabel>
        <Select
          value={chartOfAccountId?.toString() || ""}
          onValueChange={(value) =>
            setValue(`allocations.${index}.chart_of_account_id`, parseInt(value), {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("chartOfAccountPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {sortedCoas.map((coa) => (
              <SelectItem key={coa.id} value={coa.id.toString()}>
                {coa.code} - {coa.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.chart_of_account_id && (
          <FieldError>{errors.chart_of_account_id.message}</FieldError>
        )}
      </Field>
      <Field orientation="vertical">
        <FieldLabel>{t("allocationAmountLabel")} *</FieldLabel>
        <Controller
          name={`allocations.${index}.amount`}
          control={control}
          render={({ field }) => (
            <NumericInput
              value={field.value}
              onChange={field.onChange}
              min={0}
              placeholder={t("allocationAmountPlaceholder")}
            />
          )}
        />
        {errors?.amount && <FieldError>{errors.amount.message}</FieldError>}
      </Field>
      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRemove}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t("removeAllocation")}
        </Button>
      </div>
    </div>
  );
}

interface PaymentPOFormProps {
  readonly paymentPO?: PaymentPO;
  readonly onSubmit: (
    data: CreatePaymentPOFormData | UpdatePaymentPOFormData
  ) => Promise<void>;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
}

export function PaymentPOForm({
  paymentPO,
  onSubmit,
  onCancel,
  isLoading,
}: PaymentPOFormProps) {
  const isEdit = !!paymentPO;
  const { data: addData, isLoading: isLoadingAddData } = usePaymentPOAddData();
  const t = useTranslations("paymentPO.form");

  const bankAccounts = useMemo(
    () => sortOptions(addData?.data?.bank_accounts ?? [], (b) => b.name),
    [addData?.data?.bank_accounts]
  );
  const invoices = useMemo(
    () => sortOptions(addData?.data?.invoices ?? [], (i) => i.invoice_number),
    [addData?.data?.invoices]
  );
  const chartOfAccounts = useMemo(
    () => sortOptions(addData?.data?.chart_of_accounts ?? [], (coa) => coa.name),
    [addData?.data?.chart_of_accounts]
  );

  const form = useForm<CreatePaymentPOFormData | UpdatePaymentPOFormData>({
    resolver: zodResolver(isEdit ? updatePaymentPOSchema : createPaymentPOSchema),
    defaultValues: paymentPO
      ? {
          invoice_id: paymentPO.invoice.id,
          bank_account_id: paymentPO.bank_account.id,
          payment_date: paymentPO.payment_date,
          amount: paymentPO.amount,
          method: paymentPO.method,
          notes: paymentPO.notes ?? "",
          allocations: paymentPO.allocations ?? [],
        }
      : {
          method: "BANK",
          notes: "",
          allocations: [],
        },
  });

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "allocations",
  });

  // Watch form values
  const invoiceId = useWatch({ control, name: "invoice_id" });
  const method = useWatch({ control, name: "method" });
  const bankAccountId = useWatch({ control, name: "bank_account_id" });
  const watchedPaymentDate = useWatch({ control, name: "payment_date" });

  // Get selected invoice
  const selectedInvoice = useMemo(() => {
    if (!invoiceId) return null;
    return invoices.find((inv) => inv.id === invoiceId);
  }, [invoiceId, invoices]);

  // Auto-fill amount from selected invoice (only for create)
  useMemo(() => {
    if (!isEdit && selectedInvoice && selectedInvoice.remaining_amount) {
      setValue("amount", selectedInvoice.remaining_amount, { shouldValidate: true });
    }
  }, [selectedInvoice, isEdit, setValue]);

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
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("basicInfo.title")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field orientation="vertical">
            <FieldLabel>{t("invoiceLabel")} *</FieldLabel>
            <Select
              value={invoiceId?.toString() || ""}
              onValueChange={(value) =>
                setValue("invoice_id", parseInt(value), { shouldValidate: true })
              }
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("invoicePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id.toString()}>
                    {invoice.invoice_number}
                    {invoice.purchase_order?.code ? ` (${invoice.purchase_order.code})` : ""}
                    {invoice.remaining_amount
                      ? ` - ${formatCurrency(invoice.remaining_amount)}`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.invoice_id && <FieldError>{errors.invoice_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("paymentDateLabel")} *</FieldLabel>
            <PaymentDatePicker
              value={watchedPaymentDate}
              onChange={(dateString) => {
                setValue("payment_date", dateString || "", { shouldValidate: true });
              }}
              disabled={isLoading}
              placeholder={t("paymentDatePlaceholder")}
            />
            {errors.payment_date && <FieldError>{errors.payment_date.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("methodLabel")} *</FieldLabel>
            <Select
              value={method || ""}
              onValueChange={(value) =>
                setValue("method", value as "CASH" | "BANK", { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("methodPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">{t("methodCash")}</SelectItem>
                <SelectItem value="BANK">{t("methodBank")}</SelectItem>
              </SelectContent>
            </Select>
            {errors.method && <FieldError>{errors.method.message}</FieldError>}
          </Field>

          {method === "BANK" && (
            <Field orientation="vertical">
              <FieldLabel>{t("bankAccountLabel")} *</FieldLabel>
              <Select
                value={bankAccountId?.toString() || ""}
                onValueChange={(value) =>
                  setValue("bank_account_id", parseInt(value), { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("bankAccountPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name} ({account.account_number}) - {account.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bank_account_id && (
                <FieldError>{errors.bank_account_id.message}</FieldError>
              )}
            </Field>
          )}

          <Field orientation="vertical">
            <FieldLabel>{t("amountLabel")} *</FieldLabel>
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <NumericInput
                  value={field.value}
                  onChange={field.onChange}
                  min={0}
                  placeholder={t("amountPlaceholder")}
                />
              )}
            />
            {errors.amount && <FieldError>{errors.amount.message}</FieldError>}
            {selectedInvoice && selectedInvoice.remaining_amount && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("remainingAmount")}: {formatCurrency(selectedInvoice.remaining_amount)}
              </p>
            )}
          </Field>
        </div>
      </div>

      {/* Allocations Section (Optional) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">{t("allocationsInfo.title")}</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ chart_of_account_id: 0, amount: 0 })}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("addAllocation")}
          </Button>
        </div>
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noAllocations")}</p>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <AllocationRow
                key={field.id}
                index={index}
                control={control}
                chartOfAccounts={chartOfAccounts}
                onRemove={() => remove(index)}
                errors={errors.allocations?.[index]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="space-y-4">
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
        <Button type="submit" disabled={isLoading} className="cursor-pointer">
          <ButtonLoading loading={isLoading} loadingText={t("submitting")}>
            {isEdit ? t("submitUpdate") : t("submitCreate")}
          </ButtonLoading>
        </Button>
      </div>
    </form>
    </FormProvider>
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
  return date.toLocaleDateString("en-US", {
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

// Payment date picker component
function PaymentDatePicker({ value, onChange, disabled, placeholder }: DatePickerProps) {
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
