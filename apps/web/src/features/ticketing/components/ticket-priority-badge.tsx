"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { TicketPriority } from "../types/ticketing.types";

interface TicketPriorityBadgeProps {
  priority: TicketPriority;
  className?: string;
}

export function TicketPriorityBadge({ priority, className }: TicketPriorityBadgeProps) {
  const t = useTranslations("ticketing");

  switch (priority) {
    case "low":
      return <Badge variant="outline" className={`border-muted-foreground/30 text-muted-foreground ${className}`}>{t("priority.low")}</Badge>;
    case "medium":
      return <Badge variant="info" className={className}>{t("priority.medium")}</Badge>;
    case "high":
      return <Badge variant="warning" className={className}>{t("priority.high")}</Badge>;
    case "urgent":
      return <Badge variant="destructive" className={`font-semibold animate-pulse ${className}`}>{t("priority.urgent")}</Badge>;
    default:
      return <Badge variant="outline" className={className}>{priority}</Badge>;
  }
}
