"use client";

import { useTranslations } from "next-intl";
import { History, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StageScrollLoader } from "@/components/ui/stage-scroll-loader";
import { useDealActivityTimeline } from "@/features/crm/activity/hooks/use-activities";
import { getActivityTypeIcon } from "@/features/crm/activity/utils";
import { formatDate, formatTime } from "@/lib/utils";

interface DealActivityFeedProps {
  readonly dealId: string;
  readonly leadId?: string;
  readonly canCreateActivity: boolean;
  readonly onLogActivity: () => void;
  readonly refreshKey?: number;
}

export function DealActivityFeed({
  dealId,
  leadId,
  canCreateActivity,
  onLogActivity,
}: DealActivityFeedProps) {
  const t = useTranslations("crmDeal");

  const {
    activities,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchMore,
  } = useDealActivityTimeline(dealId, leadId);

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
      {canCreateActivity && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer h-7 text-xs"
            onClick={onLogActivity}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("addActivity")}
          </Button>
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

                      <time className="text-xs text-muted-foreground">
                        {formatDate(activity.timestamp)}, {formatTime(activity.timestamp)}
                      </time>

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

                    <p className="text-sm">{activity.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>

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
