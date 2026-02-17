"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useCreateFinanceJournal, useFinanceJournal, useUpdateFinanceJournal } from "../hooks/use-finance-journals";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  id?: string | null;
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

export function JournalForm({ open, onOpenChange, mode, id }: Props) {
  const t = useTranslations("financeJournals");

  const { data: coaData } = useFinanceCoaTree({ only_active: true });
  const coaOptions = useMemo(() => flattenCoa(coaData?.data ?? []), [coaData?.data]);

  const journalQuery = useFinanceJournal(id ?? "", { enabled: open && mode === "edit" && !!id });
  const createMutation = useCreateFinanceJournal();
  const updateMutation = useUpdateFinanceJournal();

  const defaultValues: JournalFormValues = useMemo(() => {
    if (mode === "edit") {
      const d = journalQuery.data?.data;
      if (d) {
        return {
          entry_date: d.entry_date,
          description: d.description ?? "",
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
      lines: [
        { chart_of_account_id: "", debit: 0, credit: 0, memo: "" },
        { chart_of_account_id: "", debit: 0, credit: 0, memo: "" },
      ],
    };
  }, [mode, journalQuery.data?.data]);

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalFormSchema),
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
    try {
      const payload = {
        entry_date: values.entry_date,
        description: values.description ?? "",
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
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
        </DialogHeader>

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
                <Input id="entry_date" type="date" {...form.register("entry_date")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("fields.description")}</Label>
                <Input id="description" {...form.register("description")} />
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
                      <Input
                        type="number"
                        step="0.01"
                        {...form.register(`lines.${idx}.debit`, { valueAsNumber: true })}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <Label>{t("fields.credit")}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...form.register(`lines.${idx}.credit`, { valueAsNumber: true })}
                      />
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <Label>{t("fields.memo")}</Label>
                      <Input {...form.register(`lines.${idx}.memo`)} />
                    </div>

                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => remove(idx)}
                        disabled={fields.length <= 2}
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
