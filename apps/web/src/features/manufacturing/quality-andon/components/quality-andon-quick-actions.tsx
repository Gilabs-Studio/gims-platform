"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

interface QualityAndonQuickActionsProps {
  onCreateDeviation?: () => void;
  onRaiseCapa?: () => void;
  onQualityCheckEntry?: () => void;
  onViewAuditTrail?: () => void;
}

export function QualityAndonQuickActions({
  onCreateDeviation,
  onRaiseCapa,
  onQualityCheckEntry,
  onViewAuditTrail,
}: QualityAndonQuickActionsProps) {
  const t = useTranslations("manufacturingQualityAndon");

  const actions = [
    {
      label: t("quickActions.createDeviation"),
      onClick: onCreateDeviation,
    },
    {
      label: t("quickActions.raiseCapa"),
      onClick: onRaiseCapa,
    },
    {
      label: t("quickActions.qualityCheckEntry"),
      onClick: onQualityCheckEntry,
    },
    {
      label: t("quickActions.viewAuditTrail"),
      onClick: onViewAuditTrail,
    },
  ];

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col justify-between h-full">
      <div className="pb-3 border-b">
        <h3 className="text-sm font-bold text-foreground">
          {t("quickActions.title")}
        </h3>
      </div>

      <div className="py-2 space-y-1.5 flex-1 flex flex-col justify-center">
        {actions.map((action, index) => (
          <button
            key={index}
            type="button"
            onClick={action.onClick}
            className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted/30 transition-all duration-150 cursor-pointer text-xs font-medium text-foreground group w-full text-left"
          >
            <span>{action.label}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}
