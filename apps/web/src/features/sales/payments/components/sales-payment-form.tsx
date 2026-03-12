"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, FileText, CreditCard, DollarSign, Building2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { formatCurrency, formatDate } from "@/lib/utils";

import { salesPaymentSchema, type SalesPaymentFormData } from "../schemas/sales-payment.schema";
import { useCreateSalesPayment, useSalesPaymentAddData } from "../hooks/use-sales-payments";
import { useFinanceBankAccounts } from "@/features/finance/bank-accounts/hooks/use-finance-bank-accounts";
import { useCustomerInvoiceDP } from "@/features/sales/customer-invoice-down-payments/hooks/use-customer-invoice-dp";

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
  const isLocked = isLockedToInvoice || isLockedToDP;

  const createMutation = useCreateSalesPayment();

  // Fetch invoice add-data when not locked to DP (needed for invoice select or locked invoice details)
  const { data: addDataResponse, isFetching: isFetchingAddData } = useSalesPaymentAddData({
    enabled: open && !isLockedToDP,
  });

  // Fetch DP detail when locked to a specific down payment
  const { data: dpDetailResponse, isLoading: isLoadingDP } = useCustomerInvoiceDP(defaultDPId ?? "", {
    enabled: open && isLockedToDP,
  });

  // Always fetch bank accounts from the finance bank-accounts feature
  const { data: bankAccountsResponse, isLoading: isLoadingBankAccounts } = useFinanceBankAccounts({
    is_active: true,
    per_page: 100,
  });

  const addData = addDataResponse?.data;
  const invoices = addData?.invoices ?? [];
  const bankAccounts = bankAccountsResponse?.data ?? [];
  const dpDetail = dpDetailResponse?.data;

  const resolver = useMemo(() => zodResolver(salesPaymentSchema) as Resolver<SalesPaymentFormData>, []);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SalesPaymentFormData>({
    resolver,
    defaultValues: {
      invoice_id: defaultInvoiceId ?? null,
      dp_id: defaultDPId ?? null,
      bank_account_id: null,
      payment_date: todayISO(),
      amount: 0,
      method: "BANK",
      reference_number: null,
      notes: null,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      invoice_id: defaultInvoiceId ?? null,
      dp_id: defaultDPId ?? null,
      bank_account_id: null,
      payment_date: todayISO(),
      amount: 0,
      method: "BANK",
      reference_number: null,
      notes: null,
    });
  }, [open, reset, defaultInvoiceId, defaultDPId]);

  const invoiceId = watch("invoice_id");
  const method = watch("method");
  const bankAccountId = watch("bank_account_id");

  const selectedInvoice = useMemo(() => {
    if (!invoiceId || isLockedToDP) return null;
    return invoices.find((inv) => inv.id === invoiceId) ?? null;
  }, [invoiceId, invoices, isLockedToDP]);

  const selectedBankAccount = useMemo(() => {
    if (!bankAccountId) return null;
    return bankAccounts.find((acc) => acc.id === bankAccountId) ?? null;
  }, [bankAccountId, bankAccounts]);

  // Pre-fill amount from selected or locked invoice
  useEffect(() => {
    if (selectedInvoice?.remaining_amount !== undefined) {
      setValue("amount", selectedInvoice.remaining_amount, { shouldValidate: !isLockedToInvoice });
    } else if (!isLocked && !selectedInvoice) {
      setValue("amount", 0, { shouldValidate: true });
    }
  }, [selectedInvoice, isLockedToInvoice, isLocked, setValue]);

  // Pre-fill amount from DP detail
  useEffect(() => {
    if (isLockedToDP && dpDetail) {
      setValue("amount", dpDetail.remaining_amount ?? dpDetail.amount, { shouldValidate: false });
    }
  }, [dpDetail, isLockedToDP, setValue]);

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
  const isFetchingReference = isFetchingAddData || isLoadingDP;

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
            try {
              await createMutation.mutateAsync({
                invoice_id: values.invoice_id ?? null,
                dp_id: values.dp_id ?? null,
                bank_account_id: values.bank_account_id ?? null,
                payment_date: values.payment_date,
                amount: values.amount,
                method: values.method,
                reference_number: values.reference_number ?? null,
                notes: values.notes ?? null,
              });
              toast.success(t("toast.created"));
              onClose();
            } catch {
              toast.error(t("toast.failed"));
            }
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
                        <span className="text-xs font-medium text-primary">
                          {formatCurrency(dpDetail.remaining_amount ?? dpDetail.amount)}
                        </span>
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
                          disabled={isFetchingAddData || submitting}
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder={t("placeholders.select")} />
                          </SelectTrigger>
                          <SelectContent>
                            {invoices.map((inv) => (
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
                    <div className="mt-3 rounded-md border p-3">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
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
                <Input type="date" {...register("payment_date")} disabled={submitting} />
                {errors.payment_date?.message ? (
                  <FieldError>{String(errors.payment_date.message)}</FieldError>
                ) : null}
              </Field>

              {method === "BANK" ? (
                <>
                  <Field className="sm:col-span-2">
                    <FieldLabel>{t("fields.bankAccount")}</FieldLabel>
                    <Controller
                      control={control}
                      name="bank_account_id"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(v) => field.onChange(v)}
                          disabled={isLoadingBankAccounts || submitting}
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder={t("placeholders.select")} />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts.map((acc) => (
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
                    {errors.bank_account_id?.message ? (
                      <FieldError>{String(errors.bank_account_id.message)}</FieldError>
                    ) : null}
                  </Field>

                  {selectedBankAccount ? (
                    <div className="sm:col-span-2 rounded-md border p-3 bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{selectedBankAccount.name}</span>
                        {selectedBankAccount.currency && (
                          <Badge variant="outline" className="text-xs py-0">
                            {selectedBankAccount.currency}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedBankAccount.account_number} · {selectedBankAccount.account_holder}
                      </div>
                    </div>
                  ) : null}

                  <Field>
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
                <Controller
                  control={control}
                  name="amount"
                  render={({ field }) => (
                    <NumericInput
                      value={field.value}
                      onChange={field.onChange}
                      min={0}
                      disabled={submitting || isLocked}
                    />
                  )}
                />
                {isLocked ? (
                  <p className="text-xs text-muted-foreground mt-1">{t("form.amountLockedHint")}</p>
                ) : null}
                {errors.amount?.message ? <FieldError>{String(errors.amount.message)}</FieldError> : null}
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
              disabled={submitting || isFetchingReference || isLoadingBankAccounts}
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

