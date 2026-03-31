"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ButtonLoading } from "@/components/loading";

import { currencyFormSchema, type CurrencyFormValues } from "../schemas/currency.schema";
import { useCreateCurrency, useUpdateCurrency } from "../hooks/use-currencies";
import type { Currency } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: Currency | null;
  onCreated?: (item: { id: string; name: string }) => void;
};

export function CurrencyFormDialog({ open, onOpenChange, editingItem, onCreated }: Props) {
  const t = useTranslations("currency");
  const tCommon = useTranslations("common");

  const createMutation = useCreateCurrency();
  const updateMutation = useUpdateCurrency();

  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<CurrencyFormValues>({
    resolver: zodResolver(currencyFormSchema),
    defaultValues: {
      code: "",
      name: "",
      symbol: "",
      decimal_places: 2,
      is_active: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      code: editingItem?.code ?? "",
      name: editingItem?.name ?? "",
      symbol: editingItem?.symbol ?? "",
      decimal_places: editingItem?.decimal_places ?? 2,
      is_active: editingItem?.is_active ?? true,
    });
  }, [editingItem, form, open]);

  const {
    register,
    formState: { errors },
  } = form;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const payload = {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        symbol: values.symbol?.trim() || undefined,
        decimal_places: values.decimal_places,
        is_active: values.is_active,
      };

      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: payload });
        toast.success(t("updated"));
      } else {
        const result = await createMutation.mutateAsync(payload);
        toast.success(t("created"));
        onCreated?.({ id: result.data.id, name: result.data.name });
      }

      onOpenChange(false);
    } catch {
      toast.error(tCommon("error"));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? t("edit") : t("create")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>{t("form.code")}</FieldLabel>
              <Input placeholder={t("form.codePlaceholder")} {...register("code")} />
              {errors.code && <FieldError>{errors.code.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>{t("form.symbol")}</FieldLabel>
              <Input placeholder={t("form.symbolPlaceholder")} {...register("symbol")} />
              {errors.symbol && <FieldError>{errors.symbol.message}</FieldError>}
            </Field>
          </div>

          <Field>
            <FieldLabel>{t("form.name")}</FieldLabel>
            <Input placeholder={t("form.namePlaceholder")} {...register("name")} />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("form.decimalPlaces")}</FieldLabel>
            <Input type="number" min={0} max={6} {...register("decimal_places", { valueAsNumber: true })} />
            {errors.decimal_places && <FieldError>{errors.decimal_places.message}</FieldError>}
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              <ButtonLoading loading={isSubmitting} loadingText={tCommon("saving")}>
                {tCommon("save")}
              </ButtonLoading>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}