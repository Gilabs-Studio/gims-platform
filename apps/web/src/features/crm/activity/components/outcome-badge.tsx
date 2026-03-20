"use client";

import { Badge } from "@/components/ui/badge";

const OUTCOME_CONFIG: Record<string, { className: string }> = {
  very_positive: { className: "border-green-300 bg-green-50 text-success dark:bg-success dark:text-success dark:border-green-800" },
  positive: { className: "border-green-200 bg-green-50 text-success dark:bg-success dark:text-success dark:border-green-800" },
  neutral: { className: "border-border bg-muted text-muted-foreground" },
  negative: { className: "border-red-200 bg-red-50 text-destructive dark:bg-destructive dark:text-destructive dark:border-red-800" },
};

interface OutcomeBadgeProps {
  readonly outcome: string;
  readonly label?: string;
}

export function OutcomeBadge({ outcome, label }: OutcomeBadgeProps) {
  const config = OUTCOME_CONFIG[outcome];
  if (!config) return null;

  const displayLabel = label ?? outcome.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Badge variant="outline" className={`text-xs ${config.className}`}>
      {displayLabel}
    </Badge>
  );
}
