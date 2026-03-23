"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
  } | null;
  parentOptions: Array<Pick<ChartOfAccount, "id" | "code" | "name">>;
};

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

  const defaultValues: CoaFormValues = useMemo(
    () => ({
      code: initialData?.code ?? "",
      name: initialData?.name ?? "",
      type: initialData?.type ?? "ASSET",
      parent_id: initialData?.parent_id ?? null,
      is_active: initialData?.is_active ?? true,
    }),
    [initialData],
  );

  const form = useForm<CoaFormValues>({
    resolver: zodResolver(coaFormSchema),
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
          <div className="space-y-2">
            <Label htmlFor="code">{t("fields.code")}</Label>
            <Input id="code" {...form.register("code")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{t("fields.name")}</Label>
            <Input id="name" {...form.register("name")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("fields.type")}</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(v) => {
                  form.setValue("type", v as CoaType, { shouldDirty: true });
                }}
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
            </div>

            <div className="space-y-2">
              <Label>{t("fields.parent")}</Label>
              <Select
                value={form.watch("parent_id") ?? "__none__"}
                onValueChange={(v) => {
                  form.setValue("parent_id", v === "__none__" ? null : v, { shouldDirty: true });
                }}
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
