"use client";

import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OutcomeBadge } from "./outcome-badge";
import { Link } from "@/i18n/routing";
import { formatTime } from "@/lib/utils";
import type { VisitActivityMetadata } from "../types";

interface VisitActivityCardProps {
  readonly meta: VisitActivityMetadata;
  readonly visitReportId?: string | null;
}

/** Renders visit-specific details (photos, GPS, outcome) inside an activity timeline card. */
export function VisitActivityCard({ meta, visitReportId }: VisitActivityCardProps) {
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

      {/* Photo gallery thumbnails */}
      {meta.photos && meta.photos.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {meta.photos.slice(0, 3).map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              className="h-16 w-16 rounded object-cover border"
              loading="lazy"
            />
          ))}
          {meta.photos.length > 3 && (
            <div className="h-16 w-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground border">
              +{meta.photos.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Link to visit report */}
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
