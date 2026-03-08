"use client";

import { useState, useCallback } from "react";
import { MapPin, LogOut, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OutcomeBadge } from "./outcome-badge";
import { Link } from "@/i18n/routing";
import { formatTime, resolveImageUrl } from "@/lib/utils";
import { useCheckOutVisitReport } from "@/features/crm/visit-report/hooks/use-visit-reports";
import { useVisitReportById, visitReportKeys } from "@/features/crm/visit-report/hooks/use-visit-reports";
import { useCheckInVisitReport } from "@/features/crm/visit-report/hooks/use-visit-reports";
import { useTranslations } from "next-intl";
import { activityKeys } from "../hooks/use-activities";
import type { VisitActivityMetadata } from "../types";

const MAX_VISIBLE_PHOTOS = 5;

interface VisitActivityCardProps {
  readonly meta: VisitActivityMetadata;
  readonly visitReportId?: string | null;
}

/** Renders visit-specific details (photos, GPS, outcome, checkout) inside an activity timeline card. */
export function VisitActivityCard({ meta, visitReportId }: VisitActivityCardProps) {
  const [checkingOut, setCheckingOut] = useState(false);
  const qc = useQueryClient();
  const checkOutMutation = useCheckOutVisitReport();
  const checkInMutation = useCheckInVisitReport();
  const visitReportQuery = useVisitReportById(visitReportId ?? "");
  const t = useTranslations("crmVisitReport");

  const handleCheckOut = useCallback(async () => {
    if (!visitReportId) return;
    setCheckingOut(true);
    try {
      let gps: { latitude: number; longitude: number; accuracy: number } | undefined;
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            })
          );
          gps = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
        } catch {
          // GPS is optional — proceed without it
        }
      }
      await checkOutMutation.mutateAsync({ id: visitReportId, data: gps ?? {} });
      // ensure activity list and visit detail are refreshed
      qc.invalidateQueries({ queryKey: activityKeys.all });
      qc.refetchQueries({ queryKey: visitReportKeys.detail(visitReportId) });
      toast.success(t("checkedOut"));
    } catch {
      toast.error(t("locationError"));
    } finally {
      setCheckingOut(false);
    }
  }, [visitReportId, checkOutMutation, qc, t]);

  const handleCheckIn = useCallback(async () => {
    if (!visitReportId) return;
    setCheckingOut(true);
    try {
      let gps: { latitude: number; longitude: number; accuracy: number } | undefined;
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            })
          );
          gps = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
        } catch {
          // GPS is optional
        }
      }
      await checkInMutation.mutateAsync({ id: visitReportId, data: gps ?? {} });
      qc.invalidateQueries({ queryKey: activityKeys.all });
      qc.refetchQueries({ queryKey: visitReportKeys.detail(visitReportId) });
      toast.success(t("checkedIn"));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
      const serverMsg = e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message;
      toast.error(serverMsg ?? t("locationError"));
    } finally {
      setCheckingOut(false);
    }
  }, [visitReportId, checkInMutation, qc, t]);

  // Prefer authoritative value from backend (visit report detail), fallback to activity metadata
  const visitReport = visitReportQuery?.data?.data;
  const hasCheckedOut = Boolean(visitReport?.check_out_at ?? meta.check_out_at);
  const hasCheckedIn = Boolean(visitReport?.check_in_at ?? meta.check_in_at);

  return (
    <div className="mt-1.5 space-y-2">
      {/* Check-in badge + checkout (button or badge) placed inline */}
      {hasCheckedIn ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-xs">
            <MapPin className="h-3 w-3" />
            {t("actions.checkIn")} {formatTime(visitReport?.check_in_at ?? meta.check_in_at)}
          </Badge>

          {hasCheckedOut ? (
            <Badge variant="outline" className="gap-1 text-xs">
              <LogOut className="h-3 w-3" />
              {t("detail.checkedOutAt")} {formatTime(visitReport?.check_out_at ?? meta.check_out_at)}
            </Badge>
          ) : (
            // Show checkout button inline with badge when not yet checked out
            visitReportId && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-xs cursor-pointer"
                onClick={handleCheckOut}
                disabled={checkingOut}
              >
                {checkingOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                {checkingOut ? `${t("actions.checkOut") }...` : t("actions.checkOut")}
              </Button>
            )
          )}
        </div>
      ) : (
        // Not checked in yet — show Check In button if visit report exists
        visitReportId && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs cursor-pointer"
              onClick={handleCheckIn}
              disabled={checkingOut}
            >
              {checkingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MapPin className="h-3 w-3" />
              )}
              {checkingOut ? `${t("actions.checkIn")}...` : t("actions.checkIn")}
            </Button>
          </div>
        )
      )}

      {/* Outcome badge */}
      {meta.outcome && <OutcomeBadge outcome={meta.outcome} />}

      {/* Photo gallery thumbnails — show up to 5 */}
      {meta.photos && meta.photos.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {meta.photos.slice(0, MAX_VISIBLE_PHOTOS).map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={resolveImageUrl(url)}
              alt=""
              className="h-16 w-16 rounded object-cover border"
              loading="lazy"
            />
          ))}
          {meta.photos.length > MAX_VISIBLE_PHOTOS && (
            <div className="h-16 w-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground border">
              +{meta.photos.length - MAX_VISIBLE_PHOTOS}
            </div>
          )}
        </div>
      )}

      {/* duplicate checkout removed — actions are inline next to check-in */}

      {/* Link to visit report detail */}
      {visitReportId && (
        <Link
          href={`/crm/visits/${visitReportId}`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
        >
          {meta.visit_code ?? t("detail.visitCode")} &rarr;
        </Link>
      )}
    </div>
  );
}
