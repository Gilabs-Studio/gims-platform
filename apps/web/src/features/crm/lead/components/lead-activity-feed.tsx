"use client";

import { useTranslations } from "next-intl";
import { History, MapPin, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StageScrollLoader } from "@/components/ui/stage-scroll-loader";
import { useLeadActivityTimeline } from "@/features/crm/activity/hooks/use-activities";
import { getActivityTypeIcon, parseVisitMetadata } from "@/features/crm/activity/utils";
import { VisitActivityCard } from "@/features/crm/activity/components/visit-activity-card";
import { formatDate, formatTime } from "@/lib/utils";

interface LeadActivityFeedProps {
  readonly leadId: string;
  readonly canCreateActivity: boolean;
  readonly canCreateVisit?: boolean;
  readonly onLogActivity: () => void;
  readonly onLogVisit?: () => void;
  /** Called after a new activity is created so this feed can refresh */
  readonly refreshKey?: number;
}

export function LeadActivityFeed({
  leadId,
  canCreateActivity,
  canCreateVisit,
  onLogActivity,
  onLogVisit,
  refreshKey,
}: LeadActivityFeedProps) {
  const t = useTranslations("crmLead");

  const {
    activities,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchMore,
  } = useLeadActivityTimeline(leadId);

  // refreshKey change is handled externally via invalidateQueries in useCreateActivity

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="ml-6 space-y-1 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(canCreateActivity || canCreateVisit) && (
        <div className="flex justify-end gap-2">
          {canCreateVisit && onLogVisit && (
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer h-7 text-xs"
              onClick={onLogVisit}
            >
              <MapPin className="h-3.5 w-3.5 mr-1" />
              {t("logVisit")}
            </Button>
          )}
          {canCreateActivity && (
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer h-7 text-xs"
              onClick={onLogActivity}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t("addActivity")}
            </Button>
          )}
        </div>
      )}

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <History className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{t("noActivities")}</p>
          {canCreateActivity && (
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer mt-1"
              onClick={onLogActivity}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t("addActivity")}
            </Button>
          )}
        </div>
      ) : (
        <>
          <ol className="relative border-l border-border ml-3 space-y-6">
            {activities.map((activity) => {
              const TypeIcon = getActivityTypeIcon(activity.activity_type?.icon);
              const employee = activity.employee;

              return (
                <li key={activity.id} className="ml-6">
                  {/* Timeline dot */}
                  <span
                    className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border bg-background"
                    style={
                      activity.activity_type?.badge_color
                        ? {
                            borderColor: activity.activity_type.badge_color,
                            color: activity.activity_type.badge_color,
                          }
                        : undefined
                    }
                  >
                    <TypeIcon className="h-3 w-3" />
                  </span>

                  <div className="space-y-1">
                    {/* Header row: badge + datetime + employee */}
                    <div className="flex flex-wrap items-center gap-2">
                      {activity.activity_type && (
                        <Badge
                          variant="outline"
                          className="inline-flex items-center gap-1 text-xs"
                          style={
                            activity.activity_type.badge_color
                              ? {
                                  borderColor: activity.activity_type.badge_color,
                                  color: activity.activity_type.badge_color,
                                }
                              : undefined
                          }
                        >
                          <TypeIcon className="h-3 w-3 shrink-0" />
                          {activity.activity_type.name}
                        </Badge>
                      )}

                      {/* Full date + time */}
                      <time className="text-xs text-muted-foreground">
                        {formatDate(activity.timestamp)}, {formatTime(activity.timestamp)}
                      </time>

                      {/* Employee avatar + name */}
                      {employee && (
                        <span className="inline-flex items-center gap-1.5">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback
                              dataSeed={employee.name}
                              className="text-[8px]"
                            />
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {employee.name}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm">{activity.description}</p>

                    {/* Visit activity details */}
                    {activity.type === "visit" && (() => {
                      const meta = parseVisitMetadata(activity.metadata);
                      return meta ? <VisitActivityCard meta={meta} visitReportId={activity.visit_report_id} /> : null;
                    })()}
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Infinite scroll sentinel */}
          <StageScrollLoader
            onLoadMore={fetchMore}
            hasMore={hasMore}
            isLoading={isLoadingMore}
          />
        </>
      )}
    </div>
  );
}
