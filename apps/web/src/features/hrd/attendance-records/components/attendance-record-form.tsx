"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, User, FileText, MapPin, Loader2 } from "lucide-react";
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
import { useAttendanceFormData } from "../hooks/use-attendance-records";
import type { CalendarEvent } from "../types";
import { sortOptions } from "@/lib/utils";
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
          date: event.date instanceof Date ? event.date.toISOString().split("T")[0] : String(event.date),
          check_in_time: event.checkInTime ?? undefined,
          check_out_time: event.checkOutTime ?? undefined,
          check_in_type: (event.checkInType as "NORMAL" | "WFH" | "FIELD_WORK") ?? "NORMAL",
          status: event.status as AttendanceRecordFormData["status"],
          notes: event.notes ?? "",
          reason: "",
        }
      : {
          employee_id: "",
          date: selectedDate ? selectedDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          check_in_time: undefined,
          check_out_time: undefined,
          check_in_type: "NORMAL" as const,
          status: "PRESENT" as const,
          notes: "",
          reason: "",
        },
  });

  const employeeIdValue = useWatch({ control, name: "employee_id" });
  const dateValue = useWatch({ control, name: "date" });
  const statusValue = useWatch({ control, name: "status" });
  const checkInTypeValue = useWatch({ control, name: "check_in_type" });

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
                    <span className="font-medium">{employee.name}</span>
                    {employee.employee_code && (
                      <span className="ml-1 text-muted-foreground text-xs">
                        ({employee.employee_code})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employee_id && <FieldError>{errors.employee_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("form.date")} *</FieldLabel>
            <Input
              type="date"
              value={dateValue ?? ""}
              onChange={(e) => setValue("date", e.target.value, { shouldValidate: true })}
              disabled={isEdit}
            />
            {errors.date && <FieldError>{errors.date.message}</FieldError>}
          </Field>
        </div>
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
            <FieldLabel>{t("form.checkInTime")}</FieldLabel>
            <Input
              type="time"
              {...register("check_in_time")}
            />
            <FieldDescription>{t("form.checkInTimeDesc")}</FieldDescription>
            {errors.check_in_time && <FieldError>{errors.check_in_time.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("form.checkOutTime")}</FieldLabel>
            <Input
              type="time"
              {...register("check_out_time")}
            />
            <FieldDescription>{t("form.checkOutTimeDesc")}</FieldDescription>
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
          <FieldLabel>{t("form.reason")} *</FieldLabel>
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
