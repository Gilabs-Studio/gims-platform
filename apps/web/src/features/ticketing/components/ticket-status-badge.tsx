"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { TicketStatus } from "../types/ticketing.types";

interface TicketStatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  const t = useTranslations("ticketing");

  switch (status) {
    case "open":
      return <Badge variant="warning" className={className}>{t("status.open")}</Badge>;
    case "assigned":
      return <Badge variant="info" className={className}>{t("status.assigned")}</Badge>;
    case "in_progress":
      return <Badge variant="active" className={className}>{t("status.in_progress")}</Badge>;
    case "pending_parts":
      return <Badge variant="outline" className={`border-warning/50 text-warning ${className}`}>{t("status.pending_parts")}</Badge>;
    case "resolved":
      return <Badge variant="success" className={className}>{t("status.resolved")}</Badge>;
    case "closed":
      return <Badge variant="secondary" className={className}>{t("status.closed")}</Badge>;
    case "rejected":
      return <Badge variant="destructive" className={className}>{t("status.rejected")}</Badge>;
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}
