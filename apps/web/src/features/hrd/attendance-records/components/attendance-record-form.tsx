"use client";

import { useEffect, useRef } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { Clock, User, FileText, Loader2, Calendar as CalendarIcon, AlertTriangle } from "lucide-react";
import {
  attendanceRecordSchema,
  type AttendanceRecordFormData,
  STATUS_OPTIONS,
  CHECK_IN_TYPE_OPTIONS,
} from "../schemas/attendance.schema";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAttendanceFormData, useEmployeeSchedule } from "../hooks/use-attendance-records";
import { useCheckHoliday } from "@/features/hrd/holidays/hooks/use-holidays";
import type { CalendarEvent } from "../types";
import { sortOptions, cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ButtonLoading } from "@/components/loading";
import { useTranslations } from "next-intl";

interface AttendanceRecordFormProps {
  readonly event?: CalendarEvent;
  readonly selectedDate?: Date;
  readonly onSubmit: (data: AttendanceRecordFormData) => Promise<void>;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
}

export function AttendanceRecordForm({
  event,
  selectedDate,
  onSubmit,
  onCancel,
  isLoading,
}: AttendanceRecordFormProps) {
  const t = useTranslations("hrd.attendance");
  const isEdit = !!event;
  const { data: formDataResponse, isLoading: isLoadingFormData } = useAttendanceFormData();

  const employees = sortOptions(
    formDataResponse?.data?.employees ?? [],
    (e) => e.name
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<AttendanceRecordFormData>({
    resolver: zodResolver(attendanceRecordSchema),
    defaultValues: event
      ? {
          employee_id: event.employeeId,
          date: event.date instanceof Date ? format(event.date, "yyyy-MM-dd") : String(event.date),
          check_in_time: event.checkInTime ?? undefined,
          check_out_time: event.checkOutTime ?? undefined,
          check_in_type: (event.checkInType as "NORMAL" | "WFH" | "FIELD_WORK") ?? "NORMAL",
          status: event.status as AttendanceRecordFormData["status"],
          notes: event.notes ?? "",
          reason: "",
        }
      : {
          employee_id: "",
          date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
          check_in_time: undefined,
          check_out_time: undefined,
          check_in_type: "NORMAL" as const,
          status: "PRESENT" as const,
          notes: "",
          reason: "",
        },
  });

  const employeeIdValue = useWatch({ control, name: "employee_id" });
  const statusValue = useWatch({ control, name: "status" });
  const checkInTypeValue = useWatch({ control, name: "check_in_type" });
  const dateValue = useWatch({ control, name: "date" });

  // Determine if time fields should be disabled
  const isTimeDisabled = statusValue === "ABSENT" || statusValue === "LEAVE";

  // Fetch employee's work schedule for auto-fill
  const { data: scheduleResponse } = useEmployeeSchedule(employeeIdValue ?? "");
  const schedule = scheduleResponse?.data;

  // Track previous status and employee to detect changes for auto-fill
  const prevStatusRef = useRef(statusValue);
  const prevEmployeeRef = useRef(employeeIdValue);

  // Effect: Clear time fields when status changes to ABSENT or LEAVE
  useEffect(() => {
    if (isTimeDisabled) {
      setValue("check_in_time", undefined);
      setValue("check_out_time", undefined);
    }
  }, [isTimeDisabled, setValue]);

  // Effect: Auto-fill time fields from work schedule when status is PRESENT
  useEffect(() => {
    if (!schedule) return;

    const statusChangedToPresent = statusValue === "PRESENT" && prevStatusRef.current !== "PRESENT";
    const employeeChanged = employeeIdValue !== prevEmployeeRef.current && statusValue === "PRESENT";

    if (statusChangedToPresent || employeeChanged) {
      setValue("check_in_time", schedule.start_time);
      setValue("check_out_time", schedule.end_time);
    }

    prevStatusRef.current = statusValue;
    prevEmployeeRef.current = employeeIdValue;
  }, [statusValue, employeeIdValue, schedule, setValue]);

  // Check if selected date is a holiday
  const { data: holidayCheck } = useCheckHoliday(dateValue ?? "");
  const isHoliday = holidayCheck?.data?.is_holiday ?? false;
  const holidayInfo = holidayCheck?.data?.holiday;

  const handleFormSubmit = async (data: AttendanceRecordFormData) => {
    await onSubmit(data);
  };

  if (isLoadingFormData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">{t("loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Employee & Date Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <User className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("form.employeeInfo")}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field orientation="vertical">
            <FieldLabel>{t("form.employee")} *</FieldLabel>
            <Select
              value={employeeIdValue ?? ""}
              onValueChange={(value) => setValue("employee_id", value, { shouldValidate: true })}
              disabled={isEdit}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t("form.selectEmployee")} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id} className="cursor-pointer">
                    {employee.employee_code} - {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employee_id && <FieldError>{errors.employee_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("form.date")} *</FieldLabel>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isEdit}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value
                        ? format(parseISO(field.value), "dd MMMM yyyy")
                        : t("form.date")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? parseISO(field.value) : undefined}
                      onSelect={(date: Date | undefined) => {
                        field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                      }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.date && <FieldError>{errors.date.message}</FieldError>}
          </Field>
        </div>

        {/* Holiday Warning */}
        {isHoliday && holidayInfo && (
          <Alert variant="destructive" className="border-amber-600 bg-warning text-warning dark:border-amber-500/50 dark:bg-warning/50 dark:text-warning [&>svg]:text-warning dark:[&>svg]:text-warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-semibold">{t("form.holidayWarningTitle")}</AlertTitle>
            <AlertDescription className="text-warning dark:text-warning">
              {holidayInfo.type_display
                ? t("form.holidayWarningDescWithType", {
                    date: dateValue ? format(parseISO(dateValue), "dd MMMM yyyy") : "",
                    name: holidayInfo.name,
                    type: holidayInfo.type_display,
                  })
                : t("form.holidayWarningDesc", {
                    date: dateValue ? format(parseISO(dateValue), "dd MMMM yyyy") : "",
                    name: holidayInfo.name,
                  })}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Attendance Details Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("form.attendanceDetails")}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field orientation="vertical">
            <FieldLabel>{t("form.status")} *</FieldLabel>
            <Select
              value={statusValue ?? ""}
              onValueChange={(value) =>
                setValue("status", value as AttendanceRecordFormData["status"], { shouldValidate: true })
              }
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t("form.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value} className="cursor-pointer">
                    {t(`status.${status.value.toLowerCase()}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && <FieldError>{errors.status.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("form.checkInType")} *</FieldLabel>
            <Select
              value={checkInTypeValue ?? "NORMAL"}
              onValueChange={(value) =>
                setValue("check_in_type", value as AttendanceRecordFormData["check_in_type"], { shouldValidate: true })
              }
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t("form.selectCheckInType")} />
              </SelectTrigger>
              <SelectContent>
                {CHECK_IN_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="cursor-pointer">
                    {t(`checkInType.${type.value.toLowerCase()}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.check_in_type && <FieldError>{errors.check_in_type.message}</FieldError>}
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field orientation="vertical">
            <FieldLabel className={cn(isTimeDisabled && "text-muted-foreground")}>{t("form.checkInTime")}</FieldLabel>
            <Input
              type="time"
              {...register("check_in_time")}
              disabled={isTimeDisabled}
              className={cn(isTimeDisabled && "opacity-50 cursor-not-allowed")}
            />
            <FieldDescription>
              {isTimeDisabled
                ? t("form.checkInTimeDisabled")
                : schedule && statusValue === "PRESENT"
                  ? t("form.scheduleHint", { name: schedule.name, startTime: schedule.start_time, endTime: schedule.end_time })
                  : t("form.checkInTimeDesc")}
            </FieldDescription>
            {errors.check_in_time && <FieldError>{errors.check_in_time.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel className={cn(isTimeDisabled && "text-muted-foreground")}>{t("form.checkOutTime")}</FieldLabel>
            <Input
              type="time"
              {...register("check_out_time")}
              disabled={isTimeDisabled}
              className={cn(isTimeDisabled && "opacity-50 cursor-not-allowed")}
            />
            <FieldDescription>
              {isTimeDisabled
                ? t("form.checkOutTimeDisabled")
                : t("form.checkOutTimeDesc")}
            </FieldDescription>
            {errors.check_out_time && <FieldError>{errors.check_out_time.message}</FieldError>}
          </Field>
        </div>
      </div>

      {/* Reason & Notes Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("form.reasonAndNotes")}</h3>
        </div>

        <Field orientation="vertical">
          <FieldLabel>{t("form.reason")}</FieldLabel>
          <Textarea
            {...register("reason")}
            placeholder={t("form.reasonPlaceholder")}
            rows={2}
          />
          <FieldDescription>{t("form.reasonDesc")}</FieldDescription>
          {errors.reason && <FieldError>{errors.reason.message}</FieldError>}
        </Field>

        <Field orientation="vertical">
          <FieldLabel>{t("form.notes")}</FieldLabel>
          <Textarea
            {...register("notes")}
            placeholder={t("form.notesPlaceholder")}
            rows={3}
          />
          <FieldDescription>{t("form.notesDesc")}</FieldDescription>
          {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="cursor-pointer">
          {t("form.cancel")}
        </Button>
        <Button type="submit" disabled={isLoading} className="cursor-pointer">
          <ButtonLoading loading={isLoading} loadingText={t("form.submitting")}>
            {isEdit ? t("form.update") : t("form.create")}
          </ButtonLoading>
        </Button>
      </div>
    </form>
  );
}
