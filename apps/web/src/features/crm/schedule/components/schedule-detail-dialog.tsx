"use client";

import { Clock, User, MapPin, Calendar, ListTodo, Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Schedule } from "../types";

const STATUS_VARIANT_MAP: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  confirmed: "secondary",
  completed: "default",
  cancelled: "destructive",
};

interface ScheduleDetailDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly schedule: Schedule | null;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly label: string;
  readonly value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-all">{value}</p>
      </div>
    </div>
  );
}

export function ScheduleDetailDialog({
  open,
  onClose,
  schedule,
}: ScheduleDetailDialogProps) {
  const t = useTranslations("crmSchedule");

  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>{schedule.title}</DialogTitle>
            <Badge variant={STATUS_VARIANT_MAP[schedule.status] ?? "outline"}>
              {t(`statuses.${schedule.status}` as Parameters<typeof t>[0])}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          {schedule.description && (
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground mb-1">
                {t("form.description")}
              </p>
              <p className="text-sm whitespace-pre-wrap">
                {schedule.description}
              </p>
            </div>
          )}

          {/* Details */}
          <div className="space-y-1 divide-y">
            <InfoRow
              icon={User}
              label={t("table.employee")}
              value={schedule.employee?.name}
            />
            <InfoRow
              icon={Calendar}
              label={t("table.scheduledAt")}
              value={
                schedule.scheduled_at
                  ? formatDate(schedule.scheduled_at)
                  : null
              }
            />
            <InfoRow
              icon={Clock}
              label={t("table.endAt")}
              value={schedule.end_at ? formatDate(schedule.end_at) : null}
            />
            <InfoRow
              icon={MapPin}
              label={t("table.location")}
              value={schedule.location || null}
            />
            <InfoRow
              icon={ListTodo}
              label={t("table.task")}
              value={schedule.task?.title}
            />
            <InfoRow
              icon={Bell}
              label={t("form.reminderMinutes")}
              value={
                schedule.reminder_minutes_before
                  ? `${schedule.reminder_minutes_before} min`
                  : null
              }
            />
            <InfoRow
              icon={Clock}
              label={t("table.createdAt")}
              value={formatDate(schedule.created_at)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
