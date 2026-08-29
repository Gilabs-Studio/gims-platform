"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DowntimeIncident } from "../types/downtime.types";
import { formatDurationMinutes } from "../utils/downtime-calculator";

interface DowntimeHistoryListProps {
  readonly incidents: DowntimeIncident[];
  readonly search: string;
  readonly onSearchChange: (q: string) => void;
  readonly onSelectIncident: (id: string) => void;
  readonly isLoading?: boolean;
}

export function DowntimeHistoryList({
  incidents,
  search,
  onSearchChange,
  onSelectIncident,
  isLoading,
}: DowntimeHistoryListProps) {
  const t = useTranslations("manufacturingDowntime.table");

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(incidents.length / pageSize) || 1;
  const paginated = incidents.slice((page - 1) * pageSize, page * pageSize);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Search (Matched to sales-performance-list) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="relative w-full sm:w-[300px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-10 h-9 text-xs"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">{t("incidentNo")}</TableHead>
              <TableHead>{t("machine")}</TableHead>
              <TableHead className="w-28">{t("type")}</TableHead>
              <TableHead>{t("category")}</TableHead>
              <TableHead>{t("reason")}</TableHead>
              <TableHead className="w-24 text-center">{t("severity")}</TableHead>
              <TableHead className="w-24 text-right">{t("duration")}</TableHead>
              <TableHead className="w-24 text-center">{t("status")}</TableHead>
              <TableHead className="w-20 text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-xs">
                  Loading incidents...
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-xs">
                  {t("noRecords")}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((inc) => (
                <TableRow
                  key={inc.id}
                  onClick={() => onSelectIncident(inc.id)}
                  className="hover:bg-muted/40 transition-colors cursor-pointer text-xs"
                >
                  <TableCell className="font-mono font-semibold text-foreground">
                    {inc.incidentNumber}
                    <span className="block text-[10px] text-muted-foreground font-mono font-normal">
                      {inc.startTime}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground block truncate max-w-[180px]">
                      {inc.machineName}
                    </span>
                    <span className="text-[11px] text-muted-foreground block truncate max-w-[180px]">
                      {inc.lineName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={inc.categoryType === "unplanned" ? "destructive" : "secondary"}
                      className="text-[9px] uppercase font-semibold"
                    >
                      {inc.categoryType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {inc.category}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground block max-w-[220px] truncate" title={inc.reason}>
                      {inc.reason}
                    </span>
                    {inc.rootCauseAnalysis && (
                      <span className="text-[11px] text-muted-foreground block max-w-[220px] truncate" title={inc.rootCauseAnalysis}>
                        {inc.rootCauseAnalysis}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getSeverityBadge(inc.severity)} className="text-[10px] capitalize">
                      {inc.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    <span className={inc.categoryType === "unplanned" ? "text-destructive" : "text-primary"}>
                      {formatDurationMinutes(inc.durationMinutes)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={inc.status === "resolved" ? "default" : "secondary"}
                      className="text-[10px] capitalize"
                    >
                      {inc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectIncident(inc.id);
                      }}
                      className="h-7 px-2 text-xs hover:text-primary cursor-pointer"
                    >
                      {t("viewDetails")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
            <span>
              Page {page} of {totalPages} ({incidents.length} total)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2 text-xs cursor-pointer"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 px-2 text-xs cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
