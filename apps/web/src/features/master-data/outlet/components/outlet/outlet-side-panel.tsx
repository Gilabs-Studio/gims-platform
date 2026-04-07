"use client";

import { Controller } from "react-hook-form";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { ButtonLoading } from "@/components/loading";
import { LocationPicker } from "../../../geographic/components/location-picker";
import { useOutletForm } from "../../hooks/use-outlet-form";
import type { Outlet } from "../../types";

export interface OutletSidePanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly mode: "create" | "edit";
  readonly outlet?: Outlet | null;
  readonly onSuccess?: () => void;
}

export function OutletSidePanel({
  isOpen,
  onClose,
  mode,
  outlet,
  onSuccess,
}: OutletSidePanelProps) {
  const { form, t, isEditing, isLoading, formData, onSubmit } = useOutletForm({
    open: isOpen,
    onOpenChange: (open) => {
      if (!open) onClose();
    },
    editingItem: mode === "edit" ? outlet : null,
    onSuccess,
  });

  const {
    register,
    control,
    formState: { errors },
  } = form;

  const panelTitle = isEditing ? t("outlet.editTitle") : t("outlet.createTitle");

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={panelTitle}
      side="right"
      defaultWidth={500}
    >
      <form onSubmit={onSubmit} className="space-y-6 pb-20 p-4">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium border-b pb-2">
            {t("outlet.sections.basicInfo")}
          </h3>

          <Field orientation="vertical">
            <FieldLabel>{t("outlet.form.name")} *</FieldLabel>
            <Input
              placeholder={t("outlet.form.namePlaceholder")}
              {...register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field orientation="vertical">
              <FieldLabel>{t("outlet.form.phone")}</FieldLabel>
              <Input
                placeholder={t("outlet.form.phonePlaceholder")}
                {...register("phone")}
              />
            </Field>
            <Field orientation="vertical">
              <FieldLabel>{t("outlet.form.email")}</FieldLabel>
              <Input
                type="email"
                placeholder={t("outlet.form.emailPlaceholder")}
                {...register("email")}
              />
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </Field>
          </div>

          <Field orientation="vertical">
            <FieldLabel>{t("outlet.form.description")}</FieldLabel>
            <Textarea
              placeholder={t("outlet.form.descriptionPlaceholder")}
              {...register("description")}
              rows={2}
            />
          </Field>
        </div>

        {/* Management */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium border-b pb-2">
            {t("outlet.sections.management")}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <Field orientation="vertical">
              <FieldLabel>{t("outlet.form.manager")}</FieldLabel>
              <Controller
                name="manager_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || undefined)}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("outlet.form.managerPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData?.managers?.map((mgr) => (
                        <SelectItem key={mgr.id} value={mgr.id} className="cursor-pointer">
                          {mgr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("outlet.form.company")}</FieldLabel>
              <Controller
                name="company_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || undefined)}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("outlet.form.companyPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData?.companies?.map((comp) => (
                        <SelectItem key={comp.id} value={comp.id} className="cursor-pointer">
                          {comp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium border-b pb-2">
            {t("outlet.sections.location")}
          </h3>

          <Field orientation="vertical">
            <FieldLabel>{t("outlet.form.address")}</FieldLabel>
            <Textarea
              placeholder={t("outlet.form.addressPlaceholder")}
              {...register("address")}
              rows={2}
            />
          </Field>

          <LocationPicker
            control={control}
            setValue={form.setValue}
            enabled={isOpen}
          />
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium border-b pb-2">
            {t("outlet.sections.settings")}
          </h3>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <FieldLabel className="mb-0">{t("outlet.form.isActive")}</FieldLabel>
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="cursor-pointer"
                />
              )}
            />
          </div>

          {!isEditing && (
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div>
                <p className="text-sm font-medium">{t("outlet.form.createWarehouse")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("outlet.form.createWarehouseHint")}
                </p>
              </div>
              <Controller
                name="create_warehouse"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="cursor-pointer"
                  />
                )}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2 z-10">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
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
        </div>
      </form>
    </Drawer>
  );
}
