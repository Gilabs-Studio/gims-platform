"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { History, Calendar, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyActivities } from "../hooks/use-activities";
import { useActivityTypes } from "@/features/crm/activity-type/hooks/use-activity-type";
import { getActivityTypeIcon } from "../utils";
import { formatDate, formatTime } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import type { Activity, ActivityListParams } from "../types";

interface ActivityFeedDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/** Groups activities by date string (e.g. "Jan 15, 2025") */
function groupByDate(activities: Activity[]): Map<string, Activity[]> {
  const groups = new Map<string, Activity[]>();
  for (const activity of activities) {
    const dateKey = formatDate(activity.timestamp);
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(activity);
    } else {
      groups.set(dateKey, [activity]);
    }
  }
  return groups;
}

export function ActivityFeedDialog({
  open,
  onOpenChange,
}: ActivityFeedDialogProps) {
  const t = useTranslations("crmActivity");

  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const params: ActivityListParams = {
    page,
    per_page: 20,
    ...(typeFilter !== "all" ? { activity_type_id: typeFilter } : {}),
  };

  const { data, isLoading, isError } = useMyActivities(params);
  const { data: typesData } = useActivityTypes({
    per_page: 100,
    sort_by: "order",
    sort_dir: "asc",
  });

  const activities = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const hasMore = pagination?.has_next ?? false;
  const activityTypes = typesData?.data ?? [];

  const grouped = groupByDate(activities);

  const handleTypeChange = useCallback((value: string) => {
    setTypeFilter(value);
    setPage(1);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore]);

  const headerFilter = (
    <Select value={typeFilter} onValueChange={handleTypeChange}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder={t("allTypes")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("allTypes")}</SelectItem>
        {activityTypes.map((type) => (
          <SelectItem key={type.id} value={type.id}>
            {type.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={t("myActivities")}
      description={t("activityFeed")}
      headerExtra={headerFilter}
      side="right"
      defaultWidth={448}
      minWidth={360}
      maxWidth={640}
    >
      <div className="px-4 py-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1 animate-pulse">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-3 w-3/4 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <History className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(grouped.entries()).map(([dateKey, dateActivities]) => (
                <div key={dateKey}>
                  <div className="sticky top-0 z-10 flex items-center gap-2 pb-2 bg-background">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {dateKey}
                    </span>
                  </div>

                  <ol className="relative border-l border-border ml-3 space-y-4">
                    {dateActivities.map((activity) => {
                      const TypeIcon = getActivityTypeIcon(
                        activity.activity_type?.icon
                      );

                      // Determine related entity link
                      const entityLink = activity.deal_id
                        ? { href: `/crm/pipeline?deal=${activity.deal_id}`, label: activity.deal?.title ?? t("types.deal") }
                        : activity.lead_id
                          ? { href: `/crm/leads/${activity.lead_id}`, label: t("types.lead") }
                          : activity.customer_id
                            ? { href: `/crm/leads`, label: activity.customer?.name ?? "" }
                            : null;

                      return (
                        <li key={activity.id} className="ml-6">
                          <span
                            className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border bg-background"
                            style={
                              activity.activity_type?.badge_color
                                ? {
                                    borderColor:
                                      activity.activity_type.badge_color,
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
                                          borderColor:
                                            activity.activity_type.badge_color,
                                          color:
                                            activity.activity_type.badge_color,
                                        }
                                      : undefined
                                  }
                                >
                                  <TypeIcon className="h-3 w-3 shrink-0" />
                                  {activity.activity_type.name}
                                </Badge>
                              )}

                              <time className="text-xs text-muted-foreground">
                                {formatTime(activity.timestamp)}
                              </time>
                            </div>

                            <p className="text-sm">{activity.description}</p>

                            {entityLink?.label && (
                              <Link
                                href={entityLink.href}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                                onClick={() => onOpenChange(false)}
                              >
                                <ExternalLink className="h-3 w-3" />
                                {entityLink.label}
                              </Link>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}

              {hasMore && (
                <div className="flex justify-center py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLoadMore}
                    className="cursor-pointer text-xs"
                  >
                    {t("timeline")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
    </Drawer>
  );
}
