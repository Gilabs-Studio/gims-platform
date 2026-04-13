"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { NumericInput } from "@/components/ui/numeric-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { formatCurrency, formatDate } from "@/lib/utils";
import { usePaginatedComboboxOptions } from "@/hooks/use-paginated-combobox-options";

import { purchasePaymentSchema } from "../schemas/purchase-payment.schema";
import { useCreatePurchasePayment } from "../hooks/use-purchase-payments";
import { useSupplierInvoiceDP } from "@/features/purchase/supplier-invoice-down-payments/hooks/use-supplier-invoice-dp";
import { useSupplierInvoice } from "@/features/purchase/supplier-invoices/hooks/use-supplier-invoices";
import { supplierInvoicesService } from "@/features/purchase/supplier-invoices/services/supplier-invoices-service";
import { financeBankAccountsService } from "@/features/finance/bank-accounts/services/finance-bank-accounts-service";
import { getPurchaseErrorMessage } from "@/features/purchase/utils/error-utils";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface PurchasePaymentFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly defaultInvoiceId?: string;
  readonly defaultDPId?: string;
}

type PurchasePaymentFormValues = {
  invoice_id?: string | null;
  dp_id?: string | null;
  bank_account_id?: string | null;
  payment_date: string;
  amount?: number;
  method: "BANK" | "CASH";
  reference_number?: string | null;
  notes?: string | null;
};

const PAYABLE_INVOICE_STATUSES = new Set(["APPROVED", "UNPAID", "PARTIAL", "WAITING_PAYMENT"]);

function isPayableInvoiceStatus(status?: string | null): boolean {
  if (!status) return false;
  const normalized = status.trim().toUpperCase();
  if (normalized === "PAID") return false;
  return PAYABLE_INVOICE_STATUSES.has(normalized);
}

