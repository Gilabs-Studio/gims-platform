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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Clock, MapPin, Plus, Trash2, Building2 } from "lucide-react";
import {
  workScheduleSchema,
  type WorkScheduleFormData,
  DAY_LABELS,
} from "../schemas/work-schedule.schema";
import {
  useCreateWorkSchedule,
  useUpdateWorkSchedule,
  useWorkScheduleFormData,
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

// Helper to calculate working hours from start and end time
const calculateWorkingHours = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 8;

  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  let diffMinutes = endMinutes - startMinutes;
  if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight shifts

  return Math.round((diffMinutes / 60) * 100) / 100;
};

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
  const { data: formDataResponse } = useWorkScheduleFormData();

  const divisions = formDataResponse?.data?.divisions ?? [];
  const companies = formDataResponse?.data?.companies ?? [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
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
      breaks: [{ start_time: "12:00", end_time: "13:00" }],
      working_days: 31,
      late_tolerance_minutes: 15,
      early_leave_tolerance_minutes: 0,
      require_gps: false,
      gps_radius_meter: 100,
      office_latitude: -6.2088,
      office_longitude: 106.8456,
      division_id: undefined,
      company_id: undefined,
    },
    mode: "onChange",
  });

  const isFlexible = watch("is_flexible");
  const requireGPS = watch("require_gps");
  const workingDays = watch("working_days");
  const breaks = watch("breaks");
  const startTime = watch("start_time");
  const endTime = watch("end_time");
  const selectedCompanyId = watch("company_id");

  // Auto-calculate working hours per day
  const workingHoursPerDay = useMemo(() => {
    return calculateWorkingHours(startTime, endTime);
  }, [startTime, endTime]);

  // Auto-populate coordinates when company is selected
  const selectedCompany = useMemo(() => {
    if (!selectedCompanyId) return null;
    return companies.find((c) => c.id === selectedCompanyId) ?? null;
  }, [selectedCompanyId, companies]);

  useEffect(() => {
    if (selectedCompany) {
      if (selectedCompany.latitude !== null) {
        setValue("office_latitude", selectedCompany.latitude);
      }
      if (selectedCompany.longitude !== null) {
        setValue("office_longitude", selectedCompany.longitude);
      }
    }
  }, [selectedCompany, setValue]);

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
        breaks:
          editingItem.breaks?.length > 0
            ? editingItem.breaks.map((b) => ({
                start_time: b.start_time?.substring(0, 5) || "12:00",
                end_time: b.end_time?.substring(0, 5) || "13:00",
              }))
            : [{ start_time: "12:00", end_time: "13:00" }],
        working_days: editingItem.working_days,
        late_tolerance_minutes: editingItem.late_tolerance_minutes,
        early_leave_tolerance_minutes:
          editingItem.early_leave_tolerance_minutes,
        require_gps: editingItem.require_gps,
        gps_radius_meter: editingItem.gps_radius_meter || 100,
        office_latitude: editingItem.office_latitude || -6.2088,
        office_longitude: editingItem.office_longitude || 106.8456,
        division_id: editingItem.division_id || undefined,
        company_id: undefined,
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
        breaks: [{ start_time: "12:00", end_time: "13:00" }],
        working_days: 31,
        late_tolerance_minutes: 15,
        early_leave_tolerance_minutes: 0,
        require_gps: false,
        gps_radius_meter: 100,
        office_latitude: -6.2088,
        office_longitude: 106.8456,
        division_id: undefined,
        company_id: undefined,
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

  const addBreak = () => {
    setValue("breaks", [...breaks, { start_time: "12:00", end_time: "13:00" }]);
  };

  const removeBreak = (index: number) => {
    const newBreaks = breaks.filter((_, i) => i !== index);
    setValue("breaks", newBreaks);
  };

  const updateBreak = (
    index: number,
    field: "start_time" | "end_time",
    value: string,
  ) => {
    const newBreaks = [...breaks];
    newBreaks[index][field] = value;
    setValue("breaks", newBreaks);
  };

  const onSubmit = async (data: WorkScheduleFormData) => {
    try {
      // If company is selected, use its coordinates
      let lat = data.office_latitude;
      let lng = data.office_longitude;
      if (data.company_id && selectedCompany) {
        lat = selectedCompany.latitude ?? data.office_latitude;
        lng = selectedCompany.longitude ?? data.office_longitude;
      }

      const payload = {
        name: data.name,
        description: data.description,
        start_time: data.start_time,
        end_time: data.end_time,
        is_flexible: data.is_flexible,
        flexible_start_time: data.flexible_start_time?.trim() || undefined,
        flexible_end_time: data.flexible_end_time?.trim() || undefined,
        breaks: data.breaks.map((b) => ({
          start_time: b.start_time,
          end_time: b.end_time,
        })),
        working_days: data.working_days,
        working_hours_per_day: workingHoursPerDay,
        late_tolerance_minutes: data.late_tolerance_minutes,
        early_leave_tolerance_minutes: data.early_leave_tolerance_minutes,
        require_gps: data.require_gps,
        gps_radius_meter: data.require_gps ? data.gps_radius_meter : undefined,
        office_latitude: data.require_gps ? lat : undefined,
        office_longitude: data.require_gps ? lng : undefined,
        division_id: data.division_id,
        is_default: false,
        is_active: true,
      };

      if (isEditing && editingItem) {
        const updatePayload = {
          name: data.name,
          description: data.description,
          start_time: data.start_time,
          end_time: data.end_time,
          is_flexible: data.is_flexible,
          flexible_start_time: data.flexible_start_time?.trim() || undefined,
          flexible_end_time: data.flexible_end_time?.trim() || undefined,
          breaks: data.breaks.map((b) => ({
            start_time: b.start_time,
            end_time: b.end_time,
          })),
          working_days: data.working_days,
          working_hours_per_day: workingHoursPerDay,
          late_tolerance_minutes: data.late_tolerance_minutes,
          early_leave_tolerance_minutes: data.early_leave_tolerance_minutes,
          require_gps: data.require_gps,
          gps_radius_meter: data.require_gps
            ? data.gps_radius_meter
            : undefined,
          office_latitude: data.require_gps ? lat : undefined,
          office_longitude: data.require_gps ? lng : undefined,
          division_id: data.division_id,
        };
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: updatePayload,
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

            {/* Division Selection */}
            <Field className="sm:col-span-2">
              <FieldLabel>{t("fields.division")}</FieldLabel>
              <Controller
                control={control}
                name="division_id"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(val) =>
                      field.onChange(val === "__none__" ? undefined : val)
                    }
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue
                        placeholder={t("placeholders.selectDivision")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="cursor-pointer">
                        {t("placeholders.allDivisions")}
                      </SelectItem>
                      {divisions.map((div) => (
                        <SelectItem
                          key={div.id}
                          value={div.id}
                          className="cursor-pointer"
                        >
                          {div.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldDescription>
                {t("descriptions.division")}
              </FieldDescription>
              {errors.division_id && (
                <FieldError>{errors.division_id.message}</FieldError>
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

            {/* Auto-calculated Working Hours */}
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {t("fields.workingHoursPerDay")}
                </span>
                <span className="font-medium">{workingHoursPerDay} hours</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically calculated from work hours
              </p>
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

          {/* Break Times */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Break Times</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBreak}
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Break
              </Button>
            </div>

            {breaks.map((breakItem, index) => (
              <div key={index} className="grid gap-4 sm:grid-cols-3 items-end">
                <Field>
                  <FieldLabel>Start Time</FieldLabel>
                  <Input
                    type="time"
                    value={breakItem.start_time}
                    onChange={(e) =>
                      updateBreak(index, "start_time", e.target.value)
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel>End Time</FieldLabel>
                  <Input
                    type="time"
                    value={breakItem.end_time}
                    onChange={(e) =>
                      updateBreak(index, "end_time", e.target.value)
                    }
                  />
                </Field>

                <div>
                  {breaks.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBreak(index)}
                      className="cursor-pointer text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
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
              <div className="space-y-4 pl-4 border-l-2">
                {/* GPS Radius */}
                <Field>
                  <FieldLabel>{t("fields.gpsRadius")}</FieldLabel>
                  <Input
                    type="number"
                    min={10}
                    {...register("gps_radius_meter", { valueAsNumber: true })}
                  />
                  <FieldDescription>meters</FieldDescription>
                </Field>

                {/* Company Selection for Coordinates */}
                <Field>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <FieldLabel>{t("fields.officeLocation")}</FieldLabel>
                  </div>
                  <Controller
                    control={control}
                    name="company_id"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(val) =>
                          field.onChange(val === "__none__" ? undefined : val)
                        }
                      >
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue
                            placeholder={t("placeholders.selectCompany")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="__none__"
                            className="cursor-pointer"
                          >
                            {t("placeholders.manualCoordinates")}
                          </SelectItem>
                          {companies.map((company) => (
                            <SelectItem
                              key={company.id}
                              value={company.id}
                              className="cursor-pointer"
                            >
                              {company.name}
                              {company.latitude !== null &&
                                company.longitude !== null && (
                                  <span className="text-muted-foreground ml-1">
                                    ({company.latitude.toFixed(4)},{" "}
                                    {company.longitude.toFixed(4)})
                                  </span>
                                )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldDescription>
                    {t("descriptions.officeLocation")}
                  </FieldDescription>
                  {errors.company_id && (
                    <FieldError>{errors.company_id.message}</FieldError>
                  )}
                </Field>

                {/* Show coordinates (auto-populated or editable) */}
                {selectedCompanyId ? (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">
                      {t("fields.coordinates")}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <span>
                        Lat: {selectedCompany?.latitude?.toFixed(6) ?? "-"}
                      </span>
                      <span>
                        Lng: {selectedCompany?.longitude?.toFixed(6) ?? "-"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>{t("fields.officeLatitude")}</FieldLabel>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-6.123456"
                        {...register("office_latitude", {
                          valueAsNumber: true,
                        })}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>{t("fields.officeLongitude")}</FieldLabel>
                      <Input
                        type="number"
                        step="any"
                        placeholder="106.123456"
                        {...register("office_longitude", {
                          valueAsNumber: true,
                        })}
                      />
                    </Field>
                  </div>
                )}
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
