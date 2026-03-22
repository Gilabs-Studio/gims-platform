"use client";

import { Badge } from "@/components/ui/badge";

import { getReferenceSourceMeta } from "./reference-meta";

interface ReferenceBadgeProps {
  readonly referenceType: string | null;
}

export function ReferenceBadge({ referenceType }: ReferenceBadgeProps) {
  const badge = getReferenceSourceMeta(referenceType);
  return (
    <Badge variant="outline" className={`font-mono text-xs ${badge.color}`} title={badge.title}>
      {badge.shortLabel}
    </Badge>
  );
}
