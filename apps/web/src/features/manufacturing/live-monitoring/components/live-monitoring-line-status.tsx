"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Info, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "@/i18n/routing";
import type { LineStatusItem, LineStatusType } from "../types/live-monitoring.types";
import { formatInteger, getStatusBadgeVariant } from "../utils/live-monitoring.utils";

interface LiveMonitoringLineStatusProps {
  lines: LineStatusItem[];
}

export function LiveMonitoringLineStatus({ lines }: LiveMonitoringLineStatusProps) {
  const t = useTranslations("manufacturingLiveMonitoring");

  const renderStatusBadge = (status: LineStatusType) => {
    const variant = getStatusBadgeVariant(status);
    const label = t(`statusNames.${status}`);
    return (
      <Badge variant={variant} className="text-[11px] font-semibold px-2 py-0.5 cursor-pointer">
        {label}
      </Badge>
    );
  };

  const renderSparkline = (data: number[], status: LineStatusType) => {
    if (status === "maintenance" || data.every((v) => v === 0)) return null;
    const strokeColor =
      status === "running"
        ? "var(--color-success, #10b981)"
        : status === "warning"
        ? "var(--color-warning, #f59e0b)"
        : "var(--color-destructive, #ef4444)";

    return (
      <svg className="w-12 h-4 inline-block ml-1.5 align-middle" viewBox="0 0 50 15">
        <path
          d={`M 0 ${15 - (data[0] / 100) * 15} ${data
            .map((val, i) => `L ${(i / (data.length - 1)) * 50} ${15 - (val / 100) * 15}`)
            .join(" ")}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base font-semibold">{t("lineStatus.title")}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground/70 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>{t("tooltips.lineStatus")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge variant="outline" className="text-xs font-semibold">
          {lines.length} Lines
        </Badge>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col justify-between">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/60">
                <TableHead className="font-semibold text-xs py-3 text-foreground">{t("lineStatus.columns.line")}</TableHead>
                <TableHead className="font-semibold text-xs py-3 text-foreground">{t("lineStatus.columns.status")}</TableHead>
                <TableHead className="font-semibold text-xs py-3 text-foreground text-right">{t("lineStatus.columns.oee")}</TableHead>
                <TableHead className="font-semibold text-xs py-3 text-foreground text-right">{t("lineStatus.columns.production")}</TableHead>
                <TableHead className="font-semibold text-xs py-3 text-foreground text-right">{t("lineStatus.columns.target")}</TableHead>
                <TableHead className="font-semibold text-xs py-3 text-foreground text-right">{t("lineStatus.columns.downtime")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id} className="hover:bg-muted/20 border-border/40 transition-colors cursor-pointer">
                  <TableCell className="py-3 font-semibold text-xs text-foreground">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          line.status === "running"
                            ? "bg-success"
                            : line.status === "warning"
                            ? "bg-warning"
                            : line.status === "stop"
                            ? "bg-destructive"
                            : "bg-muted-foreground/50"
                        }`}
                      />
                      <span className="truncate max-w-[140px] sm:max-w-[180px]">
                        {t(line.nameKey as Parameters<typeof t>[0])}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">{renderStatusBadge(line.status)}</TableCell>
                  <TableCell className="py-3 text-right font-bold text-xs font-mono text-foreground">
                    {line.oeeScore !== null ? (
                      <>
                        <span>{line.oeeScore}%</span>
                        {renderSparkline(line.sparkline, line.status)}
                      </>
                    ) : (
                      <span className="text-muted-foreground font-normal">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-right font-medium text-xs font-mono text-foreground">
                    {formatInteger(line.productionActual)}{" "}
                    <span className="text-[10px] text-muted-foreground font-sans font-normal">Pcs</span>
                  </TableCell>
                  <TableCell className="py-3 text-right text-xs font-mono text-muted-foreground">
                    {formatInteger(line.productionTarget)}{" "}
                    <span className="text-[10px] text-muted-foreground font-sans font-normal">Pcs</span>
                  </TableCell>
                  <TableCell className="py-3 text-right font-medium text-xs font-mono text-muted-foreground">
                    {line.downtimeDurationText}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="p-3 border-t border-border/40 text-center bg-muted/10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            asChild
            className="text-xs text-muted-foreground hover:text-primary font-semibold cursor-pointer w-full py-1 h-8 gap-1.5 transition-all duration-300"
          >
            <Link href="/manufacturing/oee">
              <span>{t("lineStatus.seeAllLines")}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