export function PurchasePaymentForm({ open, onClose, defaultInvoiceId, defaultDPId }: PurchasePaymentFormProps) {
  const t = useTranslations("purchasePayment");

  const isLockedToInvoice = !!defaultInvoiceId;
  const isLockedToDP = !!defaultDPId;

  const createMutation = useCreatePurchasePayment();

  // Fetch DP detail when locked to a specific down payment (supplier DP)
  const { data: dpDetailResponse, isLoading: isLoadingDP } = useSupplierInvoiceDP(defaultDPId ?? "", {
    enabled: open && isLockedToDP,
  });

  const dpDetail = dpDetailResponse?.data;

  const resolver = useMemo(() => zodResolver(purchasePaymentSchema) as Resolver<PurchasePaymentFormValues>, []);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PurchasePaymentFormValues>({
    resolver,
    defaultValues: {
      invoice_id: defaultInvoiceId ?? defaultDPId ?? null,
      dp_id: defaultDPId ?? null,
      bank_account_id: null,
      payment_date: todayISO(),
      amount: undefined,
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
      amount: undefined,
      method: "BANK",
      reference_number: null,
      notes: null,
    });
  }, [open, reset, defaultInvoiceId, defaultDPId]);

  const invoiceId = useWatch({ control, name: "invoice_id" });
  const method = useWatch({ control, name: "method" });
  const amount = useWatch({ control, name: "amount" });
  const bankAccountId = useWatch({ control, name: "bank_account_id" });

  const invoicesCombobox = usePaginatedComboboxOptions({
    queryKey: ["purchase-payment", "invoice-options"],
    enabled: open && !isLockedToDP,
    lazyLoad: true,
    queryFn: (params) => supplierInvoicesService.list(params),
    mapOption: (inv) => ({
      value: inv.id,
      label: `${inv.code}${inv.invoice_number ? ` (${inv.invoice_number})` : ""}`,
    }),
  });

  const bankAccountsCombobox = usePaginatedComboboxOptions({
    queryKey: ["purchase-payment", "bank-account-options"],
    enabled: open && method === "BANK",
    lazyLoad: true,
    queryFn: (params) => financeBankAccountsService.list({ ...params, is_active: true }),
    mapOption: (acc) => ({
      value: acc.id,
      label: `${acc.name} - ${acc.account_number}`,
    }),
  });

  const selectedInvoiceDetailQuery = useSupplierInvoice(invoiceId ?? "", {
    enabled: open && !isLockedToDP && !!invoiceId,
  });

  const selectedInvoice = useMemo(() => {
    if (!invoiceId || isLockedToDP) return null;
    const detailed = selectedInvoiceDetailQuery.data?.success ? selectedInvoiceDetailQuery.data.data : null;
    if (detailed) return detailed;
    return invoicesCombobox.items.find((inv) => inv.id === invoiceId) ?? null;
  }, [invoiceId, isLockedToDP, selectedInvoiceDetailQuery.data, invoicesCombobox.items]);

  const payableInvoices = useMemo(
    () => invoicesCombobox.items.filter((inv) => isPayableInvoiceStatus(inv.status)),
    [invoicesCombobox.items],
  );

  useEffect(() => {
    if (isLockedToDP || isLockedToInvoice) return;
    if (!invoiceId || !selectedInvoice) return;
    if (!isPayableInvoiceStatus(selectedInvoice.status)) {
      setValue("invoice_id", null, { shouldValidate: true, shouldDirty: true });
    }
  }, [invoiceId, isLockedToDP, isLockedToInvoice, selectedInvoice, setValue]);

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

  const minimumTenderAmount = useMemo(() => {
    if (method !== "CASH") return 0;
    return Math.max(0, computedAmount ?? 0);
  }, [method, computedAmount]);

  const isCashAmountBelowMinimum =
    method === "CASH" &&
    minimumTenderAmount > 0 &&
    (amount ?? 0) < minimumTenderAmount;

  // Clear bank account when switching to CASH
  const handleMethodChange = useCallback(
    (value: string, calculatedAmount?: number) => {
      if (
        value === "BANK" &&
        calculatedAmount !== undefined &&
        (amount === undefined || amount <= 0)
      ) {
        setValue("amount", calculatedAmount, { shouldValidate: true, shouldDirty: true });
      }
      if (
        value === "CASH" &&
        calculatedAmount !== undefined &&
        (amount === undefined || amount < calculatedAmount)
      ) {
        setValue("amount", calculatedAmount, { shouldValidate: true, shouldDirty: true });
      }
      if (value === "CASH") {
        setValue("bank_account_id", null, { shouldValidate: true, shouldDirty: true });
      }
    },
    [amount, setValue],
  );

  useEffect(() => {
    if (computedAmount === undefined) return;
    if (method === "CASH") {
      if (amount === undefined || amount <= 0) {
        setValue("amount", computedAmount, { shouldValidate: true, shouldDirty: true });
      }
      return;
    }
    if (amount === undefined || amount <= 0) {
      setValue("amount", computedAmount, { shouldValidate: true, shouldDirty: true });
    }
  }, [computedAmount, amount, method, setValue]);

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
            const submittedAmount = values.method === "CASH"
              ? (values.amount ?? 0)
              : (computedAmount ?? values.amount ?? 0);

            if (
              values.method === "CASH" &&
              computedAmount !== undefined &&
              submittedAmount < computedAmount
            ) {
              toast.error(t("form.cashAmountMinimum"));
              return;
            }

            if (submittedAmount <= 0) {
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
                amount: submittedAmount,
                method: values.method,
                reference_number: values.reference_number ?? null,
                notes: values.notes ?? null,
              });
              toast.success(t("toast.created"));
              onClose();
            } catch (error) {
              toast.error(getPurchaseErrorMessage(error, t("toast.failed") ?? "Failed to save payment"));
            }
          }, (formErrors) => {
            const firstErrorField = Object.values(formErrors)[0];
            const fallbackMessage = t("common.validationError") || "Please complete all required fields.";
            toast.error(String(firstErrorField?.message ?? fallbackMessage));
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
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{t("overview.amount")}</span>
                        <span className="text-xs font-medium">{formatCurrency(dpDetail.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{t("overview.remainingAmount")}</span>
                        <span className="text-xs font-medium text-primary">{formatCurrency(dpDetail.remaining_amount ?? dpDetail.amount)}</span>
                      </div>
                      {dpDetail.purchase_order?.code && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-muted-foreground">{t("overview.purchaseOrder")}</span>
                          <span className="text-xs font-medium font-mono">{dpDetail.purchase_order.code}</span>
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
                        <span className="text-xs font-medium text-primary">{formatCurrency(selectedInvoice.remaining_amount)}</span>
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
                              {payableInvoices.map((inv) => (
                              <SelectItem key={inv.id} value={inv.id} className="cursor-pointer">
                                <div className="flex items-center justify-between w-(--radix-select-trigger-width)">
                                  <span>
                                    {inv.code}
                                    {inv.invoice_number ? ` (${inv.invoice_number})` : ""}
                                  </span>
                                  <span className="text-muted-foreground ml-4">
                                    {formatCurrency(inv.remaining_amount)}
                                      {inv.status?.toLowerCase() === "partial" ? " (Partial)" : ""}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.invoice_id?.message ? <FieldError>{String(errors.invoice_id.message)}</FieldError> : null}
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
                        handleMethodChange(v, computedAmount);
                      }}
                      disabled={submitting}
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("placeholders.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BANK" className="cursor-pointer">{t("method.bank")}</SelectItem>
                        <SelectItem value="CASH" className="cursor-pointer">{t("method.cash")}</SelectItem>
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
                {errors.payment_date?.message ? <FieldError>{String(errors.payment_date.message)}</FieldError> : null}
              </Field>

              <>
                {method === "BANK" ? (
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
                                    <span className="text-xs text-muted-foreground">{acc.account_number} · {acc.account_holder}</span>
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
                              <Badge variant="outline" className="text-xs py-0">{selectedBankAccount.currency}</Badge>
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
                        <div className="text-xs text-muted-foreground">{selectedBankAccount.account_number} · {selectedBankAccount.account_holder}</div>
                      </div>
                    )}
                    {errors.bank_account_id?.message ? <FieldError>{String(errors.bank_account_id.message)}</FieldError> : null}
                  </Field>
                ) : null}

                <Field className="sm:col-span-2">
                  <FieldLabel>{t("fields.referenceNumber")}</FieldLabel>
                  <Input {...register("reference_number")} disabled={submitting} />
                </Field>
              </>
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
              <DollarSign className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("fields.amount")}</h3>
            </div>

            <div className="mt-4">
              {method === "CASH" ? (
                <>
                  <Field>
                    <FieldLabel>{t("fields.tenderAmount")}</FieldLabel>
                    <p className="mb-2 text-sm text-muted-foreground">{t("form.cashAmountHint")}</p>
                    {minimumTenderAmount > 0 ? (
                      <p className="mb-2 text-xs text-muted-foreground">
                        {t("form.cashAmountMinimum")} ({formatCurrency(minimumTenderAmount)})
                      </p>
                    ) : null}
                    <Controller
                      control={control}
                      name="amount"
                      render={({ field }) => (
                        <NumericInput
                          value={field.value ?? undefined}
                          onChange={(value) => field.onChange(value ?? 0)}
                          min={0}
                          className={isCashAmountBelowMinimum ? "border-destructive focus-visible:ring-destructive" : undefined}
                          disabled={submitting || isFetchingReference}
                        />
                      )}
                    />
                    {errors.amount?.message ? <FieldError>{String(errors.amount.message)}</FieldError> : null}
                    {!errors.amount?.message && isCashAmountBelowMinimum ? (
                      <FieldError>{t("form.cashAmountMinimum")}</FieldError>
                    ) : null}
                  </Field>

                  <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("overview.remainingAmount")}</span>
                      <span className="font-medium">{formatCurrency(computedAmount ?? 0)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-muted-foreground">{t("fields.changeAmount")}</span>
                      <span className="font-semibold text-success">
                        {formatCurrency(Math.max(0, (amount ?? 0) - (computedAmount ?? 0)))}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <Field>
                  <FieldLabel>{t("fields.amount")}</FieldLabel>
                  <p className="mb-2 text-sm text-muted-foreground">{t("form.bankAmountHint")}</p>
                  <Controller
                    control={control}
                    name="amount"
                    render={({ field }) => (
                      <NumericInput
                        value={field.value ?? undefined}
                        onChange={(value) => field.onChange(value ?? 0)}
                        min={0}
                        disabled={submitting || isFetchingReference}
                      />
                    )}
                  />
                  {errors.amount?.message ? <FieldError>{String(errors.amount.message)}</FieldError> : null}
                </Field>
              )}
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
              disabled={
                submitting ||
                isFetchingReference ||
                bankAccountsCombobox.isLoading ||
                bankAccountsCombobox.isFetching ||
                isCashAmountBelowMinimum
              }
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
