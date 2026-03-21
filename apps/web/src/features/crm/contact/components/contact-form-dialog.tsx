"use client";

import { Controller } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  useContactForm,
  type UseContactFormProps,
} from "../hooks/use-contact-form";
import { useContactFormData } from "../hooks/use-contact";
import type { Contact } from "../types";

interface ContactFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly contact?: Contact | null;
  readonly customerId: string;
  readonly onSuccess?: () => void;
}

export function ContactFormDialog({
  open,
  onClose,
  contact,
  customerId,
  onSuccess,
}: ContactFormDialogProps) {
  const isEditing = !!contact;

  const formProps: UseContactFormProps = {
    open,
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        onSuccess?.();
        onClose();
      }
    },
    editingItem: contact,
    customerId,
  };

  const { form, onSubmit, isSubmitting, t, tCommon } =
    useContactForm(formProps);
  const { data: formDataRes } = useContactFormData({ enabled: open });

  const contactRoles = formDataRes?.data?.contact_roles ?? [];

  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editTitle") : t("createTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.basicInfo")}
            </h4>

            <Field orientation="vertical">
              <FieldLabel>{t("form.name")} *</FieldLabel>
              <Input
                placeholder={t("form.namePlaceholder")}
                {...register("name")}
              />
              {errors.name && (
                <FieldError>{errors.name.message}</FieldError>
              )}
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
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("form.contactRolePlaceholder")}
                      />
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
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.contactInfo")}
            </h4>

            <Field orientation="vertical">
              <FieldLabel>{t("form.phone")}</FieldLabel>
              <Input
                placeholder={t("form.phonePlaceholder")}
                {...register("phone")}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("form.email")}</FieldLabel>
              <Input
                type="email"
                placeholder={t("form.emailPlaceholder")}
                {...register("email")}
              />
              {errors.email && (
                <FieldError>{errors.email.message}</FieldError>
              )}
            </Field>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.additional")}
            </h4>

            <Field orientation="vertical">
              <FieldLabel>{t("form.notes")}</FieldLabel>
              <Textarea
                placeholder={t("form.notesPlaceholder")}
                rows={3}
                {...register("notes")}
              />
            </Field>

            <Field
              orientation="horizontal"
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="space-y-0.5">
                <FieldLabel>{t("form.isActive")}</FieldLabel>
                <p className="text-sm text-muted-foreground">
                  {isActive ? t("form.activeStatus") : t("form.inactiveStatus")}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(val) => setValue("is_active", val)}
                className="cursor-pointer"
              />
            </Field>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? tCommon("save") : tCommon("create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
