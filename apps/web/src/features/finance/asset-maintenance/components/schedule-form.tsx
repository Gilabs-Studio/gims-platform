"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  useCreateMaintenanceSchedule,
  useUpdateMaintenanceSchedule,
  useMaintenanceFormData,
} from "../hooks/use-asset-maintenance";
import type { MaintenanceSchedule, MaintenanceScheduleType, MaintenanceFrequency } from "../types";

interface ScheduleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  schedule?: MaintenanceSchedule | null;
}

export function ScheduleForm({ open, onOpenChange, mode, schedule }: ScheduleFormProps) {
  const t = useTranslations("assetMaintenance");
  const createSchedule = useCreateMaintenanceSchedule();
  const updateSchedule = useUpdateMaintenanceSchedule();
  const { data: formDataResponse } = useMaintenanceFormData();

  const assets = formDataResponse?.data?.assets || [];
  const employees = formDataResponse?.data?.employees || [];

  const [formData, setFormData] = useState<{
    asset_id: string;
    schedule_type: MaintenanceScheduleType;
    frequency: MaintenanceFrequency;
    frequency_value: number;
    last_maintenance_date: Date | undefined;
    next_maintenance_date: Date | undefined;
    description: string;
    estimated_cost: number;
    assigned_to: string;
    is_active: boolean;
  }>({
    asset_id: "",
    schedule_type: "preventive",
    frequency: "monthly",
    frequency_value: 1,
    last_maintenance_date: undefined,
    next_maintenance_date: undefined,
    description: "",
    estimated_cost: 0,
    assigned_to: "",
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && mode === "edit" && schedule) {
      setFormData({
        asset_id: schedule.asset_id,
        schedule_type: schedule.schedule_type,
        frequency: schedule.frequency,
        frequency_value: schedule.frequency_value,
        last_maintenance_date: schedule.last_maintenance_date
          ? new Date(schedule.last_maintenance_date)
          : undefined,
        next_maintenance_date: schedule.next_maintenance_date
          ? new Date(schedule.next_maintenance_date)
          : undefined,
        description: schedule.description,
        estimated_cost: schedule.estimated_cost,
        assigned_to: schedule.assigned_to || "",
        is_active: schedule.is_active,
      });
    } else if (open && mode === "create") {
      setFormData({
        asset_id: "",
        schedule_type: "preventive",
        frequency: "monthly",
        frequency_value: 1,
        last_maintenance_date: undefined,
        next_maintenance_date: undefined,
        description: "",
        estimated_cost: 0,
        assigned_to: "",
        is_active: true,
      });
    }
    setErrors({});
  }, [open, mode, schedule]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.asset_id) newErrors.asset_id = t("validation.assetRequired");
    if (!formData.description) newErrors.description = t("validation.descriptionRequired");
    if (!formData.next_maintenance_date) newErrors.next_maintenance_date = t("validation.nextMaintenanceDateRequired");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      ...formData,
      estimated_cost: Number(formData.estimated_cost),
      frequency_value: Number(formData.frequency_value),
      assigned_to: formData.assigned_to || undefined,
      last_maintenance_date: formData.last_maintenance_date
        ? format(formData.last_maintenance_date, "yyyy-MM-dd")
        : undefined,
      next_maintenance_date: formData.next_maintenance_date
        ? format(formData.next_maintenance_date, "yyyy-MM-dd")
        : undefined,
    };

    if (mode === "edit" && schedule) {
      updateSchedule.mutate(
        { id: schedule.id, data },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createSchedule.mutate(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("schedules.create") : t("schedules.edit")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset_id">{t("schedules.form.asset")} *</Label>
            <Select
              value={formData.asset_id}
              onValueChange={(v) => setFormData({ ...formData, asset_id: v })}
            >
              <SelectTrigger id="asset_id" className={errors.asset_id ? "border-destructive" : ""}>
                <SelectValue placeholder={t("schedules.form.selectAsset")} />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.code} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.asset_id && <p className="text-sm text-destructive">{errors.asset_id}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="schedule_type">{t("schedules.form.scheduleType")}</Label>
              <Select
                value={formData.schedule_type}
                onValueChange={(v) => setFormData({ ...formData, schedule_type: v as MaintenanceScheduleType })}
              >
                <SelectTrigger id="schedule_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">{t("schedules.types.preventive")}</SelectItem>
                  <SelectItem value="corrective">{t("schedules.types.corrective")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to">{t("schedules.form.assignedTo")}</Label>
              <Select
                value={formData.assigned_to || "none"}
                onValueChange={(v) => setFormData({ ...formData, assigned_to: v === "none" ? "" : v })}
              >
                <SelectTrigger id="assigned_to">
                  <SelectValue placeholder={t("schedules.form.selectEmployee")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.unassigned")}</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.employee_code} - {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">{t("schedules.form.frequency")}</Label>
              <Select
                value={formData.frequency}
                onValueChange={(v) => setFormData({ ...formData, frequency: v as MaintenanceFrequency })}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("schedules.frequencies.daily")}</SelectItem>
                  <SelectItem value="weekly">{t("schedules.frequencies.weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("schedules.frequencies.monthly")}</SelectItem>
                  <SelectItem value="yearly">{t("schedules.frequencies.yearly")}</SelectItem>
                  <SelectItem value="custom">{t("schedules.frequencies.custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency_value">{t("schedules.form.frequencyValue")}</Label>
              <Input
                id="frequency_value"
                type="number"
                min={1}
                value={formData.frequency_value}
                onChange={(e) => setFormData({ ...formData, frequency_value: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("schedules.form.lastMaintenanceDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.last_maintenance_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.last_maintenance_date
                      ? format(formData.last_maintenance_date, "PPP")
                      : t("common.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.last_maintenance_date}
                    onSelect={(date) => setFormData({ ...formData, last_maintenance_date: date })}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t("schedules.form.nextMaintenanceDate")} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.next_maintenance_date && "text-muted-foreground",
                      errors.next_maintenance_date && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.next_maintenance_date
                      ? format(formData.next_maintenance_date, "PPP")
                      : t("common.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.next_maintenance_date}
                    onSelect={(date) => setFormData({ ...formData, next_maintenance_date: date })}
                  />
                </PopoverContent>
              </Popover>
              {errors.next_maintenance_date && (
                <p className="text-sm text-destructive">{errors.next_maintenance_date}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("schedules.form.description")} *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated_cost">{t("schedules.form.estimatedCost")}</Label>
            <Input
              id="estimated_cost"
              type="number"
              min={0}
              value={formData.estimated_cost}
              onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {mode === "edit" && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="is_active">{t("schedules.form.isActive")}</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createSchedule.isPending || updateSchedule.isPending}>
              {createSchedule.isPending || updateSchedule.isPending
                ? t("common.saving")
                : mode === "create"
                ? t("common.create")
                : t("common.update")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
