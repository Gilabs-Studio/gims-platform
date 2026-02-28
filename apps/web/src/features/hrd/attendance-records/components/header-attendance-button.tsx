"use client";

import { useCallback } from "react";
import {
  CalendarDays,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Home,
  Briefcase,
  Plane,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarOff,
  Palmtree,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  useTodayAttendance,
  useClockIn,
  useClockOut,
} from "../hooks/use-attendance-records";
import type { CheckInType, TodayAttendance, AttendanceRecord } from "../types";
import { cn } from "@/lib/utils";

type AttendanceDrawerTab = "calendar" | "leave";

interface HeaderAttendanceButtonProps {
  readonly onOpenDrawer: (tab: AttendanceDrawerTab, openCreateLeave?: boolean) => void;
}

const CHECK_IN_TYPES: Array<{ value: CheckInType; icon: typeof Briefcase }> = [
  { value: "NORMAL", icon: Briefcase },
  { value: "WFH", icon: Home },
  { value: "FIELD_WORK", icon: MapPin },
];

function formatTime(value: string | null | undefined): string {
  if (!value) return "-";
  const part = value.split(" ")[1] ?? value;
  return part.substring(0, 5); // HH:mm
}

function getErrorMessage(err: unknown, fallback: string): string {
  const data =
    err && typeof err === "object" && "response" in err
      ? (
          err as {
            response?: { data?: { error?: { message?: string; details?: { message?: string } } } };
          }
        ).response?.data
      : undefined;
  const apiError = data?.error;
  if (!apiError) return fallback;
  const detailMessage =
    apiError.details && typeof apiError.details === "object" && "message" in apiError.details
      ? apiError.details.message
      : undefined;
  const msg = typeof detailMessage === "string" ? detailMessage : apiError.message;
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}

interface AttendanceVisual {
  icon: typeof Clock;
  label: string;
  /** Classes applied to the icon itself */
  iconClass: string;
  /** Classes applied to the pill button wrapper */
  pillClass: string;
}

function getAttendanceVisual(
  today: TodayAttendance | undefined,
  isLoading: boolean,
  t: ReturnType<typeof useTranslations<"hrd.attendance">>
): AttendanceVisual {
  if (isLoading || !today) {
    return {
      icon: Loader2,
      label: t("loading"),
      iconClass: "animate-spin text-muted-foreground",
      pillClass: "border-border text-foreground bg-transparent",
    };
  }
  if (today.is_holiday) {
    return {
      icon: Palmtree,
      label: today.holiday_info?.name ?? t("holiday"),
      iconClass: "text-muted-foreground",
      pillClass: "border-border text-foreground bg-transparent",
    };
  }
  if (!today.is_working_day) {
    return {
      icon: CalendarOff,
      label: t("offDay"),
      iconClass: "text-muted-foreground",
      pillClass: "border-border text-foreground bg-transparent",
    };
  }
  if (today.has_checked_out) {
    const time = formatTime((today.attendance_record as AttendanceRecord | null)?.check_out_time);
    return {
      icon: CheckCircle2,
      label: `${t("clockOut")} at ${time}`,
      iconClass: "text-emerald-500",
      pillClass: "border-border text-foreground bg-transparent",
    };
  }
  if (today.has_checked_in) {
    const time = formatTime((today.attendance_record as AttendanceRecord | null)?.check_in_time);
    return {
      icon: CheckCircle2,
      label: `${t("clockIn")} at ${time}`,
      iconClass: "text-blue-500",
      pillClass: "border-border text-foreground bg-transparent",
    };
  }
  // Working day, not checked in
  return {
    icon: AlertCircle,
    label: t("notClockedIn"),
    iconClass: "text-destructive",
    pillClass: "border-border text-foreground bg-transparent",
  };
}

export function HeaderAttendanceButton({ onOpenDrawer }: HeaderAttendanceButtonProps) {
  const t = useTranslations("hrd.attendance");
  const { data: todayData, isLoading } = useTodayAttendance();
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();

  const today = todayData?.data as TodayAttendance | undefined;
  const hasCheckedIn = today?.has_checked_in ?? false;
  const hasCheckedOut = today?.has_checked_out ?? false;
  const record = today?.attendance_record as AttendanceRecord | null | undefined;
  const isPending = clockInMutation.isPending || clockOutMutation.isPending;

  const visual = getAttendanceVisual(today, isLoading, t);
  const Icon = visual.icon;

  const statusLine = isLoading
    ? t("loading")
    : hasCheckedOut
      ? `${t("alreadyClockedOut")} ${formatTime(record?.check_out_time)}`
      : hasCheckedIn
        ? `${t("clockedIn")} ${formatTime(record?.check_in_time)}`
        : t("notClockedIn");

  const handleClockIn = useCallback(
    (checkInType: CheckInType) => {
      clockInMutation.mutate(
        { check_in_type: checkInType },
        {
          onSuccess: () => toast.success(t("messages.clockInSuccess")),
          onError: (err) => toast.error(getErrorMessage(err, t("messages.notClockedInYet"))),
        }
      );
    },
    [clockInMutation, t]
  );

  const handleClockOut = useCallback(() => {
    clockOutMutation.mutate(
      {},
      {
        onSuccess: () => toast.success(t("messages.clockOutSuccess")),
        onError: (err) => toast.error(getErrorMessage(err, t("messages.notClockedInYet"))),
      }
    );
  }, [clockOutMutation, t]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center h-8 rounded-full border px-3 gap-1.5 text-xs font-medium cursor-pointer select-none",
            visual.pillClass
          )}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Icon className={cn("h-3.5 w-3.5 shrink-0", visual.iconClass)} />
          )}
          <span className="hidden sm:block max-w-[120px] truncate">
            {visual.label}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t("today")}</DropdownMenuLabel>
        <div className="px-2 py-1 text-xs text-muted-foreground">{statusLine}</div>
        <DropdownMenuSeparator />

        {!hasCheckedIn ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              <span>{t("clockIn")}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {CHECK_IN_TYPES.map(({ value, icon: CheckInIcon }) => (
                <DropdownMenuItem
                  key={value}
                  className="cursor-pointer"
                  onClick={() => handleClockIn(value)}
                  disabled={isPending}
                >
                  <CheckInIcon className="h-4 w-4" />
                  <span>{t(`checkInType.${value}`)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuItem
            className="cursor-pointer"
            disabled={hasCheckedOut || isPending}
            onClick={handleClockOut}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span>{t("clockOut")}</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => onOpenDrawer("calendar")}
        >
          <CalendarDays className="h-4 w-4" />
          <span>{t("historyAction")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => onOpenDrawer("leave")}
        >
          <Plane className="h-4 w-4" />
          <span>{t("requestLeaveAction")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
