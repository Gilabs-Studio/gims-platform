"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AndonStatus } from "../types/quality-andon.types";

interface AndonStatusBadgeProps {
  status: AndonStatus;
  className?: string;
}

export function AndonStatusBadge({ status, className }: AndonStatusBadgeProps) {
  const t = useTranslations("manufacturingQualityAndon");

  switch (status) {
    case "critical_alarm":
      return (
        <Badge variant="destructive" className={cn("text-xs font-bold px-2 py-0.5 animate-pulse", className)}>
          {t("status.critical_alarm")}
        </Badge>
      );
    case "warning":
      return (
        <Badge variant="warning" className={cn("text-xs font-bold px-2 py-0.5", className)}>
          {t("status.warning")}
        </Badge>
      );
    case "normal":
    default:
      return (
        <Badge variant="success" className={cn("text-xs font-semibold px-2 py-0.5", className)}>
          {t("status.normal")}
        </Badge>
      );
  }
}
