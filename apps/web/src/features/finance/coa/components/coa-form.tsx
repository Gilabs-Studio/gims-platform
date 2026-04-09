"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { coaFormSchema, type CoaFormValues } from "../schemas/coa.schema";
import type { ChartOfAccount, CoaType } from "../types";
import { useCreateFinanceCoa, useUpdateFinanceCoa } from "../hooks/use-finance-coa";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: {
    id: string;
    code: string;
    name: string;
    type: CoaType;
    parent_id?: string | null;
    is_active: boolean;
    is_protected?: boolean;
    opening_balance?: number;
    opening_date?: string | null;
  } | null;
  parentOptions: Array<Pick<ChartOfAccount, "id" | "code" | "name">>;
};

function toDateInputValue(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

const COA_TYPES: Array<{ value: CoaType; labelKey: string }> = [
  { value: "ASSET", labelKey: "asset" },
  { value: "LIABILITY", labelKey: "liability" },
  { value: "EQUITY", labelKey: "equity" },
  { value: "REVENUE", labelKey: "revenue" },
  { value: "EXPENSE", labelKey: "expense" },
  { value: "CASH_BANK", labelKey: "cash_bank" },
  { value: "CURRENT_ASSET", labelKey: "current_asset" },
  { value: "FIXED_ASSET", labelKey: "fixed_asset" },
  { value: "TRADE_PAYABLE", labelKey: "trade_payable" },
  { value: "COST_OF_GOODS_SOLD", labelKey: "cost_of_goods_sold" },
  { value: "SALARY_WAGES", labelKey: "salary_wages" },
  { value: "OPERATIONAL", labelKey: "operational" },
];

export function CoaForm({ open, onOpenChange, mode, initialData, parentOptions }: Props) {
  const t = useTranslations("financeCoa");

  const createMutation = useCreateFinanceCoa();
  const updateMutation = useUpdateFinanceCoa();

  const isProtected = mode === "edit" && (initialData?.is_protected ?? false);

  const defaultValues: CoaFormValues = useMemo(
    () => ({
      code: initialData?.code ?? "",
      name: initialData?.name ?? "",
      type: initialData?.type ?? "ASSET",
      parent_id: initialData?.parent_id ?? null,
      is_active: initialData?.is_active ?? true,
      opening_balance: initialData?.opening_balance ?? 0,
      opening_date: toDateInputValue(initialData?.opening_date),
    }),
    [initialData],
  );

  type ZodResolverSchemaArg = Parameters<typeof zodResolver>[0];

  const form = useForm<CoaFormValues>({
    resolver: zodResolver(coaFormSchema as unknown as ZodResolverSchemaArg) as unknown as Resolver<CoaFormValues>,
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: CoaFormValues) => {
    try {
      const payload = {
        code: values.code,
        name: values.name,
        type: values.type,
        parent_id: values.parent_id ?? null,
        is_active: values.is_active ?? true,
        opening_balance: values.opening_balance ?? 0,
        opening_date: values.opening_date?.trim() ? values.opening_date : null,
      };

      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success(t("toast.created"));
      } else {
        const id = initialData?.id ?? "";
        if (!id) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id, data: payload });
        toast.success(t("toast.updated"));
      }

      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {isProtected && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {t("messages.protectedAccount")}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">{t("fields.code")}</Label>
            <Input id="code" {...form.register("code")} disabled={isProtected} />
            {form.formState.errors.code && (
              <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{t("fields.name")}</Label>
            <Input id="name" {...form.register("name")} disabled={isProtected} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("fields.type")}</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(v) => {
                  form.setValue("type", v as CoaType, { shouldDirty: true });
                }}
                disabled={isProtected}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("placeholders.select")} />
                </SelectTrigger>
                <SelectContent>
                  {COA_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="cursor-pointer">
                      {t(`types.${type.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("fields.parent")}</Label>
              <Select
                value={form.watch("parent_id") ?? "__none__"}
                onValueChange={(v) => {
                  form.setValue("parent_id", v === "__none__" ? null : v, { shouldDirty: true });
                }}
                disabled={isProtected}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("placeholders.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="cursor-pointer">
                    -
                  </SelectItem>
                  {parentOptions
                    .filter((p) => p.id !== (initialData?.id ?? ""))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id} className="cursor-pointer">
                        {p.code} - {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {form.formState.errors.parent_id && (
                <p className="text-sm text-destructive">{form.formState.errors.parent_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="opening_balance">{t("fields.openingBalance")}</Label>
              <Input
                id="opening_balance"
                type="number"
                step="0.01"
                {...form.register("opening_balance")}
                disabled={isProtected}
              />
              {form.formState.errors.opening_balance && (
                <p className="text-sm text-destructive">{form.formState.errors.opening_balance.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="opening_date">{t("fields.openingDate")}</Label>
              <Input
                id="opening_date"
                type="date"
                {...form.register("opening_date")}
                disabled={isProtected}
              />
              {form.formState.errors.opening_date && (
                <p className="text-sm text-destructive">{form.formState.errors.opening_date.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">{t("fields.isActive")}</div>
            </div>
            <Switch
              checked={form.watch("is_active") ?? true}
              onCheckedChange={(checked) => {
                form.setValue("is_active", checked, { shouldDirty: true });
              }}
              className="cursor-pointer"
              disabled={isProtected}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
