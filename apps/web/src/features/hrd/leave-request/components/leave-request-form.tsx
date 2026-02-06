"use client";
"use no memo";

/* eslint-disable react-hooks/incompatible-library */

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, CalendarIcon } from "lucide-react";
import { getCreateLeaveRequestSchema, getUpdateLeaveRequestSchema } from "../schemas/leave-request.schema";
import type { CreateLeaveRequestFormData, UpdateLeaveRequestFormData } from "../schemas/leave-request.schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatDate } from "@/lib/utils";
import { useCreateLeaveRequest, useUpdateLeaveRequest, useLeaveRequest, useLeaveFormData } from "../hooks/use-leave-requests";
import type { LeaveRequest, LeaveRequestDetail, LeaveDuration } from "../types";
import { toast } from "sonner";
import { ButtonLoading } from "@/components/loading";
import { differenceInDays, format, isBefore, startOfDay } from "date-fns";

const STORAGE_KEY = "leave_request_form_cache";

interface LeaveRequestFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly leaveRequest?: LeaveRequest | LeaveRequestDetail | null;
}

export function LeaveRequestForm({ open, onClose, leaveRequest }: LeaveRequestFormProps) {
  const isEdit = !!leaveRequest;
  const t = useTranslations("leaveRequest");
  const createLeaveRequest = useCreateLeaveRequest();
  const updateLeaveRequest = useUpdateLeaveRequest();
  const [isFormReady, setIsFormReady] = useState(false);

  // Fetch form lookup data FIRST - always refetch when form opens to ensure fresh data
  const { data: formData, isLoading: isLoadingFormData, isSuccess: isFormDataLoaded } = useLeaveFormData({ enabled: open });
  const leaveTypes = useMemo(() => formData?.data?.leave_types ?? [], [formData?.data?.leave_types]);
  const employees = useMemo(() => formData?.data?.employees ?? [], [formData?.data?.employees]);

  // Fetch full leave request data when editing - ONLY AFTER form data is loaded
  const { data: fullLeaveRequestData, isLoading: isLoadingLeaveRequest } = useLeaveRequest(
    leaveRequest?.id ?? "",
    { enabled: open && isEdit && !!leaveRequest?.id && isFormDataLoaded }
  );

  const schema = isEdit ? getUpdateLeaveRequestSchema(t) : getCreateLeaveRequestSchema(t);
  
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateLeaveRequestFormData | UpdateLeaveRequestFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      employee_id: "",
      leave_type_id: "",
      start_date: new Date(),
      end_date: new Date(),
      duration: "FULL_DAY" as LeaveDuration,
      reason: "",
    },
  });

  const startDate = watch("start_date");
  const endDate = watch("end_date");
  const duration = watch("duration");

  // Auto-adjust duration when dates change
  useEffect(() => {
    if (!startDate || !endDate) return;

    const isSameDate = startDate.toDateString() === endDate.toDateString();

    if (isSameDate) {
      // If dates are same and duration is MULTI_DAY, change to FULL_DAY
      if (duration === "MULTI_DAY") {
        setValue("duration", "FULL_DAY");
      }
      // Keep FULL_DAY or HALF_DAY as is
    } else {
      // If dates are different, always set to MULTI_DAY
      setValue("duration", "MULTI_DAY");
    }
  }, [startDate, endDate, duration, setValue]);

  // Calculate total days based on duration
  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;

    const isSameDate = startDate.toDateString() === endDate.toDateString();

    if (duration === "HALF_DAY") {
      return 0.5;
    }

    if (duration === "FULL_DAY" && isSameDate) {
      return 1;
    }

    if (duration === "MULTI_DAY") {
      return Math.max(0, differenceInDays(endDate, startDate) + 1);
    }

    // Fallback
    return Math.max(0, differenceInDays(endDate, startDate) + 1);
  }, [startDate, endDate, duration]);

  // Reset form when leave request data changes (for edit mode)
  useEffect(() => {
    if (!open) {
      // Clear cache and reset form to defaults when dialog closes
      localStorage.removeItem(STORAGE_KEY);
      setIsFormReady(false);
      reset({
        employee_id: "",
        leave_type_id: "",
        start_date: new Date(),
        end_date: new Date(),
        duration: "FULL_DAY" as LeaveDuration,
        reason: "",
      });
      return;
    }

    if (isEdit) {
      // Wait for ALL data to be loaded before populating form
      const hasFullLeaveData = fullLeaveRequestData?.data;
      const hasFormData = leaveTypes.length > 0 && employees.length > 0;
      const isDataLoading = isLoadingLeaveRequest || isLoadingFormData;

      if (hasFullLeaveData && hasFormData && !isDataLoading) {
        const data = fullLeaveRequestData.data;
        
        // API returns nested objects 'employee' and 'leave_type', not direct IDs
        const employeeId = data.employee?.id;
        const leaveTypeId = data.leave_type?.id;
        
        // Populate form with fetched data
        reset({
          employee_id: employeeId || "",
          leave_type_id: leaveTypeId || "",
          start_date: new Date(data.start_date),
          end_date: new Date(data.end_date),
          duration: data.duration as LeaveDuration,
          reason: data.reason,
        });
        
        // Mark form as ready to render
        setIsFormReady(true);
      } else {
        // Data not ready yet, keep form not ready
        setIsFormReady(false);
      }
      return;
    }

    // For create mode: load from localStorage or use defaults
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsedData = JSON.parse(cached);
        reset({
          employee_id: parsedData.employee_id || "",
          ...parsedData,
          start_date: parsedData.start_date ? new Date(parsedData.start_date) : new Date(),
          end_date: parsedData.end_date ? new Date(parsedData.end_date) : new Date(),
          duration: parsedData.duration || "FULL_DAY",
        });
      } catch {
        reset({
          employee_id: "",
          leave_type_id: "",
          start_date: new Date(),
          end_date: new Date(),
          duration: "FULL_DAY" as LeaveDuration,
          reason: "",
        });
      }
    } else {
      // No cached data, reset to defaults
      reset({
        employee_id: "",
        leave_type_id: "",
        start_date: new Date(),
        end_date: new Date(),
        duration: "FULL_DAY" as LeaveDuration,
        reason: "",
      });
    }
    
    // Mark form as ready for create mode
    setIsFormReady(true);
  }, [open, isEdit, fullLeaveRequestData, leaveTypes, employees, isLoadingLeaveRequest, isLoadingFormData, reset]);

  // Auto-save to localStorage on form changes (create mode only)
  useEffect(() => {
    if (!isEdit && open) {
      const saveToLocalStorage = (data: CreateLeaveRequestFormData | UpdateLeaveRequestFormData) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ...data,
          start_date: (data.start_date as Date).toISOString(),
          end_date: (data.end_date as Date).toISOString(),
        }));
      };
      
      const subscription = watch((data) => {
        saveToLocalStorage(data as CreateLeaveRequestFormData);
      });
      return () => subscription.unsubscribe();
    }
  }, [watch, isEdit, open]);

  const onSubmit = async (data: CreateLeaveRequestFormData | UpdateLeaveRequestFormData) => {
    try {
      const payload = {
        leave_type_id: data.leave_type_id,
        start_date: format(data.start_date, "yyyy-MM-dd"),
        end_date: format(data.end_date, "yyyy-MM-dd"),
        duration: data.duration,
        reason: data.reason,
      };

      if (isEdit && leaveRequest) {
        await updateLeaveRequest.mutateAsync({
          id: leaveRequest.id,
          data: payload,
        });
        toast.success(t("messages.updateSuccess"));
      } else {
        await createLeaveRequest.mutateAsync({
          ...payload,
          employee_id: (data as CreateLeaveRequestFormData).employee_id,
        });
        toast.success(t("messages.createSuccess"));
        localStorage.removeItem(STORAGE_KEY);
      }
      // Reset form and close dialog
      reset({
        employee_id: "",
        leave_type_id: "",
        start_date: new Date(),
        end_date: new Date(),
        duration: "FULL_DAY" as LeaveDuration,
        reason: "",
      });
      onClose();
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error as {response?: {data?: {message?: string}}}).response?.data?.message
        : undefined;
      toast.error(
        errorMessage || (isEdit ? t("messages.updateError") : t("messages.createError"))
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("edit") : t("add")}</DialogTitle>
        </DialogHeader>

        {isLoadingLeaveRequest || isLoadingFormData || (isEdit && !isFormReady) ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              {isEdit ? t("messages.loadingEditData") : t("messages.loadingFormData")}
            </span>
          </div>
        ) : (
          <form key={leaveRequest?.id || "new"} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field>
              <FieldLabel>{t("form.employee.label")} *</FieldLabel>
              <Controller
                name="employee_id"
                control={control}
                render={({ field }) => (
                  <Select 
                    key={`employee-${field.value || 'empty'}`} 
                    value={field.value} 
                    onValueChange={field.onChange} 
                    disabled={isEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("form.employee.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.employee_code} - {employee.name}{" "}
                          ({employee.remaining_balance ?? 0} {t("form.employee.daysRemaining")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError>{"employee_id" in errors ? errors.employee_id?.message : undefined}</FieldError>
            </Field>

            <Field>
              <FieldLabel>{t("form.leaveType.label")} *</FieldLabel>
              <Controller
                name="leave_type_id"
                control={control}
                render={({ field }) => (
                  <Select 
                    key={`leavetype-${field.value || 'empty'}`} 
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("form.leaveType.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((leaveType) => (
                        <SelectItem key={leaveType.id} value={leaveType.id}>
                          {leaveType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError>{errors.leave_type_id?.message}</FieldError>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>{t("form.startDate.label")} *</FieldLabel>
                <Controller
                  name="start_date"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal cursor-pointer",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? formatDate(field.value.toISOString()) : t("form.startDate.placeholder")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date: Date | undefined) => date && field.onChange(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                <FieldError>{errors.start_date?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel>{t("form.endDate.label")} *</FieldLabel>
                <Controller
                  name="end_date"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal cursor-pointer",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? formatDate(field.value.toISOString()) : t("form.endDate.placeholder")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date: Date | undefined) => date && field.onChange(date)}
                          initialFocus
                          disabled={(date) => startDate ? isBefore(startOfDay(date), startOfDay(startDate)) : false}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                <FieldError>{errors.end_date?.message}</FieldError>
              </Field>
            </div>

            <Field>
              <div className="flex items-center space-x-2">
                <Controller
                  name="duration"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      id="half-day"
                      checked={field.value === "HALF_DAY"}
                      onChange={(e) => {
                        if (e.target.checked) {
                          field.onChange("HALF_DAY");
                        } else {
                          const isSameDate = startDate?.toDateString() === endDate?.toDateString();
                          field.onChange(isSameDate ? "FULL_DAY" : "MULTI_DAY");
                        }
                      }}
                      disabled={startDate?.toDateString() !== endDate?.toDateString()}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  )}
                />
                <label htmlFor="half-day" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                  {t("form.duration.halfDay")}
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t("form.duration.description")}</p>
              <FieldError>{errors.duration?.message}</FieldError>
            </Field>

            {totalDays > 0 && (
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-sm font-medium">
                  {t("form.daysRequested")}: <span className="text-primary">{totalDays} {t("days")}</span>
                </p>
              </div>
            )}

            <Field>
              <FieldLabel>{t("form.reason.label")} *</FieldLabel>
              <Textarea
                {...register("reason")}
                placeholder={t("form.reason.placeholder")}
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">{t("form.reason.description")}</p>
              <FieldError>{errors.reason?.message}</FieldError>
            </Field>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {t("actions.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createLeaveRequest.isPending || updateLeaveRequest.isPending}
              >
                {(createLeaveRequest.isPending || updateLeaveRequest.isPending) ? (
                  <ButtonLoading loading>{t("actions.submit")}</ButtonLoading>
                ) : (
                  t("actions.submit")
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
