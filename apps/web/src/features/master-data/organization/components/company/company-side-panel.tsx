"use client";

import { Drawer } from "@/components/ui/drawer";
import { Controller } from "react-hook-form";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
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
import { ButtonLoading } from "@/components/loading";
import { MapPickerModal } from "@/components/ui/map/map-picker-modal";

import { sortOptions } from "@/lib/utils";
import { useCompanySidePanel, type CompanySidePanelProps } from "../../hooks/use-company-side-panel";

export function CompanySidePanel(props: CompanySidePanelProps) {
  const { state, actions, form, data, translations } = useCompanySidePanel(props);
  const { t } = translations;

  return (
    <>
      <Drawer
        open={props.isOpen}
        onOpenChange={(open) => !open && props.onClose()}
        title={state.panelTitle}
        side="right"
        defaultWidth={500}
      >
        <form onSubmit={form.handleSubmit(actions.onSubmit)} className="space-y-6 pb-20 p-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium border-b pb-2">
                {t("company.sections.basicInfo")}
              </h3>

              <Field orientation="vertical">
                <FieldLabel>{t("company.form.name")}</FieldLabel>
                <Input
                  placeholder={t("company.form.namePlaceholder")}
                  {...form.register("name")}
                  disabled={state.isViewing}
                />
                {form.errors.name && <FieldError>{form.errors.name.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("company.form.email")}</FieldLabel>
                <Input
                  type="email"
                  placeholder={t("company.form.emailPlaceholder")}
                  {...form.register("email")}
                  disabled={state.isViewing}
                />
                {form.errors.email && <FieldError>{form.errors.email.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("company.form.phone")}</FieldLabel>
                <Input
                  placeholder={t("company.form.phonePlaceholder")}
                  {...form.register("phone")}
                  disabled={state.isViewing}
                />
                {form.errors.phone && <FieldError>{form.errors.phone.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("company.form.address")}</FieldLabel>
                <Textarea
                  placeholder={t("company.form.addressPlaceholder")}
                  {...form.register("address")}
                  rows={2}
                  disabled={state.isViewing}
                />
                {form.errors.address && <FieldError>{form.errors.address.message}</FieldError>}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("company.form.npwp")}</FieldLabel>
                  <Input
                    placeholder={t("company.form.npwpPlaceholder")}
                    {...form.register("npwp")}
                    disabled={state.isViewing}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("company.form.nib")}</FieldLabel>
                  <Input
                    placeholder={t("company.form.nibPlaceholder")}
                    {...form.register("nib")}
                    disabled={state.isViewing}
                  />
                </Field>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-medium border-b pb-2">
                {t("company.sections.location")}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("company.form.province")}</FieldLabel>
                  <Select
                    value={String(state.provinceId || "")}
                    onValueChange={actions.handleProvinceChange}
                    disabled={state.isViewing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Province" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions(data.provinces, (p) => p.name).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("company.form.city")}</FieldLabel>
                  <Select
                    value={String(state.cityId || "")}
                    onValueChange={actions.handleCityChange}
                    disabled={state.isViewing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={state.provinceId ? "Select City" : "Select Province first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions(data.cities, (c) => c.name).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("company.form.district")}</FieldLabel>
                  <Select
                    value={String(state.districtId || "")}
                    onValueChange={actions.handleDistrictChange}
                    disabled={state.isViewing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={state.cityId ? "Select District" : "Select City first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions(data.districts, (d) => d.name).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("company.form.village")}</FieldLabel>
                  <Input
                    {...form.register("village_name")}
                    disabled={state.isViewing}
                    placeholder="Village / Kelurahan"
                  />
                </Field>
              </div>
            </div>

            {/* Coordinates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  <h3 className="text-sm font-medium">
                    {t("company.sections.coordinates")}
                  </h3>
                </div>
                {!state.isViewing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => actions.setIsMapPickerOpen(true)}
                    className="cursor-pointer"
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {t("company.pickFromMap")}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("company.form.latitude")}</FieldLabel>
                  <Controller
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="any"
                        placeholder="-6.2088"
                        disabled={state.isViewing}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    )}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("company.form.longitude")}</FieldLabel>
                  <Controller
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="any"
                        placeholder="106.8456"
                        disabled={state.isViewing}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    )}
                  />
                </Field>
              </div>
            </div>

            {/* Active Status */}
            {!state.isViewing && (
              <Field
                orientation="horizontal"
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <FieldLabel>{t("company.form.isActive")}</FieldLabel>
                <Switch
                  checked={state.isActive}
                  onCheckedChange={(val) => actions.setValue("is_active", val)}
                />
              </Field>
            )}

            {/* Actions */}
            {!state.isViewing && (
              <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2 z-10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={props.onClose}
                  className="cursor-pointer"
                  disabled={state.isLoading}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={state.isLoading} className="cursor-pointer">
                  <ButtonLoading loading={state.isLoading} loadingText="Saving...">
                    {state.isEditing ? t("common.save") : t("common.create")}
                  </ButtonLoading>
                </Button>
              </div>
            )}
        </form>
      </Drawer>

      <MapPickerModal
        open={state.isMapPickerOpen}
        onOpenChange={actions.setIsMapPickerOpen}
        latitude={state.latitude ?? -6.2088}
        longitude={state.longitude ?? 106.8456}
        onCoordinateSelect={actions.handleCoordinateSelect}
        title={t("company.mapPicker.title")}
        description={t("company.mapPicker.description")}
      />
    </>
  );
}
