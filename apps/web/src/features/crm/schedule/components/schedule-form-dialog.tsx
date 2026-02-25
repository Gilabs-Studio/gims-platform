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
import { useScheduleForm, type UseScheduleFormProps } from "../hooks/use-schedule-form";
import { useScheduleFormData } from "../hooks/use-schedules";
import type { Schedule } from "../types";

const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled"] as const;

interface ScheduleFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly schedule?: Schedule | null;
  readonly onSuccess?: () => void;
}

export function ScheduleFormDialog({
  open,
  onClose,
  schedule,
  onSuccess,
}: ScheduleFormDialogProps) {
  const t = useTranslations("crmSchedule");
  const tCommon = useTranslations("common");
  const isEditing = !!schedule;

  const formProps: UseScheduleFormProps = {
    open,
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        onSuccess?.();
        onClose();
      }
    },
    editingItem: schedule,
    onSuccess,
  };

  const { form, onSubmit, isSubmitting } = useScheduleForm(formProps);
  const { data: formDataRes } = useScheduleFormData({ enabled: open });

  const formData = formDataRes?.data;
  const employees = formData?.employees ?? [];
  const tasks = formData?.tasks ?? [];

  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editTitle") : t("createTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.basicInfo")}
            </h4>

            <Field orientation="vertical">
              <FieldLabel>{t("form.title")} *</FieldLabel>
              <Input
                placeholder={t("form.titlePlaceholder")}
                {...register("title")}
              />
              {errors.title && <FieldError>{errors.title.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("form.description")}</FieldLabel>
              <Textarea
                placeholder={t("form.descriptionPlaceholder")}
                rows={3}
                {...register("description")}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("form.employee")} *</FieldLabel>
              <Controller
                control={control}
                name="employee_id"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("form.employeePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp: { id: string; name: string; employee_code: string }) => (
                        <SelectItem key={emp.id} value={emp.id} className="cursor-pointer">
                          {emp.name} ({emp.employee_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.employee_id && <FieldError>{errors.employee_id.message}</FieldError>}
            </Field>

            {isEditing && (
              <Field orientation="vertical">
                <FieldLabel>{t("form.status")}</FieldLabel>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("form.statusPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s} className="cursor-pointer">
                            {t(`statuses.${s}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}
          </div>

          {/* Timing */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.timing")}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.scheduledAt")} *</FieldLabel>
                <Input type="datetime-local" {...register("scheduled_at")} />
                {errors.scheduled_at && <FieldError>{errors.scheduled_at.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.endAt")}</FieldLabel>
                <Input type="datetime-local" {...register("end_at")} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.location")}</FieldLabel>
                <Input
                  placeholder={t("form.locationPlaceholder")}
                  {...register("location")}
                />
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.reminderMinutes")}</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  placeholder={t("form.reminderMinutesPlaceholder")}
                  {...register("reminder_minutes_before", { valueAsNumber: true })}
                />
              </Field>
            </div>
          </div>

          {/* Related Entities */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.relatedEntities")}
            </h4>

            <Field orientation="vertical">
              <FieldLabel>{t("form.task")}</FieldLabel>
              <Controller
                control={control}
                name="task_id"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("form.taskPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.map((task: { id: string; title: string }) => (
                        <SelectItem key={task.id} value={task.id} className="cursor-pointer">
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          {/* Actions */}
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
