"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Clock, Trophy, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { useDealHistory } from "../hooks/use-deals";
import type { DealHistory as DealHistoryEntry } from "../types";

interface DealHistoryTimelineProps {
  dealId: string;
}

function getNodeIcon(entry: DealHistoryEntry) {
  if (entry.to_stage?.is_won) return <Trophy className="h-3 w-3" />;
  if (entry.to_stage?.is_lost) return <XCircle className="h-3 w-3" />;
  const name = entry.to_stage_name?.toLowerCase() ?? "";
  if (name.includes("won")) return <Trophy className="h-3 w-3" />;
  if (name.includes("lost")) return <XCircle className="h-3 w-3" />;
  return <ArrowRight className="h-3 w-3" />;
}

function getNodeStyle(entry: DealHistoryEntry): React.CSSProperties {
  if (entry.to_stage?.color) {
    return { backgroundColor: entry.to_stage.color, color: "#fff" };
  }
  if (entry.to_stage?.is_won) return {};
  if (entry.to_stage?.is_lost) return {};
  return {};
}

function getNodeClassName(entry: DealHistoryEntry): string {
  if (entry.to_stage?.color) return "";
  if (entry.to_stage?.is_won) return "bg-green-500 text-white";
  if (entry.to_stage?.is_lost) return "bg-destructive text-destructive-foreground";
  const name = entry.to_stage_name?.toLowerCase() ?? "";
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
    <div className="relative space-y-0">
      {/* Full-height vertical line positioned at node center so circles always connect */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

      {history.map((entry) => (
        <div key={entry.id} className="flex gap-3 pb-6 last:pb-0">
          {/* Left column: node circle + connecting line — flex keeps line perfectly centered */}
          <div className="relative flex flex-col items-center shrink-0">
            <div
              className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full shrink-0 ${getNodeClassName(entry)}`}
              style={getNodeStyle(entry)}
            >
              {getNodeIcon(entry)}
            </div>
            {/* per-item connector removed — using full-height absolute line */}
          </div>

          {/* Right: content */}
          <div className="flex-1 min-w-0 pt-0.5">
            {/* Stage transition badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {entry.from_stage_name && (
                <Badge
                  className="text-xs"
                  style={
                    entry.from_stage?.color
                      ? {
                          backgroundColor: `${entry.from_stage.color}22`,
                          color: entry.from_stage.color,
                          borderColor: `${entry.from_stage.color}55`,
                        }
                      : undefined
                  }
                  variant={entry.from_stage?.color ? "outline" : "outline"}
                >
                  {entry.from_stage_name}
                </Badge>
              )}
              {entry.from_stage_name && (
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
              <Badge
                className="text-xs border-transparent"
                style={
                  entry.to_stage?.color
                    ? {
                        backgroundColor: entry.to_stage.color,
                        color: "#fff",
                        borderColor: entry.to_stage.color,
                      }
                    : undefined
                }
                variant={entry.to_stage?.color ? undefined : "secondary"}
              >
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
            {entry.days_in_prev_stage !== undefined &&
              entry.days_in_prev_stage > 0 && (
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
