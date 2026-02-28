"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CreditCard, FileText, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { ButtonLoading } from "@/components/loading";

import { formatCurrency, formatDate } from "@/lib/utils";
import { BankAccountForm } from "@/features/finance/bank-accounts/components/bank-account-form";

import { purchasePaymentSchema, type PurchasePaymentFormData } from "../schemas/purchase-payment.schema";
import { useCreatePurchasePayment, usePurchasePaymentAddData } from "../hooks/use-purchase-payments";

type QuickCreateType = "bankAccount" | null;

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface PurchasePaymentFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function PurchasePaymentForm({ open, onClose }: PurchasePaymentFormProps) {
  const t = useTranslations("purchasePayment");

  const [quickCreate, setQuickCreate] = useState<{ type: QuickCreateType }>({ type: null });
  const openQuickCreate = useCallback((type: QuickCreateType) => setQuickCreate({ type }), []);
  const closeQuickCreate = useCallback(() => setQuickCreate({ type: null }), []);

  const createMutation = useCreatePurchasePayment();
  const { data: addDataResponse, isFetching: isFetchingAddData } = usePurchasePaymentAddData({ enabled: open });

  const addData = addDataResponse?.data;
  const bankAccounts = addData?.bank_accounts ?? [];
  const invoices = addData?.invoices ?? [];

  const resolver = useMemo(() => zodResolver(purchasePaymentSchema) as Resolver<PurchasePaymentFormData>, []);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PurchasePaymentFormData>({
    resolver,
    defaultValues: {
      invoice_id: "",
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
        invoice_id: "",
        bank_account_id: "",
        payment_date: todayISO(),
        amount: 0,
        method: "BANK",
        reference_number: null,
        notes: null,
      });
    }
  }, [open, reset]);

  const invoiceId = watch("invoice_id");
  const selectedInvoice = useMemo(() => {
    if (!invoiceId) return null;
    return invoices.find((inv) => inv.id === invoiceId) ?? null;
  }, [invoiceId, invoices]);

  useEffect(() => {
    if (selectedInvoice?.remaining_amount !== undefined) {
      setValue("amount", selectedInvoice.remaining_amount, { shouldValidate: true });
    } else if (!selectedInvoice) {
      setValue("amount", 0, { shouldValidate: true });
    }
  }, [selectedInvoice, setValue]);

  const handleBankAccountCreated = useCallback((item: { id: string; name: string }) => {
    setValue("bank_account_id", item.id, { shouldValidate: true });
    closeQuickCreate();
  }, [setValue, closeQuickCreate]);

  const submitting = createMutation.isPending;
  const [paymentDateOpen, setPaymentDateOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("form.title")}</DialogTitle>
        </DialogHeader>

        {isFetchingAddData ? <Skeleton className="h-24 w-full" /> : null}

        <form
          className="space-y-6"
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
          {/* Invoice Info section */}
          <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">{t("sections.invoiceInfo") || "Invoice Info"}</h3>
          </div>

          <Field orientation="vertical">
            <FieldLabel>{t("fields.invoice")}</FieldLabel>
            <Controller
              control={control}
              name="invoice_id"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
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
            <div className="rounded-md border p-3">
              <div className="text-sm font-medium">{t("overview.title")}</div>
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">{t("overview.invoiceNumber")}</div>
                  <div className="text-sm font-medium">{selectedInvoice.code} {selectedInvoice.invoice_number ? `(${selectedInvoice.invoice_number})` : ""}</div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">{t("overview.purchaseOrder")}</div>
                  <div className="text-sm font-medium">{selectedInvoice.purchase_order?.code ?? "-"}</div>
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

          {/* Payment Details section */}
          <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
            <CreditCard className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">{t("sections.paymentDetails") || "Payment Details"}</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field orientation="vertical">
              <FieldLabel>{t("fields.bankAccount")}</FieldLabel>
              <Controller
                control={control}
                name="bank_account_id"
                render={({ field }) => (
                  <CreatableCombobox
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || "")}
                    options={bankAccounts.map((acc) => ({ value: acc.id, label: `${acc.name} - ${acc.account_number}` }))}
                    createPermission="bank_account.create"
                    onCreateClick={() => openQuickCreate("bankAccount")}
                    placeholder={t("placeholders.select")}
                    createLabel={t("actions.createNew") || "Create New Bank Account"}
                  />
                )}
              />
              {errors.bank_account_id?.message ? <FieldError>{String(errors.bank_account_id.message)}</FieldError> : null}
            </Field>

            <Field orientation="vertical">
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
                        {field.value ? formatDate(field.value) : t("placeholders.pickDate") || "Pick a date"}
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

            <Field orientation="vertical">
              <FieldLabel>{t("fields.amount")}</FieldLabel>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <NumericInput value={field.value} onChange={field.onChange} min={0} disabled={submitting} />
                )}
              />
              {errors.amount?.message ? <FieldError>{String(errors.amount.message)}</FieldError> : null}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("fields.method")}</FieldLabel>
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
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

            <Field orientation="vertical">
              <FieldLabel>{t("fields.referenceNumber")}</FieldLabel>
              <Input {...register("reference_number")} disabled={submitting} />
            </Field>
          </div>

          <Field orientation="vertical">
            <FieldLabel>{t("fields.notes")}</FieldLabel>
            <Textarea rows={3} {...register("notes")} disabled={submitting} />
          </Field>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer" disabled={submitting}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={submitting || isFetchingAddData}>
              <ButtonLoading loading={submitting || isFetchingAddData}>
                {t("form.submit")}
              </ButtonLoading>
            </Button>
          </div>
        </form>
      </DialogContent>
      <BankAccountForm
        open={quickCreate.type === "bankAccount"}
        onOpenChange={(v) => { if (!v) closeQuickCreate(); }}
        mode="create"
        onCreated={handleBankAccountCreated}
      />
    </Dialog>
  );
}
