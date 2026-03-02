"use client";

import { Controller } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ButtonLoading } from "@/components/loading";
import { Layers } from "lucide-react";
import { LocationPicker } from "../../../geographic/components/location-picker";
import { useWarehouseForm } from "../../hooks/use-warehouse-form";
import type { Warehouse } from "../../types";

interface WarehouseDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly editingItem?: Warehouse | null;
}

export function WarehouseDialog({
  open,
  onOpenChange,
  editingItem,
}: WarehouseDialogProps) {
  const {
    form,
    t,
    isEditing,
    isLoading,
    onSubmit,
  } = useWarehouseForm({ open, onOpenChange, editingItem });

  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Layers className="h-4 w-4 text-primary" />
                </div>
                <DialogTitle className="text-xl">
                  {isEditing ? t("warehouse.editTitle") : t("warehouse.createTitle")}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-3 pl-10">
                {isEditing && editingItem?.code && (
                  <span className="text-sm font-mono text-muted-foreground">
                    {editingItem.code}
                  </span>
                )}
                <Badge variant={isActive ? "success" : "secondary"} className="text-xs">
                  {isActive ? t("common.active") : t("common.inactive")}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">

          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{t("warehouse.sections.basicInfo")}</h3>
            <div className="border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("warehouse.form.code")} *</FieldLabel>
                  <Input
                    placeholder={t("warehouse.form.codePlaceholder")}
                    {...register("code")}
                  />
                  {errors.code && <FieldError>{errors.code.message}</FieldError>}
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("warehouse.form.name")} *</FieldLabel>
                  <Input
                    placeholder={t("warehouse.form.namePlaceholder")}
                    {...register("name")}
                  />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>
              </div>

              <Field orientation="vertical">
                <FieldLabel>{t("warehouse.form.description")}</FieldLabel>
                <Textarea
                  placeholder={t("warehouse.form.descriptionPlaceholder")}
                  {...register("description")}
                  rows={2}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("warehouse.form.capacity")}</FieldLabel>
                  <Controller
                    control={control}
                    name="capacity"
                    render={({ field }) => (
                      <Input
                        type="number"
                        placeholder={t("warehouse.form.capacityPlaceholder")}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || null)}
                      />
                    )}
                  />
                </Field>
              </div>
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{t("warehouse.sections.location")}</h3>
            <div className="border rounded-lg p-4 space-y-4">
              <Field orientation="vertical">
                <FieldLabel>{t("warehouse.form.address")}</FieldLabel>
                <Input
                  placeholder={t("warehouse.form.addressPlaceholder")}
                  {...register("address")}
                />
              </Field>

              <LocationPicker
                control={control}
                setValue={setValue}
                enabled={open}
              />
            </div>
          </div>

          <Separator />

          {/* Status & Settings */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{t("warehouse.sections.status")}</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{t("warehouse.form.isActive")}</p>
                  <p className="text-xs text-muted-foreground">
                    {isActive ? t("common.active") : t("common.inactive")}
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={(val) => setValue("is_active", val)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
              disabled={isLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading} className="cursor-pointer">
              <ButtonLoading loading={isLoading} loadingText={t("common.saving")}>
                {isEditing ? t("common.save") : t("common.create")}
              </ButtonLoading>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
