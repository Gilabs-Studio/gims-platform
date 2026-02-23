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

import {
  useCustomerSidePanel,
  type CustomerSidePanelProps,
} from "../../hooks/use-customer-side-panel";

export function CustomerSidePanel(props: CustomerSidePanelProps) {
  const { state, actions, form, data, translations } = useCustomerSidePanel(props);
  const { t } = translations;
  const { customerTypes, businessTypes, areas, salesReps, paymentTermsList } = data;

  return (
    <>
      <Drawer
        open={props.isOpen}
        onOpenChange={(open) => !open && props.onClose()}
        title={state.panelTitle}
        side="right"
        defaultWidth={500}
      >
        <form
          onSubmit={form.handleSubmit(actions.onSubmit as any, (errors) => {
            console.error("Form validation failed. Errors:", errors);
          })}
          className="space-y-6 pb-20 p-4"
        >
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-2">
              {t("customer.sections.basicInfo")}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("customer.form.code")}</FieldLabel>
                <Input
                  placeholder={t("customer.form.codePlaceholder")}
                  {...form.register("code")}
                  disabled={state.isViewing}
                />
                {form.errors.code && (
                  <FieldError>{form.errors.code.message}</FieldError>
                )}
              </Field>
              <Field orientation="vertical">
                <FieldLabel>{t("customer.form.customerType")}</FieldLabel>
                <Select
                  value={String(form.watch("customer_type_id") || "")}
                  onValueChange={(val) => actions.setValue("customer_type_id", val)}
                  disabled={state.isViewing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("customer.form.customerTypePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {data.customerTypes.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        {ct.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.name")}</FieldLabel>
              <Input
                placeholder={t("customer.form.namePlaceholder")}
                {...form.register("name")}
                disabled={state.isViewing}
              />
              {form.errors.name && (
                <FieldError>{form.errors.name.message}</FieldError>
              )}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.contactPerson")}</FieldLabel>
              <Input
                placeholder={t("customer.form.contactPersonPlaceholder")}
                {...form.register("contact_person")}
                disabled={state.isViewing}
              />
            </Field>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-2">
              {t("customer.sections.contact")}
            </h3>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.email")}</FieldLabel>
              <Input
                type="email"
                placeholder={t("customer.form.emailPlaceholder")}
                {...form.register("email")}
                disabled={state.isViewing}
              />
              {form.errors.email && (
                <FieldError>{form.errors.email.message}</FieldError>
              )}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.website")}</FieldLabel>
              <Input
                placeholder={t("customer.form.websitePlaceholder")}
                {...form.register("website")}
                disabled={state.isViewing}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.npwp")}</FieldLabel>
              <Input
                placeholder={t("customer.form.npwpPlaceholder")}
                {...form.register("npwp")}
                disabled={state.isViewing}
              />
            </Field>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-2">
              {t("customer.sections.address")}
            </h3>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.address")}</FieldLabel>
              <Textarea
                placeholder={t("customer.form.addressPlaceholder")}
                {...form.register("address")}
                rows={2}
                disabled={state.isViewing}
              />
              {form.errors.address && (
                <FieldError>{form.errors.address.message}</FieldError>
              )}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.province")}</FieldLabel>
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
              <FieldLabel>{t("customer.form.city")}</FieldLabel>
              <Select
                value={String(state.cityId || "")}
                onValueChange={actions.handleCityChange}
                disabled={!state.provinceId || state.isViewing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select City" />
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
              <FieldLabel>{t("customer.form.district")}</FieldLabel>
              <Select
                value={String(state.districtId || "")}
                onValueChange={actions.handleDistrictChange}
                disabled={!state.cityId || state.isViewing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select District" />
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
              <FieldLabel>{t("customer.form.village")}</FieldLabel>
              <Select
                value={String(form.watch("village_id") || "")}
                onValueChange={(val) => actions.setValue("village_id", val)}
                disabled={!state.districtId || state.isViewing}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("customer.form.villagePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions(data.villages, (v) => v.name).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.notes")}</FieldLabel>
              <Textarea
                placeholder={t("customer.form.notesPlaceholder")}
                {...form.register("notes")}
                rows={3}
                disabled={state.isViewing}
              />
            </Field>
          </div>

          {/* Sales Defaults */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-2">
              {t("customer.sections.salesDefaults")}
            </h3>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.defaultBusinessType")}</FieldLabel>
              <Select
                value={String(form.watch("default_business_type_id") || "")}
                onValueChange={(val) => actions.setValue("default_business_type_id", val)}
                disabled={state.isViewing}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("customer.form.defaultBusinessTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((bt) => (
                    <SelectItem key={bt.id} value={bt.id}>
                      {bt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.defaultArea")}</FieldLabel>
              <Select
                value={String(form.watch("default_area_id") || "")}
                onValueChange={(val) => actions.setValue("default_area_id", val)}
                disabled={state.isViewing}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("customer.form.defaultAreaPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.defaultSalesRep")}</FieldLabel>
              <Select
                value={String(form.watch("default_sales_rep_id") || "")}
                onValueChange={(val) => actions.setValue("default_sales_rep_id", val)}
                disabled={state.isViewing}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("customer.form.defaultSalesRepPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {salesReps.map((rep) => (
                    <SelectItem key={rep.id} value={rep.id}>
                      {rep.name} ({rep.employee_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.defaultPaymentTerms")}</FieldLabel>
              <Select
                value={String(form.watch("default_payment_terms_id") || "")}
                onValueChange={(val) => actions.setValue("default_payment_terms_id", val)}
                disabled={state.isViewing}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("customer.form.defaultPaymentTermsPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {paymentTermsList.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name} ({pt.days} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.defaultTaxRate")}</FieldLabel>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={100}
                placeholder={t("customer.form.defaultTaxRatePlaceholder")}
                disabled={state.isViewing}
                {...form.register("default_tax_rate", { valueAsNumber: true })}
              />
            </Field>
          </div>

          {/* Coordinates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                <h3 className="text-sm font-medium">
                  {t("customer.sections.coordinates")}
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
                  {t("customer.pickFromMap")}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("customer.form.latitude")}</FieldLabel>
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
                <FieldLabel>{t("customer.form.longitude")}</FieldLabel>
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
              <FieldLabel>{t("customer.form.isActive")}</FieldLabel>
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
              <Button
                type="submit"
                disabled={state.isLoading}
                className="cursor-pointer"
              >
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
        title={t("customer.mapPicker.title")}
        description={t("customer.mapPicker.description")}
      />
    </>
  );
}
