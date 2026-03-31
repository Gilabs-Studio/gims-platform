"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, FileText, CreditCard, DollarSign, Building2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { formatCurrency, formatDate } from "@/lib/utils";
import { usePaginatedComboboxOptions } from "@/hooks/use-paginated-combobox-options";

import { salesPaymentSchema, type SalesPaymentFormData } from "../schemas/sales-payment.schema";
import { useCreateSalesPayment } from "../hooks/use-sales-payments";
import { useCustomerInvoiceDP } from "@/features/sales/customer-invoice-down-payments/hooks/use-customer-invoice-dp";
import { useInvoice } from "@/features/sales/invoice/hooks/use-invoices";
import { invoiceService } from "@/features/sales/invoice/services/invoice-service";
import { financeBankAccountsService } from "@/features/finance/bank-accounts/services/finance-bank-accounts-service";
import { getFirstFormErrorMessage, getSalesErrorMessage } from "@/features/sales/utils/error-utils";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface SalesPaymentFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly defaultInvoiceId?: string;
  readonly defaultDPId?: string;
}

export function SalesPaymentForm({ open, onClose, defaultInvoiceId, defaultDPId }: SalesPaymentFormProps) {
  const t = useTranslations("salesPayment");

  const isLockedToInvoice = !!defaultInvoiceId;
  const isLockedToDP = !!defaultDPId;

  const createMutation = useCreateSalesPayment();

  // Fetch DP detail when locked to a specific down payment
  const { data: dpDetailResponse, isLoading: isLoadingDP } = useCustomerInvoiceDP(defaultDPId ?? "", {
    enabled: open && isLockedToDP,
  });

  const dpDetail = dpDetailResponse?.data;

  const resolver = useMemo(() => zodResolver(salesPaymentSchema) as Resolver<SalesPaymentFormData>, []);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SalesPaymentFormData>({
    resolver,
    defaultValues: {
      invoice_id: defaultInvoiceId ?? defaultDPId ?? null,
      dp_id: defaultDPId ?? null,
      bank_account_id: null,
      payment_date: todayISO(),
      method: "BANK",
      reference_number: null,
      notes: null,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      invoice_id: defaultInvoiceId ?? defaultDPId ?? null,
      dp_id: defaultDPId ?? null,
      bank_account_id: null,
      payment_date: todayISO(),
      method: "BANK",
      reference_number: null,
      notes: null,
    });
  }, [open, reset, defaultInvoiceId, defaultDPId]);

  const invoiceId = useWatch({ control, name: "invoice_id" });
  const method = useWatch({ control, name: "method" });
  const bankAccountId = useWatch({ control, name: "bank_account_id" });

  const invoicesCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales-payment", "invoice-options"],
    enabled: open && !isLockedToDP,
    lazyLoad: true,
    queryFn: (params) => invoiceService.list(params),
    mapOption: (inv) => ({
      value: inv.id,
      label: `${inv.code}${inv.invoice_number ? ` (${inv.invoice_number})` : ""}`,
    }),
  });

  const bankAccountsCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales-payment", "bank-account-options"],
    enabled: open && method === "BANK",
    lazyLoad: true,
    queryFn: (params) => financeBankAccountsService.list({ ...params, is_active: true }),
    mapOption: (acc) => ({
      value: acc.id,
      label: `${acc.name} - ${acc.account_number}`,
    }),
  });

  const selectedInvoiceDetailQuery = useInvoice(invoiceId ?? "", {
    enabled: open && !isLockedToDP && !!invoiceId,
  });

  const selectedInvoice = useMemo(() => {
    if (!invoiceId || isLockedToDP) return null;
    const detailed = selectedInvoiceDetailQuery.data?.success ? selectedInvoiceDetailQuery.data.data : null;
    if (detailed) return detailed;
    return invoicesCombobox.items.find((inv) => inv.id === invoiceId) ?? null;
  }, [invoiceId, isLockedToDP, selectedInvoiceDetailQuery.data, invoicesCombobox.items]);

  const selectedBankAccount = useMemo(() => {
    if (!bankAccountId) return null;
    return bankAccountsCombobox.items.find((acc) => acc.id === bankAccountId) ?? null;
  }, [bankAccountId, bankAccountsCombobox.items]);

  const computedAmount = useMemo(() => {
    if (isLockedToDP && dpDetail) {
      return dpDetail.remaining_amount ?? dpDetail.amount;
    }
    if (selectedInvoice) {
      return selectedInvoice.remaining_amount ?? selectedInvoice.amount;
    }
    return undefined;
  }, [isLockedToDP, dpDetail, selectedInvoice]);

  // Note: amount is handled by backend; no client-side amount field.

  // Clear bank account when switching to CASH
  const handleMethodChange = useCallback(
    (value: string) => {
      if (value === "CASH") {
        setValue("bank_account_id", null, { shouldValidate: false });
      }
    },
    [setValue],
  );

  const submitting = createMutation.isPending;
  const isFetchingReference = invoicesCombobox.isFetching || selectedInvoiceDetailQuery.isLoading || isLoadingDP;
  const [paymentDateOpen, setPaymentDateOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{t("form.title")}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-6"
          onSubmit={handleSubmit(async (values) => {
            if (computedAmount === undefined) {
              toast.error(t("form.amountRequired") ?? "Amount is required");
              return;
            }
            try {
              const invoiceIdForRequest = values.invoice_id ?? (isLockedToDP ? (dpDetail?.id ?? defaultDPId ?? null) : null);
              await createMutation.mutateAsync({
                invoice_id: invoiceIdForRequest,
                dp_id: values.dp_id ?? null,
                bank_account_id: values.bank_account_id ?? null,
                payment_date: values.payment_date,
                amount: computedAmount,
                method: values.method,
                reference_number: values.reference_number ?? null,
                notes: values.notes ?? null,
              });
              toast.success(t("toast.created"));
              onClose();
            } catch (error) {
              toast.error(getSalesErrorMessage(error, t("toast.failed") ?? "Failed to save payment"));
            }
          }, (formErrors) => {
            toast.error(
              getFirstFormErrorMessage(formErrors) ||
              t("common.validationError") ||
              "Please complete all required fields.",
            );
          })}
        >
          {/* Reference Section — Invoice or Down Payment */}
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">
                {isLockedToDP ? t("fields.downPayment") : t("fields.invoice")}
              </h3>
            </div>

            <div className="mt-4">
              {isLockedToDP ? (
                // Locked to DP: show DP info card
                isFetchingReference ? (
                  <Skeleton className="h-20 w-full" />
                ) : dpDetail ? (
                  <div className="rounded-md border p-3 bg-muted/30">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-sm font-medium">{t("fields.downPayment")}</span>
                      <Badge variant="outline" className="font-mono">{dpDetail.code}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{t("overview.invoiceDate")}</span>
                        <span className="text-xs font-medium">{formatDate(dpDetail.invoice_date)}</span>
                      </div>
                      {dpDetail.due_date ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-muted-foreground">{t("overview.dueDate")}</span>
                          <span className="text-xs font-medium">{formatDate(dpDetail.due_date)}</span>
                        </div>
                      ) : (
                        <div />
                      )}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{t("overview.amount")}</span>
                        <span className="text-xs font-medium">{formatCurrency(dpDetail.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{t("overview.remainingAmount")}</span>
                        <span className="text-xs font-medium text-primary">{formatCurrency(dpDetail.remaining_amount ?? dpDetail.amount)}</span>
                      </div>
                      {dpDetail.sales_order?.code && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-muted-foreground">{t("overview.salesOrder")}</span>
                          <span className="text-xs font-medium font-mono">{dpDetail.sales_order.code}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null
              ) : isLockedToInvoice ? (
                // Locked to Invoice: show invoice info card
                isFetchingReference ? (
                  <Skeleton className="h-20 w-full" />
                ) : selectedInvoice ? (
                  <div className="rounded-md border p-3 bg-muted/30">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-sm font-medium">{t("fields.invoice")}</span>
                      <Badge variant="outline" className="font-mono">
                        {selectedInvoice.code}
                        {selectedInvoice.invoice_number ? ` (${selectedInvoice.invoice_number})` : ""}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{t("overview.invoiceDate")}</span>
                        <span className="text-xs font-medium">{formatDate(selectedInvoice.invoice_date)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{t("overview.dueDate")}</span>
                        <span className="text-xs font-medium">{formatDate(selectedInvoice.due_date)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{t("overview.amount")}</span>
                        <span className="text-xs font-medium">{formatCurrency(selectedInvoice.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{t("overview.remainingAmount")}</span>
                        <span className="text-xs font-medium text-primary">
                          {formatCurrency(selectedInvoice.remaining_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null
              ) : (
                // Free selection: invoice dropdown
                <>
                  <Field>
                    <FieldLabel>{t("fields.invoice")}</FieldLabel>
                    <Controller
                      control={control}
                      name="invoice_id"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(v) => field.onChange(v)}
                          onOpenChange={invoicesCombobox.onOpenChange}
                          onSearchChange={invoicesCombobox.onSearchChange}
                          searchDebounceMs={300}
                          disabled={invoicesCombobox.isLoading || submitting}
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder={t("placeholders.select")} />
                          </SelectTrigger>
                          <SelectContent
                            onLoadMore={invoicesCombobox.onLoadMore}
                            hasMore={invoicesCombobox.hasMore}
                            isLoadingMore={invoicesCombobox.isLoadingMore}
                          >
                            {invoicesCombobox.items.map((inv) => (
                              <SelectItem key={inv.id} value={inv.id} className="cursor-pointer">
                                <div className="flex items-center justify-between w-(--radix-select-trigger-width)">
                                  <span>
                                    {inv.code}
                                    {inv.invoice_number ? ` (${inv.invoice_number})` : ""}
                                  </span>
                                  <span className="text-muted-foreground ml-4">
                                    {formatCurrency(inv.remaining_amount)}
                                    {inv.status === "partial" ? " (Partial)" : ""}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.invoice_id?.message ? (
                      <FieldError>{String(errors.invoice_id.message)}</FieldError>
                    ) : null}
                  </Field>

                  {selectedInvoice ? (
                    <div className="mt-4">
                      <div className="rounded-md border p-3 bg-muted/30">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="text-sm font-medium">{t("fields.invoice")}</span>
                          <Badge variant="outline" className="font-mono">
                            {selectedInvoice.code}
                            {selectedInvoice.invoice_number ? ` (${selectedInvoice.invoice_number})` : ""}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">{t("overview.invoiceDate")}</span>
                            <span className="text-xs font-medium">{formatDate(selectedInvoice.invoice_date)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">{t("overview.dueDate")}</span>
                            <span className="text-xs font-medium">{formatDate(selectedInvoice.due_date)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">{t("overview.amount")}</span>
                            <span className="text-xs font-medium">{formatCurrency(selectedInvoice.amount)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground">{t("overview.remainingAmount")}</span>
                            <span className="text-xs font-medium text-primary">{formatCurrency(selectedInvoice.remaining_amount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* Payment Method + Bank Account */}
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
              <CreditCard className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("fields.paymentDetails")}</h3>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel>{t("fields.method")}</FieldLabel>
                <Controller
                  control={control}
                  name="method"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        handleMethodChange(v);
                      }}
                      disabled={submitting}
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("placeholders.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BANK" className="cursor-pointer">
                          {t("method.bank")}
                        </SelectItem>
                        <SelectItem value="CASH" className="cursor-pointer">
                          {t("method.cash")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.method?.message ? <FieldError>{String(errors.method.message)}</FieldError> : null}
              </Field>

              <Field>
                <FieldLabel>{t("fields.paymentDate")}</FieldLabel>
                <Controller
                  control={control}
                  name="payment_date"
                  render={({ field }) => (
                    <Popover open={paymentDateOpen} onOpenChange={setPaymentDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={submitting}
                          className="w-full justify-start text-left font-normal cursor-pointer"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? formatDate(field.value) : t("placeholders.pickDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date: Date | undefined) => {
                            field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                            setPaymentDateOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.payment_date?.message ? (
                  <FieldError>{String(errors.payment_date.message)}</FieldError>
                ) : null}
              </Field>

              {method === "BANK" ? (
                <>
                  <Field className="sm:col-span-2">
                    <FieldLabel>{t("fields.bankAccount")}</FieldLabel>
                    {!selectedBankAccount ? (
                      <Controller
                        control={control}
                        name="bank_account_id"
                        render={({ field }) => (
                          <Select
                            value={field.value ?? ""}
                            onValueChange={(v) => field.onChange(v)}
                            onOpenChange={bankAccountsCombobox.onOpenChange}
                            onSearchChange={bankAccountsCombobox.onSearchChange}
                            searchDebounceMs={300}
                            disabled={bankAccountsCombobox.isLoading || submitting}
                          >
                            <SelectTrigger className="cursor-pointer transition-all duration-200">
                              <SelectValue placeholder={t("placeholders.select")} />
                            </SelectTrigger>
                            <SelectContent
                              onLoadMore={bankAccountsCombobox.onLoadMore}
                              hasMore={bankAccountsCombobox.hasMore}
                              isLoadingMore={bankAccountsCombobox.isLoadingMore}
                            >
                              {bankAccountsCombobox.items.map((acc) => (
                                <SelectItem key={acc.id} value={acc.id} className="cursor-pointer">
                                  <div className="flex flex-col">
                                    <span>{acc.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {acc.account_number} · {acc.account_holder}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    ) : (
                      <div className="rounded-md border p-3 bg-muted/30 animate-in fade-in-0 zoom-in-95 duration-200">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{selectedBankAccount.name}</span>
                            {selectedBankAccount.currency && (
                              <Badge variant="outline" className="text-xs py-0">
                                {selectedBankAccount.currency}
                              </Badge>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 cursor-pointer"
                            disabled={submitting}
                            onClick={() => setValue("bank_account_id", null, { shouldValidate: true })}
                          >
                            {t("actions.change")}
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedBankAccount.account_number} · {selectedBankAccount.account_holder}
                        </div>
                      </div>
                    )}
                    {errors.bank_account_id?.message ? (
                      <FieldError>{String(errors.bank_account_id.message)}</FieldError>
                    ) : null}
                  </Field>

                  <Field className="sm:col-span-2">
                    <FieldLabel>{t("fields.referenceNumber")}</FieldLabel>
                    <Input {...register("reference_number")} disabled={submitting} />
                  </Field>
                </>
              ) : null}
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
              <DollarSign className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("fields.amount")}</h3>
            </div>

            <div className="mt-4">
              <Field>
                <FieldLabel>{t("fields.amount")}</FieldLabel>
                <p className="text-sm text-muted-foreground">{t("form.amountHandledBySystem")}</p>
              </Field>
            </div>
          </div>

          {/* Notes */}
          <Field>
            <FieldLabel>{t("fields.notes")}</FieldLabel>
            <Textarea rows={3} {...register("notes")} disabled={submitting} />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer" disabled={submitting}>
              {t("form.cancel")}
            </Button>
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={submitting || isFetchingReference || bankAccountsCombobox.isLoading || bankAccountsCombobox.isFetching}
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t("form.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

