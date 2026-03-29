"use client";

import { useMemo } from "react";
import { Clock, Loader2, MapPin, Home, Briefcase, MapPinOff, Navigation } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CheckInType } from "../types";
import { cn } from "@/lib/utils";
import { ClockInLateReasonDialog } from "./clock-in-late-reason-dialog";
import { ClockInCameraDialog } from "./clock-in-camera-dialog";
import { useSelfAttendanceActions } from "../hooks/use-self-attendance-actions";

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

export function UserMenuAttendance() {
  const {
    t,
    today,
    isLoading,
    hasCheckedIn,
    hasCheckedOut,
    record,
    isClockInPending,
    isPending,
    proximityInfo,
    isDenied,
    isPrompt,
    requestPermission,
    pendingClockInType,
    showLateReasonDialog,
    setShowLateReasonDialog,
    showCameraDialog,
    setShowCameraDialog,
    handleClockIn,
    handleClockOut,
    handleLateReasonConfirm,
    handleCameraConfirm,
  } = useSelfAttendanceActions();

  const statusLine = useMemo(
    () =>
      hasCheckedOut
        ? t("alreadyClockedOut") + " " + formatTime(record?.check_out_time)
        : hasCheckedIn
          ? t("clockedIn") + " " + formatTime(record?.check_in_time)
          : t("notClockedIn"),
    [hasCheckedIn, hasCheckedOut, record?.check_in_time, record?.check_out_time, t],
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span>{t("loading")}</span>
      </div>
    );
  }

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
      isPending={isClockInPending}
      onConfirm={handleLateReasonConfirm}
    />

    <ClockInCameraDialog
      open={showCameraDialog}
      onOpenChange={setShowCameraDialog}
      checkInType={pendingClockInType ?? "WFH"}
      isPending={isClockInPending}
      onConfirm={handleCameraConfirm}
    />
    </>
  );
}
