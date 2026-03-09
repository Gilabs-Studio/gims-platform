"use client";

import { useState, useEffect } from "react";
import { Controller } from "react-hook-form";
import { Loader2, CalendarIcon, Bell, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTaskForm, type UseTaskFormProps } from "../hooks/use-task-form";
import { useTaskFormData, useCreateReminder, useUpdateReminder, useDeleteReminder } from "../hooks/use-tasks";
import type { Task } from "../types";

const TASK_TYPE_OPTIONS = ["general", "call", "email", "meeting", "follow_up"] as const;
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"] as const;
const STATUS_OPTIONS = ["pending", "in_progress", "completed", "cancelled"] as const;

interface TaskFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly task?: Task | null;
  readonly onSuccess?: () => void;
  readonly defaultLeadId?: string;
  readonly defaultDealId?: string;
  readonly defaultAssignedToId?: string;
}

export function TaskFormDialog({
  open,
  onClose,
  task,
  onSuccess,
  defaultLeadId,
  defaultDealId,
  defaultAssignedToId,
}: TaskFormDialogProps) {
  const t = useTranslations("crmTask");
  const tCommon = useTranslations("common");
  const isEditing = !!task;

  // Calendar date/time local state for due date
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [dueTime, setDueTime] = useState("09:00");
  const [dueDateOpen, setDueDateOpen] = useState(false);

  // Reminder local state (separate from task form schema)
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminderType, setReminderType] = useState<"in_app" | "email">("in_app");
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderDateOpen, setReminderDateOpen] = useState(false);
  const [existingReminderId, setExistingReminderId] = useState<string | null>(null);
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();

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
    onAfterSubmit: async (taskId: string) => {
      if (reminderEnabled && reminderDate) {
        const [hours, minutes] = reminderTime.split(":").map(Number);
        const remindAtDate = new Date(reminderDate);
        remindAtDate.setHours(hours ?? 9, minutes ?? 0, 0, 0);
        const reminderData = {
          remind_at: remindAtDate.toISOString(),
          reminder_type: reminderType,
          message: reminderMessage || `Reminder for task`,
        };
        if (existingReminderId) {
          await updateReminder.mutateAsync({ taskId, reminderId: existingReminderId, data: reminderData });
        } else {
          await createReminder.mutateAsync({ taskId, data: reminderData });
        }
      } else if (!reminderEnabled && existingReminderId) {
        await deleteReminder.mutateAsync({ taskId, reminderId: existingReminderId });
      }
    },
    defaultValues: {
      lead_id: defaultLeadId,
      deal_id: defaultDealId,
      assigned_to_id: defaultAssignedToId,
    },
  };

  const { form, onSubmit, isSubmitting } = useTaskForm(formProps);
  const { data: formDataRes } = useTaskFormData({ enabled: open });

  const employees = formDataRes?.data?.employees ?? [];

  const {
    register,
    control,
    formState: { errors },
  } = form;

  // Initialize calendar state when dialog opens or task changes
  useEffect(() => {
    if (!open) return;
    if (task?.due_date) {
      const d = new Date(task.due_date);
      setDueDate(d);
      setDueTime(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
      );
    } else {
      setDueDate(null);
      setDueTime("09:00");
    }
    // Pre-fill reminder state from existing reminder, or reset if none
    const existingReminder = task?.reminders?.[0] ?? null;
    if (existingReminder) {
      const remindAt = new Date(existingReminder.remind_at);
      setExistingReminderId(existingReminder.id);
      setReminderEnabled(true);
      setReminderDate(remindAt);
      setReminderTime(
        `${String(remindAt.getHours()).padStart(2, "0")}:${String(remindAt.getMinutes()).padStart(2, "0")}`
      );
      setReminderType(existingReminder.reminder_type);
      setReminderMessage(existingReminder.message);
    } else {
      setExistingReminderId(null);
      setReminderEnabled(false);
      setReminderDate(null);
      setReminderTime("09:00");
      setReminderType("in_app");
      setReminderMessage("");
    }
    setDueDateOpen(false);
  }, [open, task?.id, task?.due_date]);

  // Sync calendar date into the form field (backend accepts YYYY-MM-DD only)
  useEffect(() => {
    form.setValue("due_date", dueDate ? format(dueDate, "yyyy-MM-dd") : "");
  }, [dueDate, form]);

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

            {/* Status (edit only) + Due Date + Due Time */}
            <div className={cn("grid gap-4", isEditing ? "grid-cols-3" : "grid-cols-2")}>
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
                <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal cursor-pointer",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "dd MMM yyyy") : t("form.dueDatePlaceholder")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate ?? undefined}
                      onSelect={(date) => {
                        setDueDate(date ?? null);
                        setDueDateOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.dueTime")}</FieldLabel>
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  disabled={!dueDate}
                />
              </Field>
            </div>
          </div>

          {/* Assignment */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.assignment")}
            </h4>

            <Field orientation="vertical">
              <FieldLabel>{t("form.assignedTo")}</FieldLabel>
              <Controller
                control={control}
                name="assigned_to"
                render={({ field }) => (
                  // key forces re-mount once employees are loaded so the Select displays the correct label
                  <Select key={`${field.value ?? ""}-${employees.length}`} value={field.value ?? ""} onValueChange={field.onChange}>
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
          </div>

          {/* Reminder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-medium">{t("sections.reminders")}</h4>
              <Button
                type="button"
                variant={reminderEnabled ? "destructive" : "outline"}
                size="sm"
                className="h-7 px-2 cursor-pointer text-xs"
                onClick={() => setReminderEnabled((v) => !v)}
              >
                {reminderEnabled ? (
                  <><Trash2 className="h-3.5 w-3.5 mr-1" />{tCommon("remove")}</>
                ) : (
                  <><Plus className="h-3.5 w-3.5 mr-1" />{t("reminder.add")}</>
                )}
              </Button>
            </div>

            {reminderEnabled && (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field orientation="vertical">
                    <FieldLabel>{t("reminder.remindAt")}</FieldLabel>
                    <Popover open={reminderDateOpen} onOpenChange={setReminderDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal cursor-pointer",
                            !reminderDate && "text-muted-foreground"
                          )}
                        >
                          <Bell className="mr-2 h-4 w-4" />
                          {reminderDate ? format(reminderDate, "dd MMM yyyy") : t("form.dueDatePlaceholder")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={reminderDate ?? undefined}
                          onSelect={(date) => {
                            setReminderDate(date ?? null);
                            setReminderDateOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("form.dueTime")}</FieldLabel>
                    <Input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      disabled={!reminderDate}
                    />
                  </Field>
                </div>

                <Field orientation="vertical">
                  <FieldLabel>{t("reminder.type")}</FieldLabel>
                  <Select value={reminderType} onValueChange={(v) => setReminderType(v as "in_app" | "email")}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_app" className="cursor-pointer">{t("reminder.types.in_app")}</SelectItem>
                      <SelectItem value="email" className="cursor-pointer">{t("reminder.types.email")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("reminder.message")}</FieldLabel>
                  <Textarea
                    placeholder={t("reminder.messagePlaceholder")}
                    rows={2}
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                  />
                </Field>
              </div>
            )}
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
