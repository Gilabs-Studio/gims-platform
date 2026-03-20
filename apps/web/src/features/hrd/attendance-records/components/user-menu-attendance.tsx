"use client";

import { useCallback, useState } from "react";
import { Clock, Loader2, MapPin, Home, Briefcase, MapPinOff, Navigation } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  useTodayAttendance,
  useClockIn,
  useClockOut,
} from "../hooks/use-attendance-records";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CheckInType, TodayAttendance } from "../types";
import { cn } from "@/lib/utils";
import { ClockInLateReasonDialog } from "./clock-in-late-reason-dialog";
import { ClockInCameraDialog } from "./clock-in-camera-dialog";
import { useLocationPermission } from "../hooks/use-location-permission";
import { useGeolocation, calculateDistance } from "../hooks/use-geolocation";

const CHECK_IN_TYPES: { value: CheckInType; icon: typeof Home }[] = [
  { value: "NORMAL", icon: Briefcase },
  { value: "WFH", icon: Home },
  { value: "FIELD_WORK", icon: MapPin },
];

function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const part = value.split(" ")[1] ?? value;
  return part.substring(0, 8);
}

/** Get user-facing message from API error: prefer error.details.message, then error.message. */
function getErrorMessage(
  err: unknown,
  fallback: string
): string {
  const data = err && typeof err === "object" && "response" in err
    ? (err as { response?: { data?: { error?: { message?: string; details?: { message?: string } } } } }).response?.data
    : undefined;
  const error = data?.error;
  if (!error) return fallback;
  const detailsMessage = error.details && typeof error.details === "object" && "message" in error.details
    ? error.details.message
    : undefined;
  const msg = typeof detailsMessage === "string" ? detailsMessage : error.message;
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}

/** Get success message from API response data if present. */
function getSuccessMessage(
  data: unknown,
  fallback: string
): string {
  if (data && typeof data === "object" && "message" in data) {
    const m = (data as { message?: string }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fallback;
}

export function UserMenuAttendance() {
  const t = useTranslations("hrd.attendance");
  const { data: todayData, isLoading } = useTodayAttendance();
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();
  const { isDenied, isPrompt, requestPermission } = useLocationPermission();
  const geo = useGeolocation();

  const today = todayData?.data as TodayAttendance | undefined;
  const hasCheckedIn = today?.has_checked_in ?? false;
  const hasCheckedOut = today?.has_checked_out ?? false;
  const record = today?.attendance_record;
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

  // WHY: Always send lat/lng for all check-in types
  const executeClockIn = useCallback(
    async (checkInType: CheckInType, lateReason?: string, photoUrl?: string) => {
      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        const pos = await geo.getCurrentPosition();
        latitude = pos.latitude;
        longitude = pos.longitude;
      } catch {
        // Let backend decide if GPS is required
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
          onSuccess: (responseData) => {
            const msg = getSuccessMessage(
              responseData,
              t("messages.clockInSuccess")
            );
            toast.success(msg);
            setPendingClockInType(null);
          },
          onError: (err) => {
            const msg = getErrorMessage(err, t("messages.notClockedInYet"));
            toast.error(msg);
          },
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
        onSuccess: (responseData) => {
          const msg = getSuccessMessage(
            responseData,
            t("messages.clockOutSuccess")
          );
          toast.success(msg);
        },
        onError: (err) => {
          const msg = getErrorMessage(err, t("messages.notClockedInYet"));
          toast.error(msg);
        },
      }
    );
  }, [clockOutMutation, geo, t]);

  const isPending = clockInMutation.isPending || clockOutMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span>{t("loading")}</span>
      </div>
    );
  }

  const statusLine = hasCheckedOut
    ? t("alreadyClockedOut") + " " + formatTime(record?.check_out_time)
    : hasCheckedIn
      ? t("clockedIn") + " " + formatTime(record?.check_in_time)
      : t("notClockedIn");

  return (
    <>
    <div className="flex flex-col gap-1.5 px-1 py-1">
      <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{statusLine}</span>
      </div>

      {/* Location permission denied alert */}
      {isDenied && (
        <div className="mx-1 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-2 text-xs text-destructive">
          <MapPinOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{t("location.permissionDenied")}</p>
            <p className="mt-0.5 text-muted-foreground">{t("location.enableInSettings")}</p>
          </div>
        </div>
      )}

      {/* Location permission prompt alert */}
      {isPrompt && (
        <div className="mx-1 flex items-center gap-2 rounded-md border border-amber-500/50 bg-warning/5 p-2 text-xs text-warning dark:text-warning">
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
        <div className="mx-2 flex items-center gap-1.5 text-xs">
          <MapPin className={cn("h-3.5 w-3.5", proximityInfo.isAtOffice ? "text-success" : "text-warning")} />
          <span className={cn(proximityInfo.isAtOffice ? "text-success dark:text-success" : "text-warning dark:text-warning")}>
            {proximityInfo.isAtOffice
              ? t("location.atOffice")
              : t("location.notAtOffice", { distance: proximityInfo.distance })}
          </span>
        </div>
      )}

      <div className="flex gap-1">
        {!hasCheckedIn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 flex-1 cursor-pointer text-xs"
                disabled={isPending || isDenied}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  t("clockIn")
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {CHECK_IN_TYPES.map(({ value, icon: Icon }) => (
                <DropdownMenuItem
                  key={value}
                  className="cursor-pointer"
                  onClick={() => handleClockIn(value)}
                  disabled={isPending}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {t(`checkInType.${value}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Re-request location permission button */}
        {(isDenied || isPrompt) && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 cursor-pointer text-xs text-warning dark:text-warning border-amber-500/50"
            onClick={() => {
              if (isDenied) {
                toast.info(t("location.deniedInstructions"), { duration: 8000 });
              } else {
                requestPermission();
              }
            }}
          >
            <Navigation className="h-3.5 w-3.5 mr-1" />
            {t("location.requestPermission")}
          </Button>
        )}
        {hasCheckedIn && !hasCheckedOut && (
          <Button
            variant="secondary"
            size="sm"
            className={cn("h-8 flex-1 cursor-pointer text-xs")}
            disabled={isPending || isDenied}
            onClick={handleClockOut}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              t("clockOut")
            )}
          </Button>
        )}
      </div>
    </div>

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
    </>
  );
}
