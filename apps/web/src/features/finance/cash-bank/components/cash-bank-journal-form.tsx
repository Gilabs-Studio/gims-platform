"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { AxiosError } from "axios";
import { Building2, CalendarIcon, ListOrdered, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { cashBankFormSchema, type CashBankFormValues } from "../schemas/cash-bank.schema";
import {
  useCreateFinanceCashBankJournal,
  useFinanceCashBankFormData,
  useFinanceCashBankJournal,
  useUpdateFinanceCashBankJournal,
} from "../hooks/use-finance-cash-bank";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  id?: string | null;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function extractApiErrorMessage(error: unknown): string | null {
  if (error instanceof AxiosError) {
    return (error.response?.data as ApiErrorResponse | undefined)?.error?.message ?? null;
  }
  return null;
}

function parseISODate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function CashBankJournalForm({ open, onOpenChange, mode, id }: Props) {
  const t = useTranslations("financeCashBank");
  const [dateOpen, setDateOpen] = useState(false);

  const detailQuery = useFinanceCashBankJournal(id ?? "", { enabled: mode === "edit" && !!id && open });
  const formDataQuery = useFinanceCashBankFormData({ enabled: open });
  const createMutation = useCreateFinanceCashBankJournal();
  const updateMutation = useUpdateFinanceCashBankJournal();

  const coaOptions = useMemo(() => formDataQuery.data?.data?.chart_of_accounts ?? [], [formDataQuery.data?.data]);
  const bankAccounts = useMemo(() => formDataQuery.data?.data?.bank_accounts ?? [], [formDataQuery.data?.data]);

  const defaultValues: CashBankFormValues = useMemo(() => {
    if (mode === "edit") {
      const j = detailQuery.data?.data;
      if (j) {
        return {
          transaction_date: (j.transaction_date ?? "").slice(0, 10) || todayISO(),
          type: j.type ?? "cash_in",
          description: j.description ?? "",
          bank_account_id: j.bank_account_id ?? "",
          lines: (j.lines ?? []).map((l) => ({
            chart_of_account_id: l.chart_of_account_id,
            amount: Number(l.amount ?? 0),
            memo: l.memo ?? "",
          })),
        };
      }
    }
    return {
      transaction_date: todayISO(),
      type: "cash_in",
      description: "",
      bank_account_id: "",
      lines: [{ chart_of_account_id: "", amount: 0, memo: "" }],
    };
  }, [mode, detailQuery.data?.data]);

  const form = useForm<CashBankFormValues>({
    resolver: zodResolver(cashBankFormSchema),
    defaultValues,
  });
  const {
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const transactionType = form.watch("type") ?? "cash_in";
  const selectedBankAccountId = form.watch("bank_account_id") ?? "";
  const transactionDateValue = form.watch("transaction_date");
  const watchedLines = useWatch({ control: form.control, name: "lines" });

  const selectedBankAccount = useMemo(
    () => bankAccounts.find((bank) => bank.id === selectedBankAccountId),
    [bankAccounts, selectedBankAccountId],
  );

  const parseAmount = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/\./g, "").replace(/,/g, ".");
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const totalAmount = useMemo(() => {
    const lines = (watchedLines ?? []) as Array<{ amount?: number | string }>;
    return lines.reduce<number>((sum, line) => sum + parseAmount(line.amount), 0);
  }, [watchedLines]);

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const updateLineAmount = (index: number, value: number | undefined) => {
    form.setValue(`lines.${index}.amount`, value ?? 0, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (values: CashBankFormValues) => {
    try {
      const payload = {
        transaction_date: values.transaction_date,
        type: values.type,
        description: values.description ?? "",
        bank_account_id: values.bank_account_id,
        lines: values.lines.map((l) => ({
          chart_of_account_id: l.chart_of_account_id,
          amount: Number(l.amount ?? 0),
          memo: l.memo ?? "",
        })),
      };

      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success(t("toast.created"));
      } else {
        const entryId = id ?? "";
        if (!entryId) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id: entryId, data: payload });
        toast.success(t("toast.updated"));
      }
      onOpenChange(false);
    } catch (error: unknown) {
      const apiErrorMessage = extractApiErrorMessage(error);
      if (apiErrorMessage?.includes("bank account is not linked to chart_of_account_id")) {
        toast.error(t("toast.bankAccountNotLinked"));
        return;
      }
      toast.error(t("toast.failed"));
    }
  };

  const isCashIn = transactionType === "cash_in";
  const amountLabel = isCashIn ? t("fields.credit") : t("fields.debit");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
        </DialogHeader>

        {mode === "edit" && detailQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>

            {/* Section 1: Transaction Header */}
            <div>
              <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">{t("form.headerSectionTitle")}</h3>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Transaction Date */}
                <Field>
                  <FieldLabel>{t("fields.transactionDate")}</FieldLabel>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal cursor-pointer"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {transactionDateValue
                          ? format(parseISODate(transactionDateValue) ?? new Date(), "dd MMM yyyy")
                          : t("placeholders.pickDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={parseISODate(transactionDateValue)}
                        onSelect={(date: Date | undefined) => {
                          form.setValue("transaction_date", date ? format(date, "yyyy-MM-dd") : "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          setDateOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.transaction_date?.message ? (
                    <FieldError>{String(errors.transaction_date.message)}</FieldError>
                  ) : null}
                </Field>

                {/* Type */}
                <Field>
                  <FieldLabel>{t("fields.type")}</FieldLabel>
                  <Select
                    value={transactionType}
                    onValueChange={(v) =>
                      form.setValue("type", v as "cash_in" | "cash_out" | "transfer", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("placeholders.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash_in" className="cursor-pointer">{t("type.cash_in")}</SelectItem>
                      <SelectItem value="cash_out" className="cursor-pointer">{t("type.cash_out")}</SelectItem>
                      <SelectItem value="transfer" className="cursor-pointer">{t("type.transfer")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type?.message ? <FieldError>{String(errors.type.message)}</FieldError> : null}
                </Field>

                {/* Description — full width */}
                <Field className="sm:col-span-2">
                  <FieldLabel>{t("fields.description")}</FieldLabel>
                  <Input placeholder={t("placeholders.description")} {...form.register("description")} />
                </Field>

                {/* Bank Account — full width, info card pattern */}
                <Field className="sm:col-span-2">
                  <FieldLabel>{t("fields.bankAccount")}</FieldLabel>
                  {selectedBankAccount ? (
                    <div className="rounded-md border p-3 bg-muted/30 animate-in fade-in-0 zoom-in-95 duration-200">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{selectedBankAccount.account_name}</span>
                          {selectedBankAccount.currency ? (
                            <Badge variant="outline" className="text-xs py-0">{selectedBankAccount.currency}</Badge>
                          ) : null}
                          {!selectedBankAccount.coa_id ? (
                            <Badge variant="secondary" className="text-xs py-0">{t("form.unlinkedBankAccount")}</Badge>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 cursor-pointer"
                          disabled={isSubmitting}
                          onClick={() => form.setValue("bank_account_id", "", { shouldValidate: true })}
                        >
                          {t("actions.change")}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">{selectedBankAccount.account_number}</div>
                    </div>
                  ) : (
                    <Select
                      value={selectedBankAccountId}
                      onValueChange={(v) =>
                        form.setValue("bank_account_id", v, { shouldDirty: true, shouldValidate: true })
                      }
                      disabled={formDataQuery.isLoading || isSubmitting}
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("placeholders.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((ba) => (
                          <SelectItem key={ba.id} value={ba.id} className="cursor-pointer">
                            <div className="flex flex-col">
                              <span>{ba.account_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {ba.account_number}
                                {!ba.coa_id ? ` · ${t("form.unlinkedBankAccount")}` : ""}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.bank_account_id?.message ? (
                    <FieldError>{String(errors.bank_account_id.message)}</FieldError>
                  ) : null}
                </Field>
              </div>
            </div>

            {/* Section 2: Journal Lines */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center space-x-2">
                  <ListOrdered className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">{t("form.linesSectionTitle")}</h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => append({ chart_of_account_id: "", amount: 0, memo: "" })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("form.addLine")}
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_160px_1fr_36px] gap-3 px-1">
                  <span className="text-xs font-medium text-muted-foreground">{t("fields.account")}</span>
                  <span className="text-xs font-medium text-muted-foreground">{amountLabel}</span>
                  <span className="text-xs font-medium text-muted-foreground">{t("fields.memo")}</span>
                  <span />
                </div>

                {fields.map((f, idx) => (
                  <div key={f.id} className="grid grid-cols-[1fr_160px_1fr_36px] gap-3 items-start">
                    <div className="space-y-1">
                      <Select
                        value={form.watch(`lines.${idx}.chart_of_account_id`) || ""}
                        onValueChange={(v) =>
                          form.setValue(`lines.${idx}.chart_of_account_id`, v, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("placeholders.select")} />
                        </SelectTrigger>
                        <SelectContent>
                          {coaOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id} className="cursor-pointer">
                              {opt.code} - {opt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.lines?.[idx]?.chart_of_account_id?.message ? (
                        <p className="text-xs text-destructive">
                          {String(errors.lines[idx]?.chart_of_account_id?.message)}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <NumericInput
                        value={form.watch(`lines.${idx}.amount`) ?? 0}
                        onChange={(val) => updateLineAmount(idx, val)}
                      />
                      {errors.lines?.[idx]?.amount?.message ? (
                        <p className="text-xs text-destructive">
                          {String(errors.lines[idx]?.amount?.message)}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <Input
                        {...form.register(`lines.${idx}.memo`)}
                        placeholder={t("fields.memo")}
                      />
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => remove(idx)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-3 pt-2 border-t">
                <p className="text-xs text-muted-foreground">{t("form.bankLineAutoGenerated")}</p>
                <div className="text-sm flex items-center gap-2">
                  <span className="text-muted-foreground">{t("fields.totalAmount")}</span>
                  <span className="font-medium tabular-nums">{new Intl.NumberFormat("id-ID").format(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {t("form.cancel")}
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {t("form.submit")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
