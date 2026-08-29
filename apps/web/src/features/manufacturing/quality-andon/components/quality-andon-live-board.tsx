"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { LiveAndonBoardLineItem } from "../types/quality-andon.types";

interface QualityAndonLiveBoardProps {
  lines: LiveAndonBoardLineItem[];
  onViewLine?: (lineId: string) => void;
  onViewAll?: () => void;
}

export function QualityAndonLiveBoard({
  lines,
  onViewLine,
  onViewAll,
}: QualityAndonLiveBoardProps) {
  const t = useTranslations("manufacturingQualityAndon");

  return (
    <div className="rounded-lg border bg-card flex flex-col justify-between h-full overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">
          {t("liveBoard.title")}
        </h3>
      </div>

      <div className="p-0 flex-1 flex flex-col justify-between">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="text-xs font-semibold">{t("liveBoard.lineArea")}</TableHead>
              <TableHead className="text-xs font-semibold">{t("liveBoard.status")}</TableHead>
              <TableHead className="text-xs font-semibold">{t("liveBoard.lastAlarm")}</TableHead>
              <TableHead className="text-xs font-semibold">{t("liveBoard.alarmType")}</TableHead>
              <TableHead className="text-xs font-semibold">{t("liveBoard.duration")}</TableHead>
              <TableHead className="text-xs font-semibold text-right">{t("liveBoard.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id} className="text-xs hover:bg-muted/20">
                <TableCell className="font-semibold text-foreground">{line.lineName}</TableCell>
                <TableCell>
                  {line.status === "alarm" ? (
                    <Badge variant="destructive" className="text-[10px] uppercase font-bold px-2 py-0.5 animate-pulse">
                      {t("liveBoard.alarm")}
                    </Badge>
                  ) : line.status === "warning" ? (
                    <Badge variant="warning" className="text-[10px] uppercase font-bold px-2 py-0.5">
                      {t("liveBoard.warning")}
                    </Badge>
                  ) : (
                    <Badge variant="success" className="text-[10px] uppercase font-semibold px-2 py-0.5">
                      {t("liveBoard.normal")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">{line.lastAlarmTime || "-"}</TableCell>
                <TableCell className="font-medium text-foreground">{line.alarmType || "-"}</TableCell>
                <TableCell className="font-mono text-muted-foreground">{line.duration || "-"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onViewLine?.(line.id)}
                    className="h-6 px-2 text-[11px] font-medium cursor-pointer"
                  >
                    {t("liveBoard.view")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="p-3 border-t text-center bg-muted/10">
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{t("liveBoard.viewAllLines")}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
