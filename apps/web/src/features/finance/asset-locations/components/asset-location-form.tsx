"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPickerModal } from "@/components/ui/map/map-picker-modal";

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
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

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

  const watchedLat = form.watch("latitude");
  const watchedLng = form.watch("longitude");

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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="md">
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

            <div className="space-y-3 pt-1 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Location Coordinates</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMapPickerOpen(true)}
                  className="cursor-pointer gap-1.5 h-8 text-xs"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Pick from Map
                </Button>
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
            </div>

            <DialogFooter className="gap-3 sm:space-x-3">
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

      <MapPickerModal
        open={isMapPickerOpen}
        onOpenChange={setIsMapPickerOpen}
        latitude={typeof watchedLat === "number" && !isNaN(watchedLat) ? watchedLat : -6.2088}
        longitude={typeof watchedLng === "number" && !isNaN(watchedLng) ? watchedLng : 106.8456}
        onCoordinateSelect={(lat, lng) => {
          form.setValue("latitude", lat, { shouldDirty: true, shouldValidate: true });
          form.setValue("longitude", lng, { shouldDirty: true, shouldValidate: true });
        }}
        title="Select Asset Location on Map"
        description="Click on the map or drag the pin marker to pick exact location coordinates"
      />
    </>
  );
}
