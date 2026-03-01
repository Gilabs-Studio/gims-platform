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
import { ButtonLoading } from "@/components/loading";
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("warehouse.editTitle") : t("warehouse.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
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

          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-medium border-b pb-2">
              {t("warehouse.sections.location", { fallback: "Location" })}
            </h3>

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

          <Field
            orientation="horizontal"
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <FieldLabel>{t("warehouse.form.isActive")}</FieldLabel>
            <Switch
              checked={isActive}
              onCheckedChange={(val) => setValue("is_active", val)}
            />
          </Field>

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
              <ButtonLoading loading={isLoading} loadingText="Saving...">
                {isEditing ? t("common.save") : t("common.create")}
              </ButtonLoading>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
