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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { useFinanceCoaTree } from "@/features/finance/coa/hooks/use-finance-coa";
import type { ChartOfAccountTreeNode } from "@/features/finance/coa/types";

import { assetCategoryFormSchema, type AssetCategoryFormValues } from "../schemas/asset-category.schema";
import type { AssetCategory, DepreciationMethod } from "../types";
import { useCreateFinanceAssetCategory, useUpdateFinanceAssetCategory } from "../hooks/use-finance-asset-categories";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: AssetCategory | null;
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

const METHODS: DepreciationMethod[] = ["SL", "DB"];

export function AssetCategoryForm({ open, onOpenChange, mode, initialData }: Props) {
  const t = useTranslations("financeAssetCategories");

  const { data: coaData } = useFinanceCoaTree({ only_active: true });
  const coaOptions = useMemo(() => flattenCoa(coaData?.data ?? []), [coaData?.data]);

  const createMutation = useCreateFinanceAssetCategory();
  const updateMutation = useUpdateFinanceAssetCategory();

  const defaultValues: AssetCategoryFormValues = useMemo(
    () => ({
      name: initialData?.name ?? "",
      depreciation_method: (initialData?.depreciation_method as DepreciationMethod) ?? "SL",
      useful_life_months: initialData?.useful_life_months ?? 12,
      depreciation_rate: initialData?.depreciation_rate ?? undefined,
      asset_account_id: initialData?.asset_account_id ?? "",
      accumulated_depreciation_account_id: initialData?.accumulated_depreciation_account_id ?? "",
      depreciation_expense_account_id: initialData?.depreciation_expense_account_id ?? "",
      is_active: initialData?.is_active ?? true,
    }),
    [initialData],
  );

  const form = useForm<AssetCategoryFormValues>({
    resolver: zodResolver(assetCategoryFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: AssetCategoryFormValues) => {
    try {
      const payload = {
        name: values.name,
        depreciation_method: values.depreciation_method,
        useful_life_months: values.useful_life_months,
        depreciation_rate: values.depreciation_rate ?? 0,
        asset_account_id: values.asset_account_id,
        accumulated_depreciation_account_id: values.accumulated_depreciation_account_id,
        depreciation_expense_account_id: values.depreciation_expense_account_id,
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="name">{t("fields.name")}</Label>
            <Input id="name" {...form.register("name")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("fields.method")}</Label>
              <Select
                value={form.watch("depreciation_method")}
                onValueChange={(v) => form.setValue("depreciation_method", v as DepreciationMethod, { shouldDirty: true })}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("placeholders.select")} />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="cursor-pointer">
                      {t(`methods.${m}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="useful_life_months">{t("fields.usefulLifeMonths")}</Label>
              <Input
                id="useful_life_months"
                type="number"
                {...form.register("useful_life_months", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="depreciation_rate">{t("fields.depreciationRate")}</Label>
            <Input
              id="depreciation_rate"
              type="number"
              step="0.0001"
              {...form.register("depreciation_rate", { valueAsNumber: true })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("fields.assetAccount")}</Label>
              <Select
                value={form.watch("asset_account_id") || ""}
                onValueChange={(v) => form.setValue("asset_account_id", v, { shouldDirty: true })}
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

            <div className="space-y-2">
              <Label>{t("fields.accumulatedAccount")}</Label>
              <Select
                value={form.watch("accumulated_depreciation_account_id") || ""}
                onValueChange={(v) => form.setValue("accumulated_depreciation_account_id", v, { shouldDirty: true })}
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

            <div className="space-y-2">
              <Label>{t("fields.expenseAccount")}</Label>
              <Select
                value={form.watch("depreciation_expense_account_id") || ""}
                onValueChange={(v) => form.setValue("depreciation_expense_account_id", v, { shouldDirty: true })}
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
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="text-sm font-medium">{t("fields.isActive")}</div>
            <Switch
              checked={form.watch("is_active") ?? true}
              onCheckedChange={(checked) => form.setValue("is_active", checked, { shouldDirty: true })}
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
