"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, AlertTriangle, Info, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "@/i18n/routing";
import type { LiveAlertItem } from "../types/live-monitoring.types";
import { getAlertBadgeVariant } from "../utils/live-monitoring.utils";

interface LiveMonitoringAlertsProps {
  alerts: LiveAlertItem[];
}

export function LiveMonitoringAlerts({ alerts }: LiveMonitoringAlertsProps) {
  const t = useTranslations("manufacturingLiveMonitoring");

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base font-semibold">{t("alerts.title")}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground/70 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>{t("tooltips.alerts")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge variant={alerts.some((a) => a.status === "stop") ? "destructive" : "warning"} className="text-xs font-semibold">
          {alerts.length} {t("alerts.activeAlerts")}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1 space-y-2.5">
        {alerts.map((item) => {
          const isStop = item.status === "stop";
          const Icon = isStop ? AlertCircle : AlertTriangle;
          const badgeVariant = getAlertBadgeVariant(item.status);

          return (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50 text-xs hover:bg-muted/40 transition-colors cursor-pointer gap-2"
            >
              <div className="flex items-center gap-2.5 flex-wrap">
                <div
                  className={`p-1.5 rounded-md shrink-0 ${
                    isStop ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-muted-foreground font-mono text-[11px] shrink-0">{item.time}</span>
                <span className="font-bold text-foreground shrink-0">{item.machineName}</span>
                <Badge variant={badgeVariant} className="text-[10px] uppercase font-bold px-1.5 py-0.5">
                  {item.status}
                </Badge>
                <span className="text-muted-foreground">
                  {t(item.messageKey as Parameters<typeof t>[0], { param: item.messageParam ?? "" })}
                </span>
              </div>

              <div className="self-end sm:self-center shrink-0">
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/40 font-mono">
                  {t(item.lineLocationKey as Parameters<typeof t>[0])}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>

      <div className="p-3 border-t border-border/40 text-center bg-muted/10">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          asChild
          className="text-xs text-muted-foreground hover:text-primary font-semibold cursor-pointer w-full py-1 h-8 gap-1.5 transition-all duration-300"
        >
          <Link href="/manufacturing/quality-andon">
            <span>{t("alerts.seeAllAlerts")}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

