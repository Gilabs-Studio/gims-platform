"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDowntimeDetail } from "../hooks/use-downtime";
import { formatDurationMinutes } from "../utils/downtime-calculator";

interface DowntimeDetailModalProps {
  incidentId: string | null;
  onClose: () => void;
}

export function DowntimeDetailModal({
  incidentId,
  onClose,
}: DowntimeDetailModalProps) {
  const t = useTranslations("manufacturingDowntime.detail");
  const tSev = useTranslations("manufacturingDowntime.severity");
  const tStat = useTranslations("manufacturingDowntime.status");

  const { data: incident, isLoading } = useDowntimeDetail(incidentId);

  return (
    <Dialog open={Boolean(incidentId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-card border-border p-6">
        <DialogHeader className="space-y-1 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-foreground">
              {t("title")}
            </DialogTitle>
            {incident && (
              <Badge
                variant={incident.categoryType === "unplanned" ? "destructive" : "secondary"}
                className="text-[10px] uppercase font-bold"
              >
                {incident.categoryType}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </DialogHeader>

        {isLoading || !incident ? (
          <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
            Loading incident diagnostic details...
          </div>
        ) : (
          <div className="space-y-4 pt-2 text-xs">
            {/* Header info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/20 border border-border">
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[11px] block">{t("incidentNo")}</span>
                <span className="font-mono font-bold text-foreground">{incident.incidentNumber}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[11px] block">{t("machine")}</span>
                <span className="font-bold text-foreground truncate block">{incident.machineName}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[11px] block">{t("duration")}</span>
                <span className="font-mono font-bold text-destructive">
                  {formatDurationMinutes(incident.durationMinutes)}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[11px] block">{t("category")}</span>
                <span className="font-medium text-foreground">{incident.category}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[11px] block">{t("severity")}</span>
                <Badge
                  variant={
                    incident.severity === "critical" || incident.severity === "high"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[10px] capitalize"
                >
                  {tSev(incident.severity as "low" | "medium" | "high" | "critical")}
                </Badge>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[11px] block">{t("status")}</span>
                <Badge
                  variant={incident.status === "resolved" ? "default" : "warning"}
                  className="text-[10px] capitalize"
                >
                  {tStat(incident.status as "open" | "in_progress" | "resolved")}
                </Badge>
              </div>
            </div>

            {/* Failure Reason */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Failure Stoppage Reason
              </span>
              <p className="font-bold text-sm text-foreground bg-muted/20 p-2.5 rounded-lg border border-border">
                {incident.reason}
              </p>
            </div>

            {/* Root cause analysis */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                {t("rootCauseHeading")}
              </span>
              <div className="p-3 rounded-lg bg-card border border-border text-foreground leading-relaxed">
                {incident.rootCauseAnalysis || "No root cause details provided."}
              </div>
            </div>

            {/* Action taken */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                {t("actionTakenHeading")}
              </span>
              <div className="p-3 rounded-lg bg-card border border-border text-foreground leading-relaxed">
                {incident.actionTaken || "No corrective action documented yet."}
              </div>
            </div>

            {/* Personnel & Impact Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
                <span className="text-[11px] font-bold text-foreground block">{t("personnel")}</span>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("reportedBy")}:</span>
                  <span className="text-foreground font-medium">{incident.reportedBy}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("technician")}:</span>
                  <span className="text-foreground font-medium">
                    {incident.assignedTechnician || "-"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-1">
                <span className="text-[11px] font-bold text-foreground block">{t("lossImpact")}</span>
                <div className="flex justify-between text-muted-foreground">
                  <span>Estimated Lost Output:</span>
                  <span className="text-foreground font-mono font-bold">
                    {(incident.lostUnitsEstimated ?? 0).toLocaleString()} units
                  </span>
                </div>
                {incident.financialImpactEstimated && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Est. Financial Impact:</span>
                    <span className="text-destructive font-mono font-bold">
                      Rp {incident.financialImpactEstimated.toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* CAPA Status Alert */}
            {incident.capaRequired && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-destructive block">{t("capaHeading")}</span>
                  <p className="text-muted-foreground text-[11px]">{t("capaActive")}</p>
                </div>
                {incident.capaId && (
                  <Badge variant="destructive" className="font-mono text-[10px]">
                    {incident.capaId}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 px-4 text-xs cursor-pointer"
          >
            {t("closeBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
