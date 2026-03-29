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
import { toast } from "sonner";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import {
  useContactForm,
  type UseContactFormProps,
} from "../hooks/use-contact-form";
import { useContactFormData } from "../hooks/use-contact";
import { useCreateContactRole } from "@/features/crm/contact-role/hooks/use-contact-role";
import type { Contact } from "../types";

interface ContactFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly contact?: Contact | null;
  readonly customerId?: string;
  readonly initialName?: string;
  readonly onSuccess?: () => void;
  readonly onCreated?: (contact: Contact) => void;
}

export function ContactFormDialog({
  open,
  onClose,
  contact,
  customerId,
  initialName,
  onSuccess,
  onCreated,
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
    initialName,
    onSaved: (savedContact) => {
      if (!isEditing) {
        onCreated?.(savedContact);
      }
    },
  };

  const { form, onSubmit, isSubmitting, t, tCommon } =
    useContactForm(formProps);
  const { data: formDataRes, refetch: refetchFormData } = useContactFormData({ enabled: open });
  const createContactRoleMutation = useCreateContactRole();

  const contactRoles = formDataRes?.data?.contact_roles ?? [];

  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = form;

  const handleCreateContactRole = async (query: string) => {
    const trimmedName = query.trim();
    if (!trimmedName) return;

    try {
      const response = await createContactRoleMutation.mutateAsync({
        name: trimmedName,
      });

      if (response.data?.id) {
        setValue("contact_role_id", response.data.id, {
          shouldDirty: true,
          shouldTouch: true,
        });
      }

      await refetchFormData();

      toast.success(tCommon("savedSuccessfully") || "Success");
    } catch {
      toast.error(tCommon("error") || "Something went wrong");
    }
  };

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
                  <CreatableCombobox
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    options={contactRoles.map((role) => ({
                      value: role.id,
                      label: role.name,
                    }))}
                    placeholder={t("form.contactRolePlaceholder")}
                    searchPlaceholder={t("searchPlaceholder")}
                    createPermission="crm_contact_role.create"
                    createLabel={`${tCommon("create") || "Create"} "{query}"`}
                    onCreateClick={(query) => {
                      void handleCreateContactRole(query);
                    }}
                    isLoading={createContactRoleMutation.isPending}
                  />
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
