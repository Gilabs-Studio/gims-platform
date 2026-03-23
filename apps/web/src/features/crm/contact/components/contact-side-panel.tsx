"use client";

import { Drawer } from "@/components/ui/drawer";
import { Controller } from "react-hook-form";
import { Loader2 } from "lucide-react";
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
import { useContactForm, type UseContactFormProps } from "../hooks/use-contact-form";
import { useContactFormData } from "../hooks/use-contact";
import type { Contact } from "../types";

type PanelMode = "create" | "edit" | "view";

interface ContactSidePanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly mode: PanelMode;
  readonly contact?: Contact | null;
  readonly customerId?: string;
  readonly onSuccess?: () => void;
}

export function ContactSidePanel({
  isOpen,
  onClose,
  mode,
  contact,
  customerId,
  onSuccess,
}: ContactSidePanelProps) {
  const isViewing = mode === "view";

  const formProps: UseContactFormProps = {
    open: isOpen,
    onOpenChange: (open) => {
      if (!open) {
        onSuccess?.();
        onClose();
      }
    },
    editingItem: mode === "edit" ? contact : null,
    customerId,
  };

  const { form, onSubmit, isSubmitting, isEditing, t, tCommon } = useContactForm(formProps);
  const { data: formDataRes } = useContactFormData({ enabled: isOpen });

  const contactRoles = formDataRes?.data?.contact_roles ?? [];
  const customers = formDataRes?.data?.customers ?? [];

  const {
    register,
    control,
    formState: { errors },
  } = form;

  const panelTitle = isViewing
    ? contact?.name ?? t("title")
    : isEditing
      ? t("editTitle")
      : t("createTitle");

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={panelTitle}
      side="right"
      defaultWidth={480}
    >
      <form onSubmit={onSubmit} className="space-y-6 pb-20 p-4">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium border-b pb-2">
            {t("sections.basicInfo")}
          </h3>

          {/* Customer - hidden when scoped to a specific customer */}
          {!customerId && (
            <Field orientation="vertical">
              <FieldLabel>{t("form.customer")} *</FieldLabel>
              <Controller
                control={control}
                name="customer_id"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    disabled={isViewing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("form.customerPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.customer_id && <FieldError>{errors.customer_id.message}</FieldError>}
            </Field>
          )}

          <Field orientation="vertical">
            <FieldLabel>{t("form.name")} *</FieldLabel>
            <Input
              placeholder={t("form.namePlaceholder")}
              {...register("name")}
              disabled={isViewing}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("form.contactRole")}</FieldLabel>
            <Controller
              control={control}
              name="contact_role_id"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  disabled={isViewing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("form.contactRolePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {contactRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium border-b pb-2">
            {t("sections.contactInfo")}
          </h3>

          <Field orientation="vertical">
            <FieldLabel>{t("form.phone")}</FieldLabel>
            <Input
              placeholder={t("form.phonePlaceholder")}
              {...register("phone")}
              disabled={isViewing}
            />
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("form.email")}</FieldLabel>
            <Input
              type="email"
              placeholder={t("form.emailPlaceholder")}
              {...register("email")}
              disabled={isViewing}
            />
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>
        </div>

        {/* Additional Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium border-b pb-2">
            {t("sections.additional")}
          </h3>

          <Field orientation="vertical">
            <FieldLabel>{t("form.notes")}</FieldLabel>
            <Textarea
              placeholder={t("form.notesPlaceholder")}
              rows={3}
              {...register("notes")}
              disabled={isViewing}
            />
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("form.isActive")}</FieldLabel>
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isViewing}
                />
              )}
            />
          </Field>
        </div>

        {/* Action Buttons */}
        {!isViewing && (
          <div className="sticky bottom-0 bg-background pt-4 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? tCommon("save") : tCommon("create")}
            </Button>
          </div>
        )}
      </form>
    </Drawer>
  );
}
