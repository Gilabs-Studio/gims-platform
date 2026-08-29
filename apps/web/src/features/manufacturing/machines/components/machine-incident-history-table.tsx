"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { MachineIncidentLog } from "../types/machine.types";
import { formatDurationMinutes } from "../utils/machine.utils";

interface MachineIncidentHistoryTableProps {
  incidentLogs: MachineIncidentLog[];
  onReportIncidentClick?: () => void;
}

export function MachineIncidentHistoryTable({
  incidentLogs,
  onReportIncidentClick,
}: MachineIncidentHistoryTableProps) {
  const t = useTranslations("manufacturingMachines");
  const [filterText, setFilterText] = useState("");

  const filteredLogs = incidentLogs.filter(
    (log) =>
      log.reason.toLowerCase().includes(filterText.toLowerCase()) ||
      log.category.toLowerCase().includes(filterText.toLowerCase()) ||
      log.reportedBy.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50">
        <div className="space-y-0.5">
          <h3 className="font-semibold text-sm text-foreground">
            {t("incidentHistory.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("incidentHistory.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter incidents..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-8 h-8 text-xs bg-card"
            />
          </div>
          {onReportIncidentClick && (
            <button
              type="button"
              onClick={onReportIncidentClick}
              className="h-8 px-3 text-xs font-medium rounded-lg border border-rose-500/20 text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
            >
              + {t("actions.reportIncident")}
            </button>
          )}
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          {t("incidentHistory.noIncidents")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/60">
                <TableHead className="font-semibold text-xs py-3 text-foreground">
                  {t("incidentHistory.startTime")}
                </TableHead>
                <TableHead className="font-semibold text-xs py-3 text-foreground">
                  {t("incidentHistory.reason")}
                </TableHead>
                <TableHead className="font-semibold text-xs py-3 text-foreground">
                  {t("incidentHistory.category")}
                </TableHead>
                <TableHead className="font-semibold text-xs py-3 text-foreground">
                  {t("incidentHistory.duration")}
                </TableHead>
                <TableHead className="font-semibold text-xs py-3 text-foreground">
                  {t("incidentHistory.severity")}
                </TableHead>
                <TableHead className="font-semibold text-xs py-3 text-foreground">
                  {t("incidentHistory.reportedBy")}
                </TableHead>
                <TableHead className="font-semibold text-xs py-3 text-foreground text-right">
                  {t("incidentHistory.status")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow
                  key={log.id}
                  className="hover:bg-muted/20 border-border/40 transition-colors"
                >
                  <TableCell className="py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {log.startTime}
                  </TableCell>
                  <TableCell className="py-3 font-medium text-foreground max-w-xs text-xs">
                    <div>{log.reason}</div>
                    {log.actionTaken && (
                      <div className="text-[11px] text-muted-foreground font-normal line-clamp-1 mt-0.5">
                        ↳ {log.actionTaken}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {log.category}
                  </TableCell>
                  <TableCell className="py-3 whitespace-nowrap font-mono text-xs text-rose-600 font-medium">
                    {formatDurationMinutes(log.durationMinutes)}
                  </TableCell>
                  <TableCell className="py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                        log.severity === "critical"
                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                          : log.severity === "high"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {log.severity}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5 shrink-0 border border-border">
                        <AvatarFallback dataSeed={log.reportedBy}>
                          {log.reportedBy.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-foreground font-medium">
                        {log.reportedBy}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-right whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase ${
                        log.resolutionStatus === "resolved"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {log.resolutionStatus.replace("_", " ")}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
