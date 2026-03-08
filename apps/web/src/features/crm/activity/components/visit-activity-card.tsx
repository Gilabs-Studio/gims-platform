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
      qc.invalidateQueries({ queryKey: activityKeys.all });
      toast.success("Checked out successfully");
    } catch {
      toast.error("Failed to check out");
    } finally {
      setCheckingOut(false);
    }
  }, [visitReportId, checkOutMutation, qc]);

  const canCheckOut = !!(meta.check_in_at && !meta.check_out_at && visitReportId);

  return (
    <div className="mt-1.5 space-y-2">
      {/* Check-in badge */}
      {meta.check_in_at && (
        <Badge variant="outline" className="gap-1 text-xs">
          <MapPin className="h-3 w-3" />
          Checked in {formatTime(meta.check_in_at)}
        </Badge>
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

      {/* Checkout button — visible only when checked in but not yet checked out */}
      {canCheckOut && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs cursor-pointer"
          onClick={handleCheckOut}
          disabled={checkingOut}
        >
          {checkingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          {checkingOut ? "Checking out..." : "Check Out"}
        </Button>
      )}

      {/* Link to visit report detail */}
      {visitReportId && (
        <Link
          href={`/crm/visits/${visitReportId}`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
        >
          {meta.visit_code ?? "View Visit Report"} &rarr;
        </Link>
      )}
    </div>
  );
}
