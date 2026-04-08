"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "../../../geographic/components/location-picker";
import { useOutletForm, type OutletFormData } from "../../hooks/use-outlet-form";
import type { Outlet } from "../../types";
import { Controller } from "react-hook-form";

interface OutletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: Outlet | null;
}

export function OutletDialog({
  open,
  onOpenChange,
  editingItem,
}: OutletDialogProps) {
  const { form, t, isEditing, isLoading, formData, onSubmit } = useOutletForm({
    open,
    onOpenChange,
    editingItem,
  });

  const { register, control, formState: { errors } } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("outlet.editTitle") : t("outlet.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t("outlet.sections.basicInfo")}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("outlet.form.name")} *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder={t("outlet.form.namePlaceholder")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("outlet.form.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder={t("outlet.form.emailPlaceholder")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("outlet.form.phone")}</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder={t("outlet.form.phonePlaceholder")}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">{t("outlet.form.description")}</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder={t("outlet.form.descriptionPlaceholder")}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Manager & Company */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t("outlet.sections.management")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("outlet.form.manager")}</Label>
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
              </div>

              <div className="space-y-2">
                <Label>{t("outlet.form.company")}</Label>
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
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t("outlet.sections.location")}</h3>

            <div className="space-y-2">
              <Label htmlFor="address">{t("outlet.form.address")}</Label>
              <Textarea
                id="address"
                {...register("address")}
                placeholder={t("outlet.form.addressPlaceholder")}
                rows={2}
              />
            </div>

            <LocationPicker
              control={control}
              setValue={form.setValue}
            />
          </div>

          {/* Status & Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t("outlet.sections.settings")}</h3>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">{t("outlet.form.isActive")}</Label>
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="is_active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="cursor-pointer"
                  />
                )}
              />
            </div>

            {/* Create warehouse toggle - only shown when creating a new outlet */}
            {!isEditing && (
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div>
                  <Label htmlFor="create_warehouse" className="text-sm font-medium">
                    {t("outlet.form.createWarehouse")}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("outlet.form.createWarehouseHint")}
                  </p>
                </div>
                <Controller
                  name="create_warehouse"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="create_warehouse"
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
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading} className="cursor-pointer">
              {isLoading ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
