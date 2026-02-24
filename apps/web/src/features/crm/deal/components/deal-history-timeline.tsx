"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Clock, Trophy, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { useDealHistory } from "../hooks/use-deals";

interface DealHistoryTimelineProps {
  dealId: string;
}

function getNodeIcon(toStageName?: string) {
  const name = toStageName?.toLowerCase() ?? "";
  if (name.includes("won")) return <Trophy className="h-3 w-3" />;
  if (name.includes("lost")) return <XCircle className="h-3 w-3" />;
  return <ArrowRight className="h-3 w-3" />;
}

function getNodeColor(toStageName?: string): string {
  const name = toStageName?.toLowerCase() ?? "";
  if (name.includes("won")) return "bg-green-500 text-white";
  if (name.includes("lost")) return "bg-destructive text-destructive-foreground";
  return "bg-primary text-primary-foreground";
}

export function DealHistoryTimeline({ dealId }: DealHistoryTimelineProps) {
  const t = useTranslations("crmDeal");
  const { data: history, isLoading } = useDealHistory(dealId);

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        {t("noHistory")}
      </p>
    );
  }

  return (
    <div className="relative pl-6 space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />

      {history.map((entry) => (
        <div key={entry.id} className="relative pb-6 last:pb-0">
          {/* Node */}
          <div
            className={`absolute left-[-13px] flex h-6 w-6 items-center justify-center rounded-full ${getNodeColor(entry.to_stage_name)}`}
          >
            {getNodeIcon(entry.to_stage_name)}
          </div>

          {/* Content */}
          <div className="ml-4">
            {/* Stage transition */}
            <div className="flex items-center gap-2 flex-wrap">
              {entry.from_stage_name && (
                <Badge variant="outline" className="text-xs">
                  {entry.from_stage_name}
                </Badge>
              )}
              {entry.from_stage_name && (
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              )}
              <Badge variant="secondary" className="text-xs">
                {entry.to_stage_name}
              </Badge>
            </div>

            {/* Probability change */}
            {(entry.from_probability !== undefined ||
              entry.to_probability !== undefined) && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("probabilityChange")}:{" "}
                {entry.from_probability ?? 0}% → {entry.to_probability ?? 0}%
              </p>
            )}

            {/* Reason */}
            {entry.reason && (
              <p className="text-xs mt-1">
                <span className="font-medium">{t("reason")}:</span>{" "}
                {entry.reason}
              </p>
            )}

            {/* Notes */}
            {entry.notes && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {entry.notes}
              </p>
            )}

            {/* Days in previous stage */}
            {entry.days_in_prev_stage !== undefined && entry.days_in_prev_stage > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                <Clock className="inline-block h-3 w-3 mr-0.5 -mt-px" />
                {t("daysInPreviousStage", { days: entry.days_in_prev_stage })}
              </p>
            )}

            {/* Performed by & date */}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              {entry.changed_by_user?.name && (
                <span>
                  {t("by")} {entry.changed_by_user.name}
                </span>
              )}
              <span>{formatDate(entry.changed_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
