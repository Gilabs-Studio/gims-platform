"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
import { Loader2, Clock, MapPin } from "lucide-react";
import {
  workScheduleSchema,
  type WorkScheduleFormData,
  DAY_LABELS,
} from "../schemas/work-schedule.schema";
import {
  useCreateWorkSchedule,
  useUpdateWorkSchedule,
} from "../hooks/use-work-schedules";
import type { WorkSchedule } from "../types";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

interface WorkScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: WorkSchedule | null;
}

export function WorkScheduleDialog({
  open,
  onOpenChange,
  editingItem,
}: WorkScheduleDialogProps) {
  const t = useTranslations("hrd.workSchedule");
  const tCommon = useTranslations("common");
  const isEditing = !!editingItem;

  const createMutation = useCreateWorkSchedule();
  const updateMutation = useUpdateWorkSchedule();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isValid, isDirty },
  } = useForm<WorkScheduleFormData>({
    resolver: zodResolver(workScheduleSchema),
    defaultValues: {
      name: "",
      description: "",
      start_time: "08:00",
      end_time: "17:00",
      is_flexible: false,
      flexible_start_time: "",
      flexible_end_time: "",
      break_start_time: "12:00",
      break_end_time: "13:00",
      break_duration: 60,
      working_days: 31,
      working_hours_per_day: 8,
      late_tolerance_minutes: 15,
      early_leave_tolerance_minutes: 0,
      require_gps: false,
      gps_radius_meter: 100,
      office_latitude: -6.2088,
      office_longitude: 106.8456,
      division_id: undefined,
    },
    mode: "onChange",
  });

  const isFlexible = watch("is_flexible");
  const requireGPS = watch("require_gps");
  const workingDays = watch("working_days");

  useEffect(() => {
    if (editingItem) {
      reset({
        name: editingItem.name,
        description: editingItem.description || "",
        start_time: editingItem.start_time.substring(0, 5),
        end_time: editingItem.end_time.substring(0, 5),
        is_flexible: editingItem.is_flexible,
        flexible_start_time:
          editingItem.flexible_start_time?.substring(0, 5) || "",
        flexible_end_time: editingItem.flexible_end_time?.substring(0, 5) || "",
        break_start_time: editingItem.break_start_time?.substring(0, 5) || "",
        break_end_time: editingItem.break_end_time?.substring(0, 5) || "",
        break_duration: editingItem.break_duration || 60,
        working_days: editingItem.working_days,
        working_hours_per_day: editingItem.working_hours_per_day,
        late_tolerance_minutes: editingItem.late_tolerance_minutes,
        early_leave_tolerance_minutes:
          editingItem.early_leave_tolerance_minutes,
        require_gps: editingItem.require_gps,
        gps_radius_meter: editingItem.gps_radius_meter || 200,
        office_latitude: editingItem.office_latitude,
        office_longitude: editingItem.office_longitude,
        division_id: editingItem.division_id,
      });
    } else {
      reset({
        name: "",
        description: "",
        start_time: "08:00",
        end_time: "17:00",
        is_flexible: false,
        flexible_start_time: "",
        flexible_end_time: "",
        break_start_time: "12:00",
        break_end_time: "13:00",
        break_duration: 60,
        working_days: 31,
        working_hours_per_day: 8,
        late_tolerance_minutes: 15,
        early_leave_tolerance_minutes: 0,
        require_gps: false,
        gps_radius_meter: 100,
        office_latitude: -6.2088,
        office_longitude: 106.8456,
        division_id: undefined,
      });
    }
  }, [editingItem, reset]);

  // Convert working days bitmask to array and vice versa
  const workingDaysArray = useMemo(() => {
    const days: number[] = [];
    DAY_LABELS.forEach((_, index) => {
      const bit = 1 << index;
      if (workingDays & bit) {
        days.push(index);
      }
    });
    return days;
  }, [workingDays]);

  const toggleDay = (dayIndex: number) => {
    const bit = 1 << dayIndex;
    const current = watch("working_days");
    const newValue = current & bit ? current & ~bit : current | bit;
    setValue("working_days", newValue);
  };

  const onSubmit = async (data: WorkScheduleFormData) => {
    try {
      const payload = {
        name: data.name,
        description: data.description,
        start_time: data.start_time,
        end_time: data.end_time,
        is_flexible: data.is_flexible,
        flexible_start_time: data.flexible_start_time?.trim() || undefined,
        flexible_end_time: data.flexible_end_time?.trim() || undefined,
        break_start_time: data.break_start_time?.trim() || undefined,
        break_end_time: data.break_end_time?.trim() || undefined,
        break_duration: data.break_duration,
        working_days: data.working_days,
        working_hours_per_day: data.working_hours_per_day,
        late_tolerance_minutes: data.late_tolerance_minutes,
        early_leave_tolerance_minutes: data.early_leave_tolerance_minutes,
        require_gps: data.require_gps,
        gps_radius_meter: data.gps_radius_meter,
        office_latitude: data.office_latitude,
        office_longitude: data.office_longitude,
        division_id: data.division_id,
        is_default: false,
        is_active: true,
      };

      if (isEditing && editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: payload,
        });
        toast.success(t("messages.updateSuccess"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("messages.createSuccess"));
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(tCommon("error"));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleFormSubmit = handleSubmit(onSubmit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("actions.edit") : t("actions.create")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel>{t("fields.name")} *</FieldLabel>
              <Input
                placeholder="e.g., Standard Office Hours"
                {...register("name")}
              />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel>{t("fields.description")}</FieldLabel>
              <Textarea
                placeholder="Optional description..."
                className="resize-none"
                {...register("description")}
              />
              {errors.description && (
                <FieldError>{errors.description.message}</FieldError>
              )}
            </Field>
          </div>

          <Separator />

          {/* Work Hours Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("sections.workHours")}</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t("fields.startTime")} *</FieldLabel>
                <Input type="time" {...register("start_time")} />
                {errors.start_time && (
                  <FieldError>{errors.start_time.message}</FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel>{t("fields.endTime")} *</FieldLabel>
                <Input type="time" {...register("end_time")} />
                {errors.end_time && (
                  <FieldError>{errors.end_time.message}</FieldError>
                )}
              </Field>
            </div>

            {/* Flexible Hours Toggle */}
            <Field orientation="horizontal">
              <div className="space-y-0.5">
                <FieldLabel>{t("fields.isFlexible")}</FieldLabel>
                <FieldDescription>
                  {t("descriptions.flexible")}
                </FieldDescription>
              </div>
              <Controller
                control={control}
                name="is_flexible"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="cursor-pointer"
                  />
                )}
              />
            </Field>

            {/* Flexible Time Range */}
            {isFlexible && (
              <div className="grid gap-4 sm:grid-cols-2 pl-4 border-l-2">
                <Field>
                  <FieldLabel>{t("fields.flexibleStartTime")}</FieldLabel>
                  <Input type="time" {...register("flexible_start_time")} />
                  {errors.flexible_start_time && (
                    <FieldError>
                      {errors.flexible_start_time.message}
                    </FieldError>
                  )}
                </Field>

                <Field>
                  <FieldLabel>{t("fields.flexibleEndTime")}</FieldLabel>
                  <Input type="time" {...register("flexible_end_time")} />
                  {errors.flexible_end_time && (
                    <FieldError>{errors.flexible_end_time.message}</FieldError>
                  )}
                </Field>
              </div>
            )}
          </div>

          <Separator />

          {/* Break Time */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">{t("sections.breakTime")}</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>{t("fields.breakStartTime")}</FieldLabel>
                <Input type="time" {...register("break_start_time")} />
              </Field>

              <Field>
                <FieldLabel>{t("fields.breakEndTime")}</FieldLabel>
                <Input type="time" {...register("break_end_time")} />
              </Field>

              <Field>
                <FieldLabel>{t("fields.breakDuration")}</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  {...register("break_duration", { valueAsNumber: true })}
                />
                <FieldDescription>minutes</FieldDescription>
              </Field>
            </div>
          </div>

          <Separator />

          {/* Working Days */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">{t("sections.workingDays")}</h3>
            <div className="flex flex-wrap gap-4">
              {DAY_LABELS.map((day, index) => (
                <div key={day.label} className="flex items-center gap-2">
                  <Checkbox
                    id={`day-${index}`}
                    checked={workingDaysArray.includes(index)}
                    onCheckedChange={() => toggleDay(index)}
                    className="cursor-pointer"
                  />
                  <Label
                    htmlFor={`day-${index}`}
                    className="cursor-pointer text-sm"
                  >
                    {t(`days.${day.label}`)}
                  </Label>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t("fields.workingHoursPerDay")}</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  {...register("working_hours_per_day", {
                    valueAsNumber: true,
                  })}
                />
              </Field>
            </div>
          </div>

          <Separator />

          {/* Tolerance Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">{t("sections.tolerance")}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t("fields.lateTolerance")}</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  {...register("late_tolerance_minutes", {
                    valueAsNumber: true,
                  })}
                />
                <FieldDescription>minutes</FieldDescription>
              </Field>

              <Field>
                <FieldLabel>{t("fields.earlyLeaveTolerance")}</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  {...register("early_leave_tolerance_minutes", {
                    valueAsNumber: true,
                  })}
                />
                <FieldDescription>minutes</FieldDescription>
              </Field>
            </div>
          </div>

          <Separator />

          {/* GPS Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">
                {t("sections.gpsSettings")}
              </h3>
            </div>

            <Field orientation="horizontal">
              <div className="space-y-0.5">
                <FieldLabel>{t("fields.requireGPS")}</FieldLabel>
                <FieldDescription>{t("descriptions.gps")}</FieldDescription>
              </div>
              <Controller
                control={control}
                name="require_gps"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="cursor-pointer"
                  />
                )}
              />
            </Field>

            {requireGPS && (
              <div className="grid gap-4 sm:grid-cols-3 pl-4 border-l-2">
                <Field>
                  <FieldLabel>{t("fields.gpsRadius")}</FieldLabel>
                  <Input
                    type="number"
                    min={10}
                    {...register("gps_radius_meter", { valueAsNumber: true })}
                  />
                  <FieldDescription>meters</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>{t("fields.officeLatitude")}</FieldLabel>
                  <Input
                    type="number"
                    step="any"
                    placeholder="-6.123456"
                    {...register("office_latitude", { valueAsNumber: true })}
                  />
                </Field>

                <Field>
                  <FieldLabel>{t("fields.officeLongitude")}</FieldLabel>
                  <Input
                    type="number"
                    step="any"
                    placeholder="106.123456"
                    {...register("office_longitude", { valueAsNumber: true })}
                  />
                </Field>
              </div>
            )}
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
              {isEditing ? tCommon("save") : tCommon("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
