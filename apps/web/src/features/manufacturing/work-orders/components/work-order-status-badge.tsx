"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkOrderStatus } from "../types/work-order.types";

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus;
  className?: string;
}

export function WorkOrderStatusBadge({ status, className }: WorkOrderStatusBadgeProps) {
  const t = useTranslations("manufacturingWorkOrders");

  switch (status) {
    case "in_progress":
      return (
        <Badge variant="success" className={cn("text-xs font-semibold px-2 py-0.5", className)}>
          {t("status.in_progress")}
        </Badge>
      );
    case "paused":
      return (
        <Badge variant="warning" className={cn("text-xs font-semibold px-2 py-0.5", className)}>
          {t("status.paused")}
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="active" className={cn("text-xs font-semibold px-2 py-0.5", className)}>
          {t("status.completed")}
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="destructive" className={cn("text-xs font-semibold px-2 py-0.5", className)}>
          {t("status.cancelled")}
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="secondary" className={cn("text-xs font-semibold px-2 py-0.5 text-purple", className)}>
          {t("status.submitted")}
        </Badge>
      );
    case "draft":
    default:
      return (
        <Badge variant="outline" className={cn("text-xs font-semibold px-2 py-0.5 text-muted-foreground", className)}>
          {t("status.draft")}
        </Badge>
      );
  }
}
