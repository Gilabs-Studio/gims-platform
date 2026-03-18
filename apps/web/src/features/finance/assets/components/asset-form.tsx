"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumericInput } from "@/components/ui/numeric-input";

import { useFinanceAssetCategories } from "@/features/finance/asset-categories/hooks/use-finance-asset-categories";
import { useFinanceAssetLocations } from "@/features/finance/asset-locations/hooks/use-finance-asset-locations";

import { assetFormSchema, type AssetFormValues } from "../schemas/asset.schema";
import type { Asset } from "../types";
import {
  useCreateFinanceAsset,
  useUpdateFinanceAsset,
} from "../hooks/use-finance-assets";
import { DatePicker } from "./date-picker";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: Asset | null;
};

export function AssetForm({ open, onOpenChange, mode, initialData }: Props) {
  const t = useTranslations("financeAssets");

  const { data: categoriesData } = useFinanceAssetCategories({
    page: 1,
    per_page: 100,
    sort_by: "name",
    sort_dir: "asc",
  });
  const { data: locationsData } = useFinanceAssetLocations({
    page: 1,
    per_page: 100,
    sort_by: "name",
    sort_dir: "asc",
  });

  const categoryOptions = categoriesData?.data ?? [];
  const locationOptions = locationsData?.data ?? [];

  const createMutation = useCreateFinanceAsset();
  const updateMutation = useUpdateFinanceAsset();

  const defaultValues: AssetFormValues = useMemo(
    () => ({
      code: initialData?.code ?? "",
      name: initialData?.name ?? "",
      category_id: initialData?.category_id ?? "",
      location_id: initialData?.location_id ?? "",
      acquisition_date: (initialData?.acquisition_date ?? "").slice(0, 10),
      acquisition_cost: initialData?.acquisition_cost ?? 0,
      salvage_value: initialData?.salvage_value ?? 0,
    }),
    [initialData],
  );

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: AssetFormValues) => {
    try {
      const payload = {
        code: values.code,
        name: values.name,
        category_id: values.category_id,
        location_id: values.location_id,
        acquisition_date: values.acquisition_date,
        acquisition_cost: values.acquisition_cost,
        salvage_value: values.salvage_value ?? 0,
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
          <DialogTitle>
            {mode === "create" ? t("form.createTitle") : t("form.editTitle")}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">{t("fields.code")}</Label>
              <Input id="code" {...form.register("code")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t("fields.name")}</Label>
              <Input id="name" {...form.register("name")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("fields.category")}</Label>
              <Select
                value={form.watch("category_id") || ""}
                onValueChange={(v) =>
                  form.setValue("category_id", v, { shouldDirty: true })
                }
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("placeholders.select")} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      className="cursor-pointer"
                    >
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("fields.location")}</Label>
              <Select
                value={form.watch("location_id") || ""}
                onValueChange={(v) =>
                  form.setValue("location_id", v, { shouldDirty: true })
                }
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("placeholders.select")} />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions.map((l) => (
                    <SelectItem
                      key={l.id}
                      value={l.id}
                      className="cursor-pointer"
                    >
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acquisition_date">
                {t("fields.acquisitionDate")}
              </Label>
              <Controller
                name="acquisition_date"
                control={form.control}
                render={({ field }) => (
                  <DatePicker
                    id="acquisition_date"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("placeholders.selectDate")}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acquisition_cost">
                {t("fields.acquisitionCost")}
              </Label>
              <Controller
                name="acquisition_cost"
                control={form.control}
                render={({ field }) => (
                  <NumericInput
                    id="acquisition_cost"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="0"
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salvage_value">{t("fields.salvageValue")}</Label>
              <Controller
                name="salvage_value"
                control={form.control}
                render={({ field }) => (
                  <NumericInput
                    id="salvage_value"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="0"
                  />
                )}
              />
            </div>
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
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              {t("form.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
