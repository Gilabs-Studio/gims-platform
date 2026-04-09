"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm, type Resolver } from "react-hook-form";
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

import { useFinanceCoaTree } from "@/features/finance/coa/hooks/use-finance-coa";
import type { ChartOfAccountTreeNode } from "@/features/finance/coa/types";

import { journalFormSchema, type JournalFormValues } from "../schemas/journal.schema";
import {
  useCreateFinanceJournal,
  useFinanceJournal,
  useUpdateFinanceJournal,
  useCreateFinanceAdjustmentJournal,
  useUpdateFinanceAdjustmentJournal
} from "../hooks/use-finance-journals";
import { COAValidationError } from "./coa-validation-error";
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

  const defaultValues: JournalFormValues = useMemo(() => {
    if (mode === "edit") {
      const d = journalQuery.data?.data;
      if (d) {
        return {
          entry_date: d.entry_date,
          description: d.description ?? "",
          journal_type: d.journal_type ?? (isAdjustment ? "ADJUSTMENT" : "GENERAL"),
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
      entry_date: todayISO(),
      description: "",
      journal_type: isAdjustment ? "ADJUSTMENT" : "GENERAL",
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

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
      const payload = {
        entry_date: values.entry_date,
        description: values.description ?? "",
        journal_type:
          values.journal_type ??
          currentJournal?.journal_type ??
          (isAdjustment ? "ADJUSTMENT" : "GENERAL"),
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
                <Label htmlFor="entry_date">{t("fields.entryDate")}</Label>
                <Input id="entry_date" type="date" {...form.register("entry_date")} disabled={isLockedJournal} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("fields.description")}</Label>
                <Input id="description" {...form.register("description")} disabled={isLockedJournal} />
              </div>
            </div>

            <div className="rounded-md border">
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
                        value={form.watch(`lines.${idx}.chart_of_account_id`) || ""}
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
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
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
