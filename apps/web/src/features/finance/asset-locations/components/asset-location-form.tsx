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

import { assetLocationFormSchema, type AssetLocationFormValues } from "../schemas/asset-location.schema";
import type { AssetLocation } from "../types";
import { useCreateFinanceAssetLocation, useUpdateFinanceAssetLocation } from "../hooks/use-finance-asset-locations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: AssetLocation | null;
};

export function AssetLocationForm({ open, onOpenChange, mode, initialData }: Props) {
  const t = useTranslations("financeAssetLocations");

  const createMutation = useCreateFinanceAssetLocation();
  const updateMutation = useUpdateFinanceAssetLocation();

  const defaultValues: AssetLocationFormValues = useMemo(
    () => ({
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      address: initialData?.address ?? "",
      latitude: initialData?.latitude ?? null,
      longitude: initialData?.longitude ?? null,
    }),
    [initialData],
  );

  const form = useForm<AssetLocationFormValues>({
    resolver: zodResolver(assetLocationFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: AssetLocationFormValues) => {
    try {
      const payload = {
        name: values.name,
        description: values.description ?? "",
        address: values.address ?? "",
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="name">{t("fields.name")}</Label>
            <Input id="name" {...form.register("name")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("fields.description")}</Label>
            <Textarea id="description" rows={3} {...form.register("description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t("fields.address")}</Label>
            <Textarea id="address" rows={2} {...form.register("address")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">{t("fields.latitude")}</Label>
              <Input
                id="latitude"
                type="number"
                step="0.0000001"
                placeholder="-6.2088"
                {...form.register("latitude", { valueAsNumber: true, setValueAs: (v: string) => v === "" ? null : parseFloat(v) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">{t("fields.longitude")}</Label>
              <Input
                id="longitude"
                type="number"
                step="0.0000001"
                placeholder="106.8456"
                {...form.register("longitude", { valueAsNumber: true, setValueAs: (v: string) => v === "" ? null : parseFloat(v) })}
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
            <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
              {t("form.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
