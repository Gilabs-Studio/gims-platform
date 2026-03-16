"use client";

import { useCallback, useState } from "react";
import { LocationSettingsDialog } from "./location-settings-dialog";
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
  MapPinOff,
  Navigation,
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
import { ClockInLateReasonDialog } from "./clock-in-late-reason-dialog";
import { ClockInCameraDialog } from "./clock-in-camera-dialog";
import { useLocationPermission } from "../hooks/use-location-permission";
import { useGeolocation, calculateDistance } from "../hooks/use-geolocation";

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
      iconClass: "text-success",
      pillClass: "border-border text-foreground bg-transparent",
    };
  }
  if (today.has_checked_in) {
    const time = formatTime((today.attendance_record as AttendanceRecord | null)?.check_in_time);
    return {
      icon: CheckCircle2,
      label: `${t("clockIn")} at ${time}`,
      iconClass: "text-primary",
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
  const { isDenied, isPrompt, requestPermission, requestPermissionOrFallback } = useLocationPermission();
  const geo = useGeolocation();

  const today = todayData?.data as TodayAttendance | undefined;
  const hasCheckedIn = today?.has_checked_in ?? false;
  const hasCheckedOut = today?.has_checked_out ?? false;
  const record = today?.attendance_record as AttendanceRecord | null | undefined;
  const isPending = clockInMutation.isPending || clockOutMutation.isPending;
  const ws = today?.work_schedule;

  // Proximity calculation
  const proximityInfo = (() => {
    if (!ws?.require_gps || !ws.office_latitude || !ws.office_longitude) return null;
    if (!geo.hasLocation) return null;
    const distance = calculateDistance(
      geo.latitude!,
      geo.longitude!,
      ws.office_latitude,
      ws.office_longitude
    );
    const isAtOffice = distance <= (ws.gps_radius_meter ?? 100);
    return { distance: Math.round(distance), isAtOffice };
  })();

  // Dialog state for late reason and camera
  const [pendingClockInType, setPendingClockInType] = useState<CheckInType | null>(null);
  const [showLateReasonDialog, setShowLateReasonDialog] = useState(false);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState(false);

  // WHY: Block attendance actions on holidays and off-days to prevent invalid records
  const isHolidayOrOffDay = today?.is_holiday || !today?.is_working_day;
  const blockReason = today?.is_holiday
    ? (today.holiday_info?.name ?? t("holiday"))
    : !today?.is_working_day
      ? t("offDay")
      : null;

  const visual = getAttendanceVisual(today, isLoading, t);
  const Icon = visual.icon;

  const statusLine = isLoading
    ? t("loading")
    : hasCheckedOut
      ? `${t("alreadyClockedOut")} ${formatTime(record?.check_out_time)}`
      : hasCheckedIn
        ? `${t("clockedIn")} ${formatTime(record?.check_in_time)}`
        : t("notClockedIn");

  // WHY: Always send lat/lng for all check-in types (NORMAL for validation, WFH/FIELD_WORK for tracking)
  const executeClockIn = useCallback(
    async (checkInType: CheckInType, lateReason?: string, photoUrl?: string) => {
      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        const pos = await geo.getCurrentPosition();
        latitude = pos.latitude;
        longitude = pos.longitude;
      } catch {
        // If location fails for NORMAL type with GPS required, let the backend reject it
      }

      clockInMutation.mutate(
        {
          check_in_type: checkInType,
          ...(latitude !== undefined ? { latitude } : {}),
          ...(longitude !== undefined ? { longitude } : {}),
          ...(lateReason ? { late_reason: lateReason } : {}),
          ...(photoUrl ? { photo_url: photoUrl } : {}),
        },
        {
          onSuccess: () => {
            toast.success(t("messages.clockInSuccess"));
            setPendingClockInType(null);
          },
          onError: (err) => toast.error(getErrorMessage(err, t("messages.notClockedInYet"))),
        }
      );
    },
    [clockInMutation, geo, t]
  );

  // WHY: Intercept clock-in to check if late (NORMAL → show reason dialog)
  // or WFH/FIELD_WORK (show camera dialog for photo proof)
  const handleClockIn = useCallback(
    (checkInType: CheckInType) => {
      if (checkInType === "WFH" || checkInType === "FIELD_WORK") {
        setPendingClockInType(checkInType);
        setShowCameraDialog(true);
        return;
      }

      // NORMAL type: check if late
      if (checkInType === "NORMAL" && today?.is_late) {
        setPendingClockInType(checkInType);
        setShowLateReasonDialog(true);
        return;
      }

      // Not late, clock in directly
      executeClockIn(checkInType);
    },
    [today?.is_late, executeClockIn, setPendingClockInType, setShowCameraDialog, setShowLateReasonDialog]
  );

  const handleLateReasonConfirm = useCallback(
    (reason: string) => {
      if (pendingClockInType) {
        executeClockIn(pendingClockInType, reason);
      }
      setShowLateReasonDialog(false);
    },
    [pendingClockInType, executeClockIn, setShowLateReasonDialog]
  );

  const handleCameraConfirm = useCallback(
    (photoUrl: string) => {
      if (pendingClockInType) {
        executeClockIn(pendingClockInType, undefined, photoUrl);
      }
      setShowCameraDialog(false);
    },
    [pendingClockInType, executeClockIn, setShowCameraDialog]
  );

  const handleClockOut = useCallback(async () => {
    let latitude: number | undefined;
    let longitude: number | undefined;

    try {
      const pos = await geo.getCurrentPosition();
      latitude = pos.latitude;
      longitude = pos.longitude;
    } catch {
      // Location unavailable — proceed without, backend decides
    }

    clockOutMutation.mutate(
      {
        ...(latitude !== undefined ? { latitude } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
      },
      {
        onSuccess: () => toast.success(t("messages.clockOutSuccess")),
        onError: (err) => toast.error(getErrorMessage(err, t("messages.notClockedInYet"))),
      }
    );
  }, [clockOutMutation, geo, t]);

  return (
    <>
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

        {/* Location permission denied alert */}
        {isDenied && (
          <div className="mx-2 my-1 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-2 text-xs text-destructive">
            <MapPinOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{t("location.permissionDenied")}</p>
              <p className="mt-0.5 text-muted-foreground">{t("location.enableInSettings")}</p>
            </div>
          </div>
        )}

        {/* Location permission prompt alert */}
        {isPrompt && (
          <div className="mx-2 my-1 flex items-center gap-2 rounded-md border border-amber-500/50 bg-warning/5 p-2 text-xs text-warning dark:text-warning">
            <Navigation className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">{t("location.permissionPrompt")}</span>
            <button
              type="button"
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-warning/10 hover:bg-warning/20 cursor-pointer"
              onClick={requestPermission}
            >
              {t("location.enable")}
            </button>
          </div>
        )}

        {/* Office proximity status */}
        {proximityInfo && !hasCheckedOut && (
          <div className="mx-2 my-1 flex items-center gap-1.5 text-xs">
            <MapPin className={cn("h-3.5 w-3.5", proximityInfo.isAtOffice ? "text-success" : "text-warning")} />
            <span className={cn(proximityInfo.isAtOffice ? "text-success dark:text-success" : "text-warning dark:text-warning")}>
              {proximityInfo.isAtOffice
                ? t("location.atOffice")
                : t("location.notAtOffice", { distance: proximityInfo.distance })}
            </span>
          </div>
        )}

        <DropdownMenuSeparator />

        {!hasCheckedIn ? (
          isHolidayOrOffDay ? (
            <DropdownMenuItem disabled className="opacity-50">
              <LogIn className="h-4 w-4" />
              <span>{t("clockIn")} — {blockReason}</span>
            </DropdownMenuItem>
          ) : isDenied ? (
            <DropdownMenuItem disabled className="opacity-50">
              <LogIn className="h-4 w-4" />
              <span>{t("clockIn")} — {t("location.denied")}</span>
            </DropdownMenuItem>
          ) : (
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
          )
        ) : (
          <DropdownMenuItem
            className="cursor-pointer"
            disabled={hasCheckedOut || isPending || !!isHolidayOrOffDay || isDenied}
            onClick={handleClockOut}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span>
              {t("clockOut")}
              {isHolidayOrOffDay && hasCheckedIn ? ` — ${blockReason}` : ""}
              {isDenied && hasCheckedIn && !isHolidayOrOffDay ? ` — ${t("location.denied")}` : ""}
            </span>
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

        {/* Re-request location permission button */}
        {(isDenied || isPrompt) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-warning dark:text-warning"
              onSelect={(e) => {
                // WHY: preventDefault keeps the dropdown open so the
                // browser's geolocation popup can appear on top of it.
                // Without this, Radix closes the menu and the popup
                // is swallowed / never shown.
                e.preventDefault();
                // Try the native browser popup first. If the browser
                // has remembered a "deny" and won't show the popup,
                // open the instructions dialog as a fallback.
                requestPermissionOrFallback(() => setShowLocationSettings(true));
              }}
            >
              <Navigation className="h-4 w-4" />
              <span>{isDenied ? t("location.openSettings") : t("location.requestPermission")}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

    <ClockInLateReasonDialog
      open={showLateReasonDialog}
      onOpenChange={setShowLateReasonDialog}
      lateMinutes={today?.late_minutes ?? 0}
      isPending={clockInMutation.isPending}
      onConfirm={handleLateReasonConfirm}
    />

    <ClockInCameraDialog
      open={showCameraDialog}
      onOpenChange={setShowCameraDialog}
      checkInType={pendingClockInType ?? "WFH"}
      isPending={clockInMutation.isPending}
      onConfirm={handleCameraConfirm}
    />

    <LocationSettingsDialog
      open={showLocationSettings}
      onOpenChange={setShowLocationSettings}
    />
    </>
  );
}
