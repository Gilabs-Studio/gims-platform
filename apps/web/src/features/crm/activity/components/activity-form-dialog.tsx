"use client";

import { Controller } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActivityForm, type UseActivityFormProps } from "../hooks/use-activity-form";

const ACTIVITY_TYPE_OPTIONS = [
  "visit", "call", "email", "meeting", "follow_up", "task", "deal", "lead",
] as const;

interface ActivityFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSuccess?: () => void;
  readonly leadId?: string;
}

export function ActivityFormDialog({
  open,
  onClose,
  onSuccess,
  leadId,
}: ActivityFormDialogProps) {
  const t = useTranslations("crmActivity");
  const tCommon = useTranslations("common");

  const formProps: UseActivityFormProps = {
    open,
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        onSuccess?.();
        onClose();
      }
    },
    onSuccess,
    defaultLeadId: leadId,
  };

  const { form, onSubmit, isSubmitting } = useActivityForm(formProps);

  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.basicInfo")}
            </h4>

            <Field orientation="vertical">
              <FieldLabel>{t("form.type")} *</FieldLabel>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("form.typePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type} className="cursor-pointer">
                          {t(`types.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <FieldError>{errors.type.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("form.employee")} *</FieldLabel>
              <Input
                placeholder={t("form.employeePlaceholder")}
                {...register("employee_id")}
              />
              {errors.employee_id && (
                <FieldError>{errors.employee_id.message}</FieldError>
              )}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("form.description")} *</FieldLabel>
              <Textarea
                placeholder={t("form.descriptionPlaceholder")}
                rows={3}
                {...register("description")}
              />
              {errors.description && (
                <FieldError>{errors.description.message}</FieldError>
              )}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("form.timestamp")}</FieldLabel>
              <Input
                type="datetime-local"
                {...register("timestamp")}
              />
            </Field>
          </div>

          {/* Related Entities */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.relatedEntities")}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.customer")}</FieldLabel>
                <Input
                  placeholder={t("form.customerPlaceholder")}
                  {...register("customer_id")}
                />
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.contact")}</FieldLabel>
                <Input
                  placeholder={t("form.contactPlaceholder")}
                  {...register("contact_id")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.deal")}</FieldLabel>
                <Input
                  placeholder={t("form.dealPlaceholder")}
                  {...register("deal_id")}
                />
              </Field>

              {!leadId && (
                <Field orientation="vertical">
                  <FieldLabel>{t("form.lead")}</FieldLabel>
                  <Input
                    placeholder={t("form.leadPlaceholder")}
                    {...register("lead_id")}
                  />
                </Field>
              )}
            </div>
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
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
