"use client";

import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ButtonLoading } from "@/components/loading";
import { LocationPicker } from "../../../geographic/components/location-picker";

import { useCompanySidePanel, type CompanySidePanelProps } from "../../hooks/use-company-side-panel";

export function CompanySidePanel(props: CompanySidePanelProps) {
  const { state, actions, form, translations } = useCompanySidePanel(props);
  const { t } = translations;

  return (
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

              <LocationPicker
                control={form.control}
                setValue={actions.setValue}
                disabled={state.isViewing}
                enabled={props.isOpen}
              />
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
  );
}
