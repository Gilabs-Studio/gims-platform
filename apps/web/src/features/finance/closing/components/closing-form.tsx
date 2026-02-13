"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createClosingSchema, type CreateClosingValues } from "../schemas/closing.schema";
import { useCreateFinanceClosing } from "../hooks/use-finance-closing";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ClosingForm({ open, onOpenChange }: Props) {
  const t = useTranslations("financeClosing");
  const createMutation = useCreateFinanceClosing();

  const defaultValues: CreateClosingValues = useMemo(
    () => ({ period_end_date: new Date().toISOString().slice(0, 10), notes: "" }),
    [],
  );

  const form = useForm<CreateClosingValues>({
    resolver: zodResolver(createClosingSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  const onSubmit = async (values: CreateClosingValues) => {
    try {
      await createMutation.mutateAsync({
        period_end_date: values.period_end_date,
        notes: values.notes ?? "",
      });
      toast.success(t("toast.created"));
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("form.createTitle")}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="period_end_date">{t("fields.periodEndDate")}</Label>
            <Input id="period_end_date" type="date" {...form.register("period_end_date")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">{t("fields.notes")}</Label>
            <Textarea id="notes" rows={4} {...form.register("notes")} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              {t("form.cancel")}
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={createMutation.isPending}>
              {t("form.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
