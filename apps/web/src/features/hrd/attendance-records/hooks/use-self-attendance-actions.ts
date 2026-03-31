"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  useTodayAttendance,
  useClockIn,
  useClockOut,
} from "./use-attendance-records";
import { useLocationPermission } from "./use-location-permission";
import { useGeolocation, calculateDistance } from "./use-geolocation";
import type { AttendanceRecord, CheckInType, TodayAttendance } from "../types";

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

function getSuccessMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: string }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "-";
  const part = value.split(" ")[1] ?? value;
  return part.substring(0, 5);
}

export function useSelfAttendanceActions() {
  const t = useTranslations("hrd.attendance");

  const { data: todayData, isLoading } = useTodayAttendance();
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();
  const { isDenied, isPrompt, requestPermission, requestPermissionOrFallback } = useLocationPermission();
  const geo = useGeolocation();

  const today = todayData?.data as TodayAttendance | undefined;
  const record = today?.attendance_record as AttendanceRecord | null | undefined;

  const hasCheckedIn = today?.has_checked_in ?? false;
  const hasCheckedOut = today?.has_checked_out ?? false;
  const ws = today?.work_schedule;

  const isClockInPending = clockInMutation.isPending;
  const isClockOutPending = clockOutMutation.isPending;
  const isPending = clockInMutation.isPending || clockOutMutation.isPending;

  const [pendingClockInType, setPendingClockInType] = useState<CheckInType | null>(null);
  const [showLateReasonDialog, setShowLateReasonDialog] = useState(false);
  const [showCameraDialog, setShowCameraDialog] = useState(false);

  const proximityInfo = (() => {
    if (!ws?.require_gps || !ws.office_latitude || !ws.office_longitude) return null;
    if (!geo.hasLocation) return null;

    const distance = calculateDistance(
      geo.latitude!,
      geo.longitude!,
      ws.office_latitude,
      ws.office_longitude,
    );
    const isAtOffice = distance <= (ws.gps_radius_meter ?? 100);

    return { distance: Math.round(distance), isAtOffice };
  })();

  const isHolidayOrOffDay = today?.is_holiday || !today?.is_working_day;
  const blockReason = today?.is_holiday
    ? (today.holiday_info?.name ?? t("holiday"))
    : !today?.is_working_day
      ? t("offDay")
      : null;

  const statusLine = isLoading
    ? t("loading")
    : hasCheckedOut
      ? `${t("alreadyClockedOut")} ${formatTime(record?.check_out_time)}`
      : hasCheckedIn
        ? `${t("clockedIn")} ${formatTime(record?.check_in_time)}`
        : t("notClockedIn");

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
            toast.success(getSuccessMessage(responseData, t("messages.clockInSuccess")));
            setPendingClockInType(null);
          },
          onError: (err) => {
            toast.error(getErrorMessage(err, t("messages.notClockedInYet")));
          },
        },
      );
    },
    [clockInMutation, geo, t],
  );

  const handleClockIn = useCallback(
    (checkInType: CheckInType) => {
      if (checkInType === "WFH" || checkInType === "FIELD_WORK") {
        setPendingClockInType(checkInType);
        setShowCameraDialog(true);
        return;
      }

      if (checkInType === "NORMAL" && today?.is_late) {
        setPendingClockInType(checkInType);
        setShowLateReasonDialog(true);
        return;
      }

      executeClockIn(checkInType);
    },
    [today?.is_late, executeClockIn],
  );

  const handleClockOut = useCallback(async () => {
    let latitude: number | undefined;
    let longitude: number | undefined;

    try {
      const pos = await geo.getCurrentPosition();
      latitude = pos.latitude;
      longitude = pos.longitude;
    } catch {
      // Let backend decide if GPS is required
    }

    clockOutMutation.mutate(
      {
        ...(latitude !== undefined ? { latitude } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
      },
      {
        onSuccess: (responseData) => {
          toast.success(getSuccessMessage(responseData, t("messages.clockOutSuccess")));
        },
        onError: (err) => {
          toast.error(getErrorMessage(err, t("messages.notClockedInYet")));
        },
      },
    );
  }, [clockOutMutation, geo, t]);

  const handleLateReasonConfirm = useCallback(
    (reason: string) => {
      if (pendingClockInType) {
        executeClockIn(pendingClockInType, reason);
      }
      setShowLateReasonDialog(false);
    },
    [pendingClockInType, executeClockIn],
  );

  const handleCameraConfirm = useCallback(
    (photoUrl: string) => {
      if (pendingClockInType) {
        executeClockIn(pendingClockInType, undefined, photoUrl);
      }
      setShowCameraDialog(false);
    },
    [pendingClockInType, executeClockIn],
  );

  return {
    t,
    today,
    record,
    ws,
    isLoading,
    isClockInPending,
    isClockOutPending,
    isPending,
    hasCheckedIn,
    hasCheckedOut,
    isHolidayOrOffDay,
    blockReason,
    statusLine,
    proximityInfo,
    isDenied,
    isPrompt,
    requestPermission,
    requestPermissionOrFallback,
    pendingClockInType,
    showLateReasonDialog,
    setShowLateReasonDialog,
    showCameraDialog,
    setShowCameraDialog,
    handleClockIn,
    handleClockOut,
    handleLateReasonConfirm,
    handleCameraConfirm,
  } as const;
}
