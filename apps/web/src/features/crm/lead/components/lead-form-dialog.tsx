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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeadForm, type UseLeadFormProps } from "../hooks/use-lead-form";
import { useLeadFormData } from "../hooks/use-leads";
import type { Lead } from "../types";

interface LeadFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly lead?: Lead | null;
  readonly onSuccess?: () => void;
}

export function LeadFormDialog({
  open,
  onClose,
  lead,
  onSuccess,
}: LeadFormDialogProps) {
  const t = useTranslations("crmLead");
  const tCommon = useTranslations("common");
  const isEditing = !!lead;

  const formProps: UseLeadFormProps = {
    open,
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        onSuccess?.();
        onClose();
      }
    },
    editingItem: lead,
    onSuccess,
  };

  const { form, onSubmit, isSubmitting } = useLeadForm(formProps);
  const { data: formDataRes } = useLeadFormData({ enabled: open });

  const formData = formDataRes?.data;
  const leadSources = formData?.lead_sources ?? [];
  const leadStatuses = formData?.lead_statuses ?? [];
  const employees = formData?.employees ?? [];

  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
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

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.firstName")} *</FieldLabel>
                <Input
                  placeholder={t("form.firstNamePlaceholder")}
                  {...register("first_name")}
                />
                {errors.first_name && (
                  <FieldError>{errors.first_name.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.lastName")}</FieldLabel>
                <Input
                  placeholder={t("form.lastNamePlaceholder")}
                  {...register("last_name")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.companyName")}</FieldLabel>
                <Input
                  placeholder={t("form.companyNamePlaceholder")}
                  {...register("company_name")}
                />
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.jobTitle")}</FieldLabel>
                <Input
                  placeholder={t("form.jobTitlePlaceholder")}
                  {...register("job_title")}
                />
              </Field>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.contactInfo")}
            </h4>

            <div className="grid grid-cols-2 gap-4">
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

              <Field orientation="vertical">
                <FieldLabel>{t("form.phone")}</FieldLabel>
                <Input
                  placeholder={t("form.phonePlaceholder")}
                  {...register("phone")}
                />
              </Field>
            </div>

            <Field orientation="vertical">
              <FieldLabel>{t("form.address")}</FieldLabel>
              <Textarea
                placeholder={t("form.addressPlaceholder")}
                rows={2}
                {...register("address")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.city")}</FieldLabel>
                <Input
                  placeholder={t("form.cityPlaceholder")}
                  {...register("city")}
                />
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.province")}</FieldLabel>
                <Input
                  placeholder={t("form.provincePlaceholder")}
                  {...register("province")}
                />
              </Field>
            </div>
          </div>

          {/* Classification */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.classification")}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.leadSource")}</FieldLabel>
                <Controller
                  control={control}
                  name="lead_source_id"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("form.leadSourcePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {leadSources.map((source) => (
                          <SelectItem key={source.id} value={source.id} className="cursor-pointer">
                            {source.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.leadStatus")}</FieldLabel>
                <Controller
                  control={control}
                  name="lead_status_id"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("form.leadStatusPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {leadStatuses
                          .filter((s) => !s.is_converted)
                          .map((status) => (
                            <SelectItem key={status.id} value={status.id} className="cursor-pointer">
                              {status.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <Field orientation="vertical">
              <FieldLabel>{t("form.assignedTo")}</FieldLabel>
              <Controller
                control={control}
                name="assigned_to"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("form.assignedToPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id} className="cursor-pointer">
                          {emp.name} ({emp.employee_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          {/* Scoring & Value */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.scoring")}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.estimatedValue")}</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  placeholder={t("form.estimatedValuePlaceholder")}
                  {...register("estimated_value", { valueAsNumber: true })}
                />
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.probability")}</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder={t("form.probabilityPlaceholder")}
                  {...register("probability", { valueAsNumber: true })}
                />
              </Field>
            </div>
          </div>

          {/* BANT Qualification */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.bant")}
            </h4>

            {/* Budget */}
            <div className="rounded-lg border p-3 space-y-3">
              <Field
                orientation="horizontal"
                className="flex items-center justify-between"
              >
                <FieldLabel>{t("form.budgetConfirmed")}</FieldLabel>
                <Switch
                  checked={watch("budget_confirmed")}
                  onCheckedChange={(val) => setValue("budget_confirmed", val)}
                  className="cursor-pointer"
                />
              </Field>
              {watch("budget_confirmed") && (
                <Field orientation="vertical">
                  <FieldLabel>{t("form.budgetAmount")}</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    placeholder={t("form.budgetAmountPlaceholder")}
                    {...register("budget_amount", { valueAsNumber: true })}
                  />
                </Field>
              )}
            </div>

            {/* Authority */}
            <div className="rounded-lg border p-3 space-y-3">
              <Field
                orientation="horizontal"
                className="flex items-center justify-between"
              >
                <FieldLabel>{t("form.authConfirmed")}</FieldLabel>
                <Switch
                  checked={watch("auth_confirmed")}
                  onCheckedChange={(val) => setValue("auth_confirmed", val)}
                  className="cursor-pointer"
                />
              </Field>
              {watch("auth_confirmed") && (
                <Field orientation="vertical">
                  <FieldLabel>{t("form.authPerson")}</FieldLabel>
                  <Input
                    placeholder={t("form.authPersonPlaceholder")}
                    {...register("auth_person")}
                  />
                </Field>
              )}
            </div>

            {/* Need */}
            <div className="rounded-lg border p-3 space-y-3">
              <Field
                orientation="horizontal"
                className="flex items-center justify-between"
              >
                <FieldLabel>{t("form.needConfirmed")}</FieldLabel>
                <Switch
                  checked={watch("need_confirmed")}
                  onCheckedChange={(val) => setValue("need_confirmed", val)}
                  className="cursor-pointer"
                />
              </Field>
              {watch("need_confirmed") && (
                <Field orientation="vertical">
                  <FieldLabel>{t("form.needDescription")}</FieldLabel>
                  <Textarea
                    placeholder={t("form.needDescriptionPlaceholder")}
                    rows={2}
                    {...register("need_description")}
                  />
                </Field>
              )}
            </div>

            {/* Timeline */}
            <div className="rounded-lg border p-3 space-y-3">
              <Field
                orientation="horizontal"
                className="flex items-center justify-between"
              >
                <FieldLabel>{t("form.timeConfirmed")}</FieldLabel>
                <Switch
                  checked={watch("time_confirmed")}
                  onCheckedChange={(val) => setValue("time_confirmed", val)}
                  className="cursor-pointer"
                />
              </Field>
              {watch("time_confirmed") && (
                <Field orientation="vertical">
                  <FieldLabel>{t("form.timeExpected")}</FieldLabel>
                  <Input
                    type="date"
                    {...register("time_expected")}
                  />
                </Field>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.notes")}
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
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? tCommon("save") : tCommon("create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
