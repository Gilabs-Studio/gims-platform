"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import {
  maintenanceSchema,
  type MaintenanceFormValues,
} from "../schemas/asset-borrowing.schema";
import type { AssetItem } from "../types";
import { toast } from "sonner";

interface MaintenanceDialogProps {
  open: boolean;
  onClose: () => void;
  asset: AssetItem | null;
  onSubmit: (assetId: string, data: MaintenanceFormValues) => void;
}

export function MaintenanceDialog({
  open,
  onClose,
  asset,
  onSubmit,
}: MaintenanceDialogProps) {
  const t = useTranslations("assetBorrowing");
  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      service_type: "routine_service",
      maintenance_date: today,
      cost: 0,
      vendor_name: "",
      notes: "",
    },
  });

  const serviceTypeVal = watch("service_type");

  if (!asset) return null;

  const handleFormSubmit = (data: MaintenanceFormValues) => {
    onSubmit(asset.id, data);
    toast.success(t("messages.maintenanceSuccess"));
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.maintenanceTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.maintenanceDesc")}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3 text-xs space-y-1 bg-muted/30 my-1">
          <p className="font-semibold text-sm">{asset.name}</p>
          <p className="text-muted-foreground">
            {t("table.assetCode")}: <span className="font-medium text-foreground">{asset.code}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="service_type">
                  {t("dialogs.serviceTypeLabel")}
                </FieldLabel>
                <Select
                  value={serviceTypeVal}
                  onValueChange={(val) =>
                    setValue("service_type", val as MaintenanceFormValues["service_type"], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="service_type" className="w-full cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine_service" className="cursor-pointer">Servis Rutin</SelectItem>
                    <SelectItem value="repair" className="cursor-pointer">Perbaikan / Repair</SelectItem>
                    <SelectItem value="calibration" className="cursor-pointer">Kalibrasi</SelectItem>
                    <SelectItem value="inspection" className="cursor-pointer">Inspeksi Kondisi</SelectItem>
                  </SelectContent>
                </Select>
                {errors.service_type && (
                  <FieldError>{errors.service_type.message}</FieldError>
                )}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="maintenance_date">
                  {t("dialogs.maintenanceDateLabel")}
                </FieldLabel>
                <Input
                  id="maintenance_date"
                  type="date"
                  {...register("maintenance_date")}
                />
                {errors.maintenance_date && (
                  <FieldError>{errors.maintenance_date.message}</FieldError>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="cost">{t("dialogs.costLabel")}</FieldLabel>
                <Input
                  id="cost"
                  type="number"
                  placeholder="0"
                  {...register("cost", { valueAsNumber: true })}
                />
                {errors.cost && <FieldError>{errors.cost.message}</FieldError>}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="vendor_name">{t("dialogs.vendorLabel")}</FieldLabel>
                <Input
                  id="vendor_name"
                  placeholder="Nama Vendor / Service Center"
                  {...register("vendor_name")}
                />
                {errors.vendor_name && (
                  <FieldError>{errors.vendor_name.message}</FieldError>
                )}
              </Field>
            </div>

            <Field className="space-y-1.5">
              <FieldLabel htmlFor="notes">{t("dialogs.maintenanceNotesLabel")}</FieldLabel>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Catatan perawatan, bagian yang diganti..."
                {...register("notes")}
              />
              {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg transition-all duration-300"
            >
              {t("actions.addMaintenance")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
