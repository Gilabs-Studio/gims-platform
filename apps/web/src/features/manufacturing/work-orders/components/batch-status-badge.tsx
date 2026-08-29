"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BatchStatus } from "../types/work-order.types";

interface BatchStatusBadgeProps {
  status: BatchStatus;
  className?: string;
}

export function BatchStatusBadge({ status, className }: BatchStatusBadgeProps) {
  const t = useTranslations("manufacturingWorkOrders");

  switch (status) {
    case "in_production":
      return (
        <Badge variant="info" className={cn("text-[11px] font-semibold px-2 py-0.5", className)}>
          {t("batchStatus.in_production")}
        </Badge>
      );
    case "quality_control":
      return (
        <Badge variant="secondary" className={cn("text-[11px] font-semibold px-2 py-0.5 text-purple bg-purple/10 border border-purple/20", className)}>
          {t("batchStatus.quality_control")}
        </Badge>
      );
    case "released":
      return (
        <Badge variant="success" className={cn("text-[11px] font-semibold px-2 py-0.5", className)}>
          {t("batchStatus.released")}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className={cn("text-[11px] font-semibold px-2 py-0.5", className)}>
          {t("batchStatus.rejected")}
        </Badge>
      );
    case "quarantine":
    default:
      return (
        <Badge variant="warning" className={cn("text-[11px] font-semibold px-2 py-0.5", className)}>
          {t("batchStatus.quarantine")}
        </Badge>
      );
  }
}

