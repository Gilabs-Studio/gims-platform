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
import { useTaskForm, type UseTaskFormProps } from "../hooks/use-task-form";
import { useTaskFormData } from "../hooks/use-tasks";
import type { Task } from "../types";

const TASK_TYPE_OPTIONS = ["general", "call", "email", "meeting", "follow_up"] as const;
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"] as const;
const STATUS_OPTIONS = ["pending", "in_progress", "completed", "cancelled"] as const;

interface TaskFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly task?: Task | null;
  readonly onSuccess?: () => void;
}

export function TaskFormDialog({
  open,
  onClose,
  task,
  onSuccess,
}: TaskFormDialogProps) {
  const t = useTranslations("crmTask");
  const tCommon = useTranslations("common");
  const isEditing = !!task;

  const formProps: UseTaskFormProps = {
    open,
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        onSuccess?.();
        onClose();
      }
    },
    editingItem: task,
    onSuccess,
  };

  const { form, onSubmit, isSubmitting } = useTaskForm(formProps);
  const { data: formDataRes } = useTaskFormData({ enabled: open });

  const formData = formDataRes?.data;
  const employees = formData?.employees ?? [];
  const customers = formData?.customers ?? [];
  const contacts = formData?.contacts ?? [];
  const deals = formData?.deals ?? [];
  const leads = formData?.leads ?? [];

  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
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

            <div className="grid grid-cols-2 gap-4">
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
                        {TASK_TYPE_OPTIONS.map((type) => (
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
                <FieldLabel>{t("form.priority")} *</FieldLabel>
                <Controller
                  control={control}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("form.priorityPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((p) => (
                          <SelectItem key={p} value={p} className="cursor-pointer">
                            {t(`priorities.${p}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.priority && <FieldError>{errors.priority.message}</FieldError>}
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <Field orientation="vertical">
                <FieldLabel>{t("form.dueDate")}</FieldLabel>
                <Input type="datetime-local" {...register("due_date")} />
              </Field>
            </div>
          </div>

          {/* Assignment */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.assignment")}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.assignedTo")}</FieldLabel>
                <Controller
                  control={control}
                  name="assigned_to"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("form.assignedToPlaceholder")} />
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
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.assignedFrom")}</FieldLabel>
                <Controller
                  control={control}
                  name="assigned_from"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("form.assignedFromPlaceholder")} />
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
              </Field>
            </div>
          </div>

          {/* Related Entities */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.relatedEntities")}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.customer")}</FieldLabel>
                <Controller
                  control={control}
                  name="customer_id"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("form.customerPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c: { id: string; name: string; code: string }) => (
                          <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                            {c.name} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.contact")}</FieldLabel>
                <Controller
                  control={control}
                  name="contact_id"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("form.contactPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((c: { id: string; name: string }) => (
                          <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <Field orientation="vertical">
              <FieldLabel>{t("form.deal")}</FieldLabel>
              <Controller
                control={control}
                name="deal_id"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("form.dealPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {deals.map((d: { id: string; title: string }) => (
                        <SelectItem key={d.id} value={d.id} className="cursor-pointer">
                          {d.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("form.lead")}</FieldLabel>
              <Controller
                control={control}
                name="lead_id"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("form.leadPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map((l: { id: string; code: string; name: string }) => (
                        <SelectItem key={l.id} value={l.id} className="cursor-pointer">
                          {l.name} ({l.code})
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
