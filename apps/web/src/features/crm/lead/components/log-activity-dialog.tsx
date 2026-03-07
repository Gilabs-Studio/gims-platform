"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCreateActivity } from "@/features/crm/activity/hooks/use-activities";
import { getActivityTypeIcon } from "@/features/crm/activity/utils";
import { useActivityTypes } from "@/features/crm/activity-type/hooks/use-activity-type";
import { toast } from "sonner";
import type { LeadEmployeeOption } from "../types";

interface LogActivityDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly leadId: string;
  readonly defaultEmployeeId?: string;
  readonly employees: LeadEmployeeOption[];
  readonly onSuccess?: () => void;
}

function getNowParts() {
  const now = new Date();
  return {
    date: now,
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
  };
}

export function LogActivityDialog({
  open,
  onClose,
  leadId,
  defaultEmployeeId,
  employees,
  onSuccess,
}: LogActivityDialogProps) {
  const t = useTranslations("crmLead");
  const tCommon = useTranslations("common");

  const { mutateAsync: createActivity, isPending } = useCreateActivity();

  // Fetch activity types from master data
  const { data: activityTypesData } = useActivityTypes({
    per_page: 100,
    sort_by: "order",
    sort_dir: "asc",
  });
  const activityTypes = useMemo(
    () => (activityTypesData?.data ?? []).filter((at) => at.is_active),
    [activityTypesData],
  );

  const schema = useMemo(
    () =>
      z.object({
        activity_type_id: z
          .string()
          .min(1, t("logActivity.validation.typeRequired")),
        employee_id: z
          .string()
          .min(1, t("logActivity.validation.employeeRequired")),
        description: z
          .string()
          .min(1, t("logActivity.validation.descriptionRequired")),
      }),
    [t],
  );

  type FormValues = z.infer<typeof schema>;

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      activity_type_id: "",
      employee_id: defaultEmployeeId ?? "",
      description: "",
    },
  });

  // Synchronize date/time state at render time when dialog opens (avoids setState-in-effect)
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      const { date, time } = getNowParts();
      setSelectedDate(date);
      setSelectedTime(time);
      setCalendarOpen(false);
    }
  }

  // Reset react-hook-form fields each time the dialog opens
  useEffect(() => {
    if (open) {
      reset({
        activity_type_id: activityTypes[0]?.id ?? "",
        employee_id: defaultEmployeeId ?? "",
        description: "",
      });
    }
  }, [open, defaultEmployeeId, activityTypes, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const selectedType = activityTypes.find(
        (at) => at.id === data.activity_type_id,
      );
      // Combine selected date with selected time into a single ISO timestamp
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const timestamp = new Date(selectedDate);
      timestamp.setHours(hours ?? 0, minutes ?? 0, 0, 0);

      await createActivity({
        type: selectedType?.code ?? "call",
        activity_type_id: data.activity_type_id,
        employee_id: data.employee_id,
        description: data.description,
        lead_id: leadId,
        timestamp: timestamp.toISOString(),
      });

      toast.success(t("logActivity.created"));
      onClose();
      onSuccess?.();
    } catch {
      toast.error(tCommon("error"));
    }
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("logActivity.title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Activity Type — from master data with icon + color */}
          <Field orientation="vertical">
            <FieldLabel>{t("logActivity.form.type")} *</FieldLabel>
            <Controller
              control={control}
              name="activity_type_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue
                      placeholder={t("logActivity.form.typePlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((at) => {
                      const TypeIcon = getActivityTypeIcon(at.icon);
                      return (
                        <SelectItem
                          key={at.id}
                          value={at.id}
                          className="cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="flex h-5 w-5 items-center justify-center rounded"
                              style={{
                                backgroundColor: `${at.badge_color}22`,
                                color: at.badge_color,
                              }}
                            >
                              <TypeIcon className="h-3.5 w-3.5" />
                            </span>
                            <span style={{ color: at.badge_color }}>
                              {at.name}
                            </span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.activity_type_id && (
              <FieldError>{errors.activity_type_id.message}</FieldError>
            )}
          </Field>

          {/* Employee */}
          <Field orientation="vertical">
            <FieldLabel>{t("logActivity.form.employee")} *</FieldLabel>
            <Controller
              control={control}
              name="employee_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue
                      placeholder={t("logActivity.form.employeePlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem
                        key={emp.id}
                        value={emp.id}
                        className="cursor-pointer"
                      >
                        {emp.name}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({emp.employee_code})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.employee_id && (
              <FieldError>{errors.employee_id.message}</FieldError>
            )}
          </Field>

          {/* Description */}
          <Field orientation="vertical">
            <FieldLabel>{t("logActivity.form.description")} *</FieldLabel>
            <Textarea
              placeholder={t("logActivity.form.descriptionPlaceholder")}
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <FieldError>{errors.description.message}</FieldError>
            )}
          </Field>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <Field orientation="vertical">
              <FieldLabel>{t("logActivity.form.date")}</FieldLabel>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal cursor-pointer",
                      !selectedDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate
                      ? format(selectedDate, "dd MMM yyyy")
                      : t("logActivity.form.pickDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date: Date | undefined) => {
                      if (date) {
                        setSelectedDate(date);
                        setCalendarOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("logActivity.form.time")}</FieldLabel>
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />
            </Field>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="cursor-pointer"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="cursor-pointer"
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("logActivity.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
