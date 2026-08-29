"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import type { CapaSummaryStatus } from "../types/quality-andon.types";

interface QualityAndonCapaSummaryProps {
  summary: CapaSummaryStatus;
  onViewCapaList?: () => void;
}

export function QualityAndonCapaSummary({
  summary,
  onViewCapaList,
}: QualityAndonCapaSummaryProps) {
  const t = useTranslations("manufacturingQualityAndon");

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col justify-between h-full">
      <div className="pb-3 border-b">
        <h3 className="text-sm font-bold text-foreground">
          {t("capaSummary.title")}
        </h3>
      </div>

      <div className="py-3 space-y-2.5 flex-1 flex flex-col justify-center text-xs">
        {/* 1. Open */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground font-medium">
            <span className="h-2 w-2 rounded-full bg-purple shrink-0" />
            <span>{t("capaSummary.open")}</span>
          </span>
          <span className="font-mono font-bold text-foreground">{summary.open}</span>
        </div>

        {/* 2. In Progress */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground font-medium">
            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
            <span>{t("capaSummary.inProgress")}</span>
          </span>
          <span className="font-mono font-bold text-foreground">{summary.inProgress}</span>
        </div>

        {/* 3. Pending Verification */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground font-medium">
            <span className="h-2 w-2 rounded-full bg-warning shrink-0" />
            <span>{t("capaSummary.pendingVerification")}</span>
          </span>
          <span className="font-mono font-bold text-foreground">{summary.pendingVerification}</span>
        </div>

        {/* 4. Closed (This Month) */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground font-medium">
            <span className="h-2 w-2 rounded-full bg-success shrink-0" />
            <span>{t("capaSummary.closedThisMonth")}</span>
          </span>
          <span className="font-mono font-bold text-foreground">{summary.closedThisMonth}</span>
        </div>
      </div>

      <div className="pt-2 border-t text-center">
        <button
          type="button"
          onClick={onViewCapaList}
          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>{t("capaSummary.viewCapaList")}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
