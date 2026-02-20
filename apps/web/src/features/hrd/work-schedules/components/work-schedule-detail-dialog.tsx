"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Clock, MapPin, Star, Calendar, Briefcase } from "lucide-react";
import type { WorkSchedule } from "../types";
import { DAY_LABELS } from "../schemas/work-schedule.schema";

interface WorkScheduleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: WorkSchedule | null;
}

export function WorkScheduleDetailDialog({
  open,
  onOpenChange,
  item,
}: WorkScheduleDetailDialogProps) {
  const t = useTranslations("hrd.workSchedule");
  const tCommon = useTranslations("common");

  if (!item) return null;

  const formatTime = (time: string) => {
    return time?.slice(0, 5) || "-";
  };

  const getWorkingDaysDisplay = (daysBitmask: number) => {
    const days: string[] = [];
    DAY_LABELS.forEach((day, index) => {
      const bit = 1 << index;
      if (daysBitmask & bit) {
        days.push(t(`days.${day.label}`));
      }
    });
    return days.join(", ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{item.name}</DialogTitle>
            {item.is_default && (
              <Badge variant="outline" className="gap-1">
                <Star className="h-3 w-3 fill-primary text-primary" />
                {t("default")}
              </Badge>
            )}
          </div>
          <DialogDescription>
            {item.description || t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Section */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={item.is_active ? "default" : "secondary"}>
              {item.is_active ? tCommon("active") : tCommon("inactive")}
            </Badge>
            {item.is_flexible && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Flexible
              </Badge>
            )}
            {item.require_gps && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                GPS
              </Badge>
            )}
            {item.division_name && (
              <Badge variant="outline" className="gap-1">
                <Briefcase className="h-3 w-3" />
                {item.division_name}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Work Hours Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {t("sections.workHours")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">
                  {t("fields.startTime")}
                </Label>
                <p className="font-mono text-lg">
                  {formatTime(item.start_time)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">
                  {t("fields.endTime")}
                </Label>
                <p className="font-mono text-lg">{formatTime(item.end_time)}</p>
              </div>
            </div>

            {item.is_flexible && (
              <div className="grid grid-cols-2 gap-4 pl-4 border-l-2">
                <div>
                  <Label className="text-muted-foreground text-xs">
                    {t("fields.flexibleStartTime")}
                  </Label>
                  <p className="font-mono">
                    {formatTime(item.flexible_start_time || "")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    {t("fields.flexibleEndTime")}
                  </Label>
                  <p className="font-mono">
                    {formatTime(item.flexible_end_time || "")}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Break Times Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Break Times</h3>
            {item.breaks?.map((breakItem, index) => (
              <div key={index} className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Break {index + 1} - Start
                  </Label>
                  <p className="font-mono">
                    {formatTime(breakItem.start_time)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Break {index + 1} - End
                  </Label>
                  <p className="font-mono">{formatTime(breakItem.end_time)}</p>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Working Days Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {t("sections.workingDays")}
            </h3>
            <div>
              <Label className="text-muted-foreground text-xs">
                {t("fields.workingDays")}
              </Label>
              <p className="mt-1">
                {item.working_days_display?.length > 0
                  ? item.working_days_display.join(", ")
                  : getWorkingDaysDisplay(item.working_days)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">
                {t("fields.workingHoursPerDay")}
              </Label>
              <p>{item.working_hours_per_day} hours</p>
            </div>
          </div>

          <Separator />

          {/* Tolerance Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t("sections.tolerance")}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">
                  {t("fields.lateTolerance")}
                </Label>
                <p>{item.late_tolerance_minutes} minutes</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">
                  {t("fields.earlyLeaveTolerance")}
                </Label>
                <p>{item.early_leave_tolerance_minutes} minutes</p>
              </div>
            </div>
          </div>

          {/* GPS Section */}
          {item.require_gps && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {t("sections.gpsSettings")}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      {t("fields.gpsRadius")}
                    </Label>
                    <p>{item.gps_radius_meter} meters</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      {t("fields.officeLatitude")}
                    </Label>
                    <p className="font-mono">{item.office_latitude}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      {t("fields.officeLongitude")}
                    </Label>
                    <p className="font-mono">{item.office_longitude}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
