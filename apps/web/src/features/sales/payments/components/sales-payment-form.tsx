"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { formatCurrency, formatDate } from "@/lib/utils";

import { salesPaymentSchema, type SalesPaymentFormData } from "../schemas/sales-payment.schema";
import { useCreateSalesPayment, useSalesPaymentAddData } from "../hooks/use-sales-payments";
import { BankAccountForm } from "@/features/finance/bank-accounts/components/bank-account-form";

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface SalesPaymentFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly defaultInvoiceId?: string;
}

export function SalesPaymentForm({ open, onClose, defaultInvoiceId }: SalesPaymentFormProps) {
  const t = useTranslations("salesPayment");

  const createMutation = useCreateSalesPayment();
  const { data: addDataResponse, isFetching: isFetchingAddData } = useSalesPaymentAddData({ enabled: open });

  const addData = addDataResponse?.data;
  const bankAccounts = addData?.bank_accounts ?? [];
  const invoices = addData?.invoices ?? [];

  type QuickCreateType = "bankAccount" | null;
  const [quickCreate, setQuickCreate] = useState<{ type: QuickCreateType }>({ type: null });
  const openQuickCreate = useCallback((type: QuickCreateType) => setQuickCreate({ type }), []);
  const closeQuickCreate = useCallback(() => setQuickCreate({ type: null }), []);

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
      invoice_id: defaultInvoiceId ?? "",
      bank_account_id: "",
      payment_date: todayISO(),
      amount: 0,
      method: "BANK",
      reference_number: null,
      notes: null,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        invoice_id: defaultInvoiceId ?? "",
        bank_account_id: "",
        payment_date: todayISO(),
        amount: 0,
        method: "BANK",
        reference_number: null,
        notes: null,
      });
    }
  }, [open, reset, defaultInvoiceId]);

  const invoiceId = watch("invoice_id");
  const selectedInvoice = useMemo(() => {
    if (!invoiceId) return null;
    return invoices.find((inv) => inv.id === invoiceId) ?? null;
  }, [invoiceId, invoices]);

  useEffect(() => {
    if (selectedInvoice && selectedInvoice.remaining_amount !== undefined) {
      setValue("amount", selectedInvoice.remaining_amount, { shouldValidate: true });
    } else if (!selectedInvoice) {
      setValue("amount", 0, { shouldValidate: true });
    }
  }, [selectedInvoice, setValue]);

  const handleBankAccountCreated = useCallback((item: { id: string; name: string }) => {
    setValue("bank_account_id", item.id, { shouldValidate: true });
    closeQuickCreate();
  }, [closeQuickCreate, setValue]);

  const submitting = createMutation.isPending;

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

        {isFetchingAddData ? <Skeleton className="h-24 w-full" /> : null}

        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            try {
              await createMutation.mutateAsync({
                ...values,
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field>
              <FieldLabel>{t("fields.invoice")}</FieldLabel>
              <Controller
                control={control}
                name="invoice_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
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
                            <span>{inv.code} {inv.invoice_number ? `(${inv.invoice_number})` : ""}</span>
                            <span className="text-muted-foreground ml-4">{formatCurrency(inv.remaining_amount)} {inv.status === "partial" ? "(Partial)" : ""}</span>
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
              <div className="sm:col-span-2 rounded-md border p-3">
                <div className="text-sm font-medium">{t("overview.title")}</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{t("overview.invoiceNumber")}</div>
                    <div className="text-sm font-medium">{selectedInvoice.code} {selectedInvoice.invoice_number ? `(${selectedInvoice.invoice_number})` : ""}</div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{t("overview.salesOrder")}</div>
                    <div className="text-sm font-medium">{selectedInvoice.sales_order?.code ?? "-"}</div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{t("overview.invoiceDate")}</div>
                    <div className="text-sm font-medium">{formatDate(selectedInvoice.invoice_date) || "-"}</div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{t("overview.dueDate")}</div>
                    <div className="text-sm font-medium">{formatDate(selectedInvoice.due_date) || "-"}</div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{t("overview.amount")}</div>
                    <div className="text-sm font-medium">{formatCurrency(selectedInvoice.amount)}</div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{t("overview.paidAmount")}</div>
                    <div className="text-sm font-medium">{formatCurrency(selectedInvoice.paid_amount)}</div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{t("overview.remainingAmount")}</div>
                    <div className="text-sm font-medium">{formatCurrency(selectedInvoice.remaining_amount)}</div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{t("overview.status")}</div>
                    <div className="text-sm font-medium">{selectedInvoice.status || "-"}</div>
                  </div>
                </div>
              </div>
            ) : null}

          <Field>
              <FieldLabel>{t("fields.bankAccount")}</FieldLabel>
              <Controller
                control={control}
                name="bank_account_id"
                render={({ field }) => (
                  <CreatableCombobox
                    options={bankAccounts.map((acc) => ({ value: acc.id, label: `${acc.name} - ${acc.account_number}` }))}
                    value={field.value || ""}
                    onValueChange={(v) => field.onChange(v)}
                    placeholder={t("placeholders.select")}
                    isLoading={isFetchingAddData}
                    createPermission="bank_account.create"
                    onCreateClick={() => openQuickCreate("bankAccount")}
                    disabled={submitting}
                  />
                )}
              />
              {errors.bank_account_id?.message ? (
                <FieldError>{String(errors.bank_account_id.message)}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel>{t("fields.paymentDate")}</FieldLabel>
              <Input type="date" {...register("payment_date")} disabled={submitting} />
              {errors.payment_date?.message ? <FieldError>{String(errors.payment_date.message)}</FieldError> : null}
            </Field>

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
                    disabled={submitting}
                  />
                )}
              />
              {errors.amount?.message ? <FieldError>{String(errors.amount.message)}</FieldError> : null}
            </Field>

            <Field>
              <FieldLabel>{t("fields.method")}</FieldLabel>
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
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
              <FieldLabel>{t("fields.referenceNumber")}</FieldLabel>
              <Input {...register("reference_number")} disabled={submitting} />
            </Field>
          </div>

          <Field>
            <FieldLabel>{t("fields.notes")}</FieldLabel>
            <Textarea rows={3} {...register("notes")} disabled={submitting} />
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer" disabled={submitting}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={submitting || isFetchingAddData}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t("form.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>

      <BankAccountForm
        open={quickCreate.type === "bankAccount"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        mode="create"
        onCreated={handleBankAccountCreated}
      />
    </Dialog>
  );
}
