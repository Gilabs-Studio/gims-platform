"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AuditorModeBanner() {
  const t = useTranslations("manufacturingCsvAuditTrail");

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {t("auditorMode.bannerTitle")}
            </span>
            <Badge variant="success" className="text-[10px] py-0 font-normal">
              {t("auditorMode.integrityBadge")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("auditorMode.bannerSubtitle")}
          </p>
        </div>
      </div>

      <Badge variant="outline" className="gap-1 text-xs shrink-0 self-start sm:self-center font-mono">
        <Eye className="w-3.5 h-3.5 text-primary" />
        <span>{t("auditorMode.inspectionMode")}</span>
      </Badge>
    </div>
  );
}
