"use client";

import { useCallback } from "react";
import { Clock, Loader2, MapPin, Home, Briefcase } from "lucide-react";
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
import type { CheckInType } from "../types";
import { cn } from "@/lib/utils";

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

  const today = todayData?.data;
  const hasCheckedIn = today?.has_checked_in ?? false;
  const hasCheckedOut = today?.has_checked_out ?? false;
  const record = today?.attendance_record;

  const handleClockIn = useCallback(
    (checkInType: CheckInType) => {
      clockInMutation.mutate(
        { check_in_type: checkInType },
        {
          onSuccess: (responseData) => {
            const msg = getSuccessMessage(
              responseData,
              t("messages.clockInSuccess")
            );
            toast.success(msg);
          },
          onError: (err) => {
            const msg = getErrorMessage(err, t("messages.notClockedInYet"));
            toast.error(msg);
          },
        }
      );
    },
    [clockInMutation, t]
  );

  const handleClockOut = useCallback(() => {
    clockOutMutation.mutate(
      {},
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
  }, [clockOutMutation, t]);

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
    <div className="flex flex-col gap-1.5 px-1 py-1">
      <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{statusLine}</span>
      </div>
      <div className="flex gap-1">
        {!hasCheckedIn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 flex-1 cursor-pointer text-xs"
                disabled={isPending}
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
        {hasCheckedIn && !hasCheckedOut && (
          <Button
            variant="secondary"
            size="sm"
            className={cn("h-8 flex-1 cursor-pointer text-xs")}
            disabled={isPending}
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
  );
}
