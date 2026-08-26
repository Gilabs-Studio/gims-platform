"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NumericInput } from "@/components/ui/numeric-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";

import { useFinanceCoaTree } from "@/features/finance/coa/hooks/use-finance-coa";
import type { ChartOfAccountTreeNode } from "@/features/finance/coa/types";

import { journalFormSchema, type JournalFormValues } from "../schemas/journal.schema";
import {
  useCreateFinanceJournal,
  useFinanceJournal,
  useFinanceJournalTemplates,
  useUseFinanceJournalTemplate,
  useUpdateFinanceJournal,
  useCreateFinanceAdjustmentJournal,
  useUpdateFinanceAdjustmentJournal
} from "../hooks/use-finance-journals";
import { COAValidationError } from "./coa-validation-error";
import { BalanceIndicator } from "./balance-indicator";
import { isCOAValidationError, parseApiError } from "../utils/error-parser";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  id?: string | null;
  isAdjustment?: boolean;
};

type CoaOption = { id: string; code: string; name: string };

function flattenCoa(nodes: ChartOfAccountTreeNode[]): CoaOption[] {
  const out: CoaOption[] = [];
  const walk = (arr: ChartOfAccountTreeNode[]) => {
    for (const n of arr) {
      out.push({ id: n.id, code: n.code, name: n.name });
      if (Array.isArray(n.children) && n.children.length > 0) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function JournalForm({ open, onOpenChange, mode, id, isAdjustment = false }: Props) {
  const t = useTranslations("financeJournals");

  const [coaValidationError, setCoaValidationError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { data: companiesData } = useCompanies({ page: 1, per_page: 100, is_active: true });
  const companies = companiesData?.data ?? [];

  const { data: coaData } = useFinanceCoaTree({ only_active: true });
  const coaOptions = useMemo(() => flattenCoa(coaData?.data ?? []), [coaData?.data]);

  const journalQuery = useFinanceJournal(id ?? "", { enabled: open && mode === "edit" && !!id });
  const currentJournal = journalQuery.data?.data;
  const isLockedJournal =
    mode === "edit" &&
    ((currentJournal?.is_system_generated ?? false) || (currentJournal?.status ?? "draft").toLowerCase() !== "draft");

  const createMutationGen = useCreateFinanceJournal();
  const updateMutationGen = useUpdateFinanceJournal();
  const createMutationAdj = useCreateFinanceAdjustmentJournal();
  const updateMutationAdj = useUpdateFinanceAdjustmentJournal();

  const createMutation = isAdjustment ? createMutationAdj : createMutationGen;
  const updateMutation = isAdjustment ? updateMutationAdj : updateMutationGen;
  const templateListQuery = useFinanceJournalTemplates(undefined);
  const useTemplateMutation = useUseFinanceJournalTemplate();

  const defaultValues: JournalFormValues = useMemo(() => {
    if (mode === "edit") {
      const d = journalQuery.data?.data;
      if (d) {
        return {
          company_id: d.company_id ?? "",
          fiscal_year_id: d.fiscal_year_id ?? null,
          entry_date: d.entry_date,
          reference: d.reference ?? "",
          description: d.description ?? "",
          journal_type: d.journal_type ?? (isAdjustment ? "ADJUSTMENT" : "GENERAL"),
          currency_code: d.currency_code ?? "IDR",
          exchange_rate: d.exchange_rate ?? 1,
          lines: (d.lines ?? []).map((ln) => ({
            chart_of_account_id: ln.chart_of_account_id,
            debit: ln.debit,
            credit: ln.credit,
            memo: ln.memo ?? "",
          })),
        };
      }
    }

    return {
      company_id: "",
      fiscal_year_id: null,
      entry_date: todayISO(),
      reference: "",
      description: "",
      journal_type: isAdjustment ? "ADJUSTMENT" : "GENERAL",
      currency_code: "IDR",
      exchange_rate: 1,
      lines: [
        { chart_of_account_id: "", debit: 0, credit: 0, memo: "" },
        { chart_of_account_id: "", debit: 0, credit: 0, memo: "" },
      ],
    };
  }, [isAdjustment, mode, journalQuery.data?.data]);

  type ZodResolverSchemaArg = Parameters<typeof zodResolver>[0];

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalFormSchema as unknown as ZodResolverSchemaArg) as unknown as Resolver<JournalFormValues>,
    defaultValues,
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const watchedLines = useWatch({ control: form.control, name: "lines" });
  const totals = useMemo(() => {
    const debit = (watchedLines ?? []).reduce((acc, line) => acc + (line.debit ?? 0), 0);
    const credit = (watchedLines ?? []).reduce((acc, line) => acc + (line.credit ?? 0), 0);
    return { debit, credit, difference: debit - credit };
  }, [watchedLines]);

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: JournalFormValues) => {
    setCoaValidationError(null);
    if (isLockedJournal) {
      toast.error(t("messages.lockedEntry"));
      return;
    }

    try {
      const normalizedCompanyID = values.company_id?.trim() ?? "";
      if (!normalizedCompanyID) {
        toast.error(t("toast.failed"));
        return;
      }

      const payload = {
        company_id: normalizedCompanyID,
        fiscal_year_id: values.fiscal_year_id ?? undefined,
        entry_date: values.entry_date,
        reference: values.reference ?? "",
        description: values.description ?? "",
        journal_type:
          values.journal_type ??
          currentJournal?.journal_type ??
          (isAdjustment ? "ADJUSTMENT" : "GENERAL"),
        currency_code: values.currency_code ?? "IDR",
        exchange_rate: values.exchange_rate ?? 1,
        lines: values.lines.map((ln) => ({
          chart_of_account_id: ln.chart_of_account_id,
          debit: ln.debit ?? 0,
          credit: ln.credit ?? 0,
          memo: ln.memo ?? "",
        })),
      };

      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success(t("toast.created"));
      } else {
        const journalId = id ?? "";
        if (!journalId) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id: journalId, data: payload });
        toast.success(t("toast.updated"));
      }
      onOpenChange(false);
    } catch (error) {
      // Check if it's a COA validation error
      if (isCOAValidationError(error)) {
        const parsedError = parseApiError(error);
        setCoaValidationError(parsedError.message);
        toast.error("Missing required accounting settings");
      } else {
        toast.error(t("toast.failed"));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
        </DialogHeader>

        {coaValidationError && (
          <COAValidationError
            error={coaValidationError}
            onDismiss={() => setCoaValidationError(null)}
          />
        )}

        {isLockedJournal && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {t("messages.lockedEntry")}
          </div>
        )}

        {mode === "edit" && journalQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_id">{t("fields.company")}</Label>
                <Controller
                  control={form.control}
                  name="company_id"
                  render={({ field }) => (
                    <Select
                      value={(field.value as string) || ""}
                      onValueChange={field.onChange}
                      disabled={isLockedJournal}
                    >
                      <SelectTrigger id="company_id" className="cursor-pointer">
                        <SelectValue placeholder={t("placeholders.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id} className="cursor-pointer">
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {isAdjustment && mode === "create" && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="journal_template">{t("fields.journalTemplate")}</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                      value={selectedTemplateId}
                      onValueChange={setSelectedTemplateId}
                      disabled={isLockedJournal || useTemplateMutation.isPending}
                    >
                      <SelectTrigger id="journal_template" className="cursor-pointer">
                        <SelectValue placeholder={t("placeholders.selectTemplate")} />
                      </SelectTrigger>
                      <SelectContent>
                        {(templateListQuery.data?.data ?? []).map((template) => (
                          <SelectItem
                            key={template.id}
                            value={template.id}
                            className="cursor-pointer"
                          >
                            {template.template_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      disabled={!selectedTemplateId || isLockedJournal || useTemplateMutation.isPending}
                      onClick={async () => {
                        try {
                          const result = await useTemplateMutation.mutateAsync(selectedTemplateId);
                          const prefill = result.data.prefill;
                          form.setValue("company_id", prefill.company_id ?? form.getValues("company_id"), { shouldDirty: true });
                          form.setValue("description", prefill.description ?? "", { shouldDirty: true });
                          form.setValue("currency_code", prefill.currency_code ?? "IDR", { shouldDirty: true });
                          form.setValue("exchange_rate", prefill.exchange_rate ?? 1, { shouldDirty: true });
                          replace(
                            (prefill.lines ?? []).map((ln) => ({
                              chart_of_account_id: ln.chart_of_account_id,
                              debit: ln.debit ?? 0,
                              credit: ln.credit ?? 0,
                              memo: ln.memo ?? "",
                            }))
                          );
                          toast.success(t("toast.templateApplied"));
                        } catch {
                          toast.error(t("toast.failed"));
                        }
                      }}
                    >
                      {t("actions.applyTemplate")}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="entry_date">{t("fields.entryDate")}</Label>
                <Input id="entry_date" type="date" {...form.register("entry_date")} disabled={isLockedJournal} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="journal_type">{t("fields.journalType")}</Label>
                <Controller
                  control={form.control}
                  name="journal_type"
                  render={({ field }) => (
                    <Select
                      value={(field.value as string) || (isAdjustment ? "ADJUSTMENT" : "GENERAL")}
                      onValueChange={field.onChange}
                      disabled={isLockedJournal || isAdjustment}
                    >
                      <SelectTrigger id="journal_type" className="cursor-pointer">
                        <SelectValue placeholder={t("placeholders.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GENERAL" className="cursor-pointer">GENERAL</SelectItem>
                        <SelectItem value="ADJUSTMENT" className="cursor-pointer">ADJUSTMENT</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Reference</Label>
                <Input id="reference" {...form.register("reference")} disabled={isLockedJournal} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("fields.description")}</Label>
                <Input id="description" {...form.register("description")} disabled={isLockedJournal} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency_code">Currency</Label>
                <Controller
                  control={form.control}
                  name="currency_code"
                  render={({ field }) => (
                    <Select
                      value={(field.value as string) || "IDR"}
                      onValueChange={field.onChange}
                      disabled={isLockedJournal}
                    >
                      <SelectTrigger id="currency_code" className="cursor-pointer">
                        <SelectValue placeholder={t("placeholders.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IDR" className="cursor-pointer">IDR</SelectItem>
                        <SelectItem value="USD" className="cursor-pointer">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exchange_rate">Exchange Rate</Label>
                <Controller
                  control={form.control}
                  name="exchange_rate"
                  render={({ field }) => (
                    <NumericInput
                      value={field.value ?? ""}
                      onChange={(value) => field.onChange(value)}
                      placeholder="1"
                      disabled={isLockedJournal}
                    />
                  )}
                />
              </div>
            </div>

            <div className="rounded-md border bg-card">
              <div className="flex items-center justify-between p-3 border-b">
                <div className="text-sm font-medium">{t("title")}</div>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => append({ chart_of_account_id: "", debit: 0, credit: 0, memo: "" })}
                  disabled={isLockedJournal}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("form.addLine")}
                </Button>
              </div>

              <div className="p-3 space-y-3">
                {fields.map((f, idx) => (
                  <div key={f.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-4 space-y-1">
                      <Label>{t("fields.account")}</Label>
                      <Select
                        value={watchedLines?.[idx]?.chart_of_account_id || ""}
                        onValueChange={(v) => form.setValue(`lines.${idx}.chart_of_account_id`, v, { shouldDirty: true })}
                        disabled={isLockedJournal}
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
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <Label>{t("fields.debit")}</Label>
                      <Controller
                        control={form.control}
                        name={`lines.${idx}.debit`}
                        render={({ field }) => (
                          <NumericInput
                            value={field.value ?? ""}
                            onChange={(value) => field.onChange(value)}
                            placeholder="0"
                            disabled={isLockedJournal}
                          />
                        )}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <Label>{t("fields.credit")}</Label>
                      <Controller
                        control={form.control}
                        name={`lines.${idx}.credit`}
                        render={({ field }) => (
                          <NumericInput
                            value={field.value ?? ""}
                            onChange={(value) => field.onChange(value)}
                            placeholder="0"
                            disabled={isLockedJournal}
                          />
                        )}
                      />
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <Label>{t("fields.memo")}</Label>
                      <Input {...form.register(`lines.${idx}.memo`)} disabled={isLockedJournal} />
                    </div>

                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => remove(idx)}
                        disabled={fields.length <= 2 || isLockedJournal}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {form.formState.errors.root?.message ? (
                  <div className="text-sm text-destructive">{t("toast.unbalanced")}</div>
                ) : null}

                <BalanceIndicator
                  totalDebit={totals.debit}
                  totalCredit={totals.credit}
                />
              </div>
            </div>

            <DialogFooter className="gap-3 sm:space-x-3">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("form.cancel")}
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {t("form.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
