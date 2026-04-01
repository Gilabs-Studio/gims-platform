"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarIcon, Clock, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn, sortOptions } from "@/lib/utils";
import {
  useCreateOvertimeRequest,
  useUpdateOvertimeRequest,
  useOvertimeFormData,
} from "../hooks/use-overtime";
import type { OvertimeRequest, OvertimeType } from "../types";

const overtimeFormSchema = z.object({
  employee_id: z.string().min(1, "Employee is required"),
  date: z.date(),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  reason: z.string().max(500, "Reason too long").optional(),
  request_type: z
    .enum(["AUTO_DETECTED", "MANUAL_CLAIM", "PRE_APPROVED"])
    .optional(),
});

type OvertimeFormData = z.infer<typeof overtimeFormSchema>;

interface OvertimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: OvertimeRequest | null;
  onSuccess?: () => void;
}

export function OvertimeDialog({
  open,
  onOpenChange,
  editingItem,
  onSuccess,
}: OvertimeDialogProps) {
  const t = useTranslations("hrd.overtime");
  const tCommon = useTranslations("common");
  const isEditing = !!editingItem;

  const createMutation = useCreateOvertimeRequest();
  const updateMutation = useUpdateOvertimeRequest();
  const { data: formDataResponse, isLoading: isLoadingFormData } =
    useOvertimeFormData();

  const employees = sortOptions(
    formDataResponse?.data?.employees ?? [],
    (e) => e.name,
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<OvertimeFormData>({
    resolver: zodResolver(overtimeFormSchema),
    defaultValues: {
      employee_id: "",
      date: new Date(),
      start_time: "18:00",
      end_time: "21:00",
      reason: "",
      request_type: "MANUAL_CLAIM",
    },
  });

  const startTime = watch("start_time");
  const endTime = watch("end_time");

  useEffect(() => {
    if (editingItem) {
      reset({
        employee_id: editingItem.employee_id,
        date: new Date(editingItem.date),
        start_time: editingItem.start_time.substring(0, 5),
        end_time: editingItem.end_time.substring(0, 5),
        reason: editingItem.reason,
        request_type: editingItem.request_type,
      });
    } else {
      reset({
        employee_id: "",
        date: new Date(),
        start_time: "18:00",
        end_time: "21:00",
        reason: "",
        request_type: "MANUAL_CLAIM",
      });
    }
  }, [editingItem, reset]);

  const onSubmit = async (data: OvertimeFormData) => {
    // Validate employee_id exists in the list
    const selectedEmployee = employees.find((e) => e.id === data.employee_id);

    if (!selectedEmployee) {
      toast.error("Invalid employee selected. Please select again.");
      return;
    }

    try {
      const payload = {
        employee_id: data.employee_id,
        date: format(data.date, "yyyy-MM-dd"),
        start_time: data.start_time + ":00",
        end_time: data.end_time + ":00",
        reason: data.reason,
        request_type: data.request_type as OvertimeType,
      };

      if (isEditing && editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: {
            start_time: payload.start_time,
            end_time: payload.end_time,
            reason: payload.reason,
          },
        });
        toast.success(t("messages.updateSuccess"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("messages.createSuccess"));
      }
      // Reset form after successful submission
      reset({
        employee_id: "",
        date: new Date(),
        start_time: "18:00",
        end_time: "21:00",
        reason: "",
        request_type: "MANUAL_CLAIM",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const isPending =
    createMutation.isPending || updateMutation.isPending || isLoadingFormData;

  // Calculate duration
  const calculateDuration = () => {
    if (!startTime || !endTime) return null;
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60; // Next day
    }
    const duration = endMinutes - startMinutes;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("actions.edit") : t("actions.create")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {isLoadingFormData ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                {tCommon("loading")}
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Employee Selection (only for new requests) */}
            {!isEditing && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">
                    {t("form.employeeInfo")}
                  </h3>
                </div>

                <Field>
                  <FieldLabel>{t("fields.employee")} *</FieldLabel>
                  <Controller
                    control={control}
                    name="employee_id"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("form.selectEmployee")} />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem
                              key={employee.id}
                              value={employee.id}
                              className="cursor-pointer"
                            >
                              {employee.employee_code} - {employee.name}
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
              </div>
            )}

            {/* Overtime Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">
                  {t("form.overtimeDetails")}
                </h3>
              </div>

              {/* Date */}
              <Field>
                <FieldLabel>{t("fields.date")} *</FieldLabel>
                <Controller
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal cursor-pointer",
                            !field.value && "text-muted-foreground",
                          )}
                          disabled={isEditing}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("2024-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.date && <FieldError>{errors.date.message}</FieldError>}
              </Field>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>{t("fields.startTime")} *</FieldLabel>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      className="pl-9"
                      {...register("start_time")}
                    />
                  </div>
                  {errors.start_time && (
                    <FieldError>{errors.start_time.message}</FieldError>
                  )}
                </Field>

                <Field>
                  <FieldLabel>{t("fields.endTime")} *</FieldLabel>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      className="pl-9"
                      {...register("end_time")}
                    />
                  </div>
                  {errors.end_time && (
                    <FieldError>{errors.end_time.message}</FieldError>
                  )}
                </Field>
              </div>

              {/* Duration Display */}
              {calculateDuration() && (
                <div className="rounded-lg border bg-muted/50 p-3 text-center">
                  <span className="text-sm text-muted-foreground">
                    {t("fields.duration")}:{" "}
                  </span>
                  <span className="font-semibold">{calculateDuration()}</span>
                </div>
              )}
            </div>

            {/* Type and Reason Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">
                  {t("form.reasonAndNotes")}
                </h3>
              </div>

              {/* Type (only for new requests) */}
              {!isEditing && (
                <Field>
                  <FieldLabel>{t("fields.type")}</FieldLabel>
                  <Controller
                    control={control}
                    name="request_type"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="MANUAL_CLAIM"
                            className="cursor-pointer"
                          >
                            {t("types.MANUAL_CLAIM")}
                          </SelectItem>
                          <SelectItem
                            value="PRE_APPROVED"
                            className="cursor-pointer"
                          >
                            {t("types.PRE_APPROVED")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldDescription>
                    Manual claims require manager approval
                  </FieldDescription>
                  {errors.request_type && (
                    <FieldError>{errors.request_type.message}</FieldError>
                  )}
                </Field>
              )}

              {/* Reason */}
              <Field>
                <FieldLabel>{t("fields.reason")} *</FieldLabel>
                <Textarea
                  placeholder="Describe the reason for overtime work..."
                  className="resize-none min-h-[100px]"
                  {...register("reason")}
                />
                <FieldDescription>Minimum 10 characters</FieldDescription>
                {errors.reason && (
                  <FieldError>{errors.reason.message}</FieldError>
                )}
              </Field>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer"
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="cursor-pointer"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? tCommon("save") : t("actions.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
