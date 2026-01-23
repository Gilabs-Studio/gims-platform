"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, User, FileText, Loader2 } from "lucide-react";
import {
  attendanceRecordSchema,
  type AttendanceRecordFormData,
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
import { useAttendanceRecordReport } from "../hooks/use-attendance-records";
import type { CalendarEvent } from "../types";
import { format } from "date-fns";
import { sortOptions } from "@/lib/utils";
import { ButtonLoading } from "@/components/loading";

interface AttendanceRecordFormProps {
  readonly event?: CalendarEvent;
  readonly selectedDate?: Date;
  readonly onSubmit: (data: AttendanceRecordFormData) => Promise<void>;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
}

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "LATE", label: "Late" },
  { value: "ABSENT", label: "Absent" },
  { value: "LEAVE", label: "Leave" },
  { value: "HALF_DAY", label: "Half Day" },
] as const;

export function AttendanceRecordForm({
  event,
  selectedDate,
  onSubmit,
  onCancel,
  isLoading,
}: AttendanceRecordFormProps) {
  const isEdit = !!event;
  const { data: reportData, isLoading: isLoadingReport } = useAttendanceRecordReport();
  
  const employees = sortOptions(reportData?.data?.employees || [], (e) => e.name);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(attendanceRecordSchema),
    defaultValues: event
      ? {
          employee_id: event.employeeId,
          date: event.date,
          check_in_time: event.checkInTime ? new Date(`1970-01-01T${event.checkInTime}`) : null,
          check_out_time: event.checkOutTime ? new Date(`1970-01-01T${event.checkOutTime}`) : null,
          status: event.status,
          note: event.note || "",
        }
      : {
          employee_id: 0,
          date: selectedDate || new Date(),
          check_in_time: null,
          check_out_time: null,
          status: "PRESENT" as const,
          note: "",
        },
  });

  const employeeIdValue = useWatch({ control, name: "employee_id" }) as number | undefined;
  const dateValue = useWatch({ control, name: "date" }) as Date | undefined;
  const statusValue = useWatch({ control, name: "status" }) as AttendanceRecordFormData["status"] | undefined;
  const checkInTime = useWatch({ control, name: "check_in_time" }) as Date | null | undefined;
  const checkOutTime = useWatch({ control, name: "check_out_time" }) as Date | null | undefined;

  const handleFormSubmit = async (data: AttendanceRecordFormData) => {
    await onSubmit(data);
  };

  if (isLoadingReport) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Employee & Date Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
          <User className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Employee Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field orientation="vertical">
            <FieldLabel>Employee *</FieldLabel>
            <Select
              value={employeeIdValue?.toString() || ""}
              onValueChange={(value) => setValue("employee_id", parseInt(value), { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>Select the employee for this record</FieldDescription>
            {errors.employee_id && <FieldError>{errors.employee_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>Date *</FieldLabel>
            <Input
              type="date"
              value={dateValue ? format(dateValue as Date, "yyyy-MM-dd") : ""}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : new Date();
                setValue("date", date, { shouldValidate: true });
              }}
            />
            <FieldDescription>Attendance date</FieldDescription>
            {errors.date && <FieldError>{errors.date.message}</FieldError>}
          </Field>
        </div>
      </div>

      {/* Attendance Details Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Attendance Details</h3>
        </div>

        <Field orientation="vertical">
          <FieldLabel>Status *</FieldLabel>
          <Select
            value={statusValue || ""}
            onValueChange={(value) => setValue("status", value as AttendanceRecordFormData["status"], { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>Attendance status</FieldDescription>
          {errors.status && <FieldError>{errors.status.message}</FieldError>}
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field orientation="vertical">
            <FieldLabel>Check In Time</FieldLabel>
            <Input
              type="time"
              value={
                checkInTime
                  ? format(checkInTime as Date, "HH:mm")
                  : ""
              }
              onChange={(e) => {
                if (e.target.value) {
                  const [hours, minutes] = e.target.value.split(":");
                  const date = new Date();
                  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                  setValue("check_in_time", date, { shouldValidate: true });
                } else {
                  setValue("check_in_time", null, { shouldValidate: true });
                }
              }}
            />
            <FieldDescription>Time when employee checked in</FieldDescription>
            {errors.check_in_time && <FieldError>{errors.check_in_time.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>Check Out Time</FieldLabel>
            <Input
              type="time"
              value={
                checkOutTime
                  ? format(checkOutTime as Date, "HH:mm")
                  : ""
              }
              onChange={(e) => {
                if (e.target.value) {
                  const [hours, minutes] = e.target.value.split(":");
                  const date = new Date();
                  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                  setValue("check_out_time", date, { shouldValidate: true });
                } else {
                  setValue("check_out_time", null, { shouldValidate: true });
                }
              }}
            />
            <FieldDescription>Time when employee checked out</FieldDescription>
            {errors.check_out_time && <FieldError>{errors.check_out_time.message}</FieldError>}
          </Field>
        </div>
      </div>

      {/* Notes Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Additional Notes</h3>
        </div>

        <Field orientation="vertical">
          <FieldLabel>Notes</FieldLabel>
          <Textarea
            {...register("note")}
            placeholder="Add any additional notes..."
            rows={3}
          />
          <FieldDescription>Optional notes about this attendance record</FieldDescription>
          {errors.note && <FieldError>{errors.note.message}</FieldError>}
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          <ButtonLoading loading={isLoading} loadingText="Submitting...">
            {isEdit ? "Update Record" : "Create Record"}
          </ButtonLoading>
        </Button>
      </div>
    </form>
  );
}
