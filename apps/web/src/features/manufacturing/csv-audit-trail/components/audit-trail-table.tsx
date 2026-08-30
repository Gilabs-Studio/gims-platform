"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  UserCheck,
  Cpu,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import type { AuditTrailRecord } from "../types/csv-audit-trail.types";
import { useCsvAuditTrailStore } from "../stores/use-csv-audit-trail-store";

interface AuditTrailTableProps {
  records: AuditTrailRecord[];
  totalLogs: number;
}

export function AuditTrailTable({ records, totalLogs }: AuditTrailTableProps) {
  const t = useTranslations("manufacturingCsvAuditTrail");
  const { page, setPage, setSelectedRecord } = useCsvAuditTrailStore();

  const getModuleDisplay = (module: string, label: string) => {
    switch (module) {
      case "work_order":
        return (
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
          </div>
        );
      case "quality_andon":
        return (
          <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
          </div>
        );
      case "quality_check":
        return (
          <div className="flex items-center gap-1.5 text-xs font-medium text-purple">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
          </div>
        );
      case "maintenance":
        return (
          <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
            <Wrench className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
          </div>
        );
      case "user_access":
        return (
          <div className="flex items-center gap-1.5 text-xs font-medium text-cyan">
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
          </div>
        );
      case "machine_telemetry":
        return (
          <div className="flex items-center gap-1.5 text-xs font-medium text-success">
            <Cpu className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
          </div>
        );
      default:
        return <span className="text-xs">{label}</span>;
    }
  };

  const getSourceDisplay = (source: string) => {
    switch (source) {
      case "mobile_app":
        return (
          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile App</span>
          </div>
        );
      case "edge_gateway":
        return (
          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Cpu className="w-3.5 h-3.5" />
            <span>Edge Gateway</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Monitor className="w-3.5 h-3.5" />
            <span>Web App</span>
          </div>
        );
    }
  };

  const renderValueWithColor = (value: string, highlight?: string) => {
    if (highlight === "danger") {
      return <span className="text-destructive font-medium">{value}</span>;
    }
    if (highlight === "success") {
      return <span className="text-success font-medium">{value}</span>;
    }
    if (highlight === "warning") {
      return <span className="text-warning font-medium">{value}</span>;
    }
    return <span className="text-muted-foreground">{value}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-semibold">{t("table.dateTime")}</TableHead>
              <TableHead className="text-xs font-semibold">{t("table.user")}</TableHead>
              <TableHead className="text-xs font-semibold">{t("table.module")}</TableHead>
              <TableHead className="text-xs font-semibold">{t("table.dataType")}</TableHead>
              <TableHead className="text-xs font-semibold">{t("table.recordId")}</TableHead>
              <TableHead className="text-xs font-semibold">{t("table.action")}</TableHead>
              <TableHead className="text-xs font-semibold">{t("table.beforeChange")}</TableHead>
              <TableHead className="text-xs font-semibold">{t("table.afterChange")}</TableHead>
              <TableHead className="text-xs font-semibold">{t("table.reason")}</TableHead>
              <TableHead className="text-xs font-semibold">{t("table.source")}</TableHead>
              <TableHead className="text-right text-xs font-semibold" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground text-xs">
                  {t("table.noData")}
                </TableCell>
              </TableRow>
            ) : (
              records.map((rec) => (
                <TableRow key={rec.id}>
                  {/* Date & Time */}
                  <TableCell className="whitespace-nowrap py-3">
                    <div className="text-xs font-medium text-foreground">{rec.formattedDate}</div>
                    <div className="text-[11px] text-muted-foreground">{rec.formattedTime}</div>
                  </TableCell>

                  {/* User */}
                  <TableCell className="whitespace-nowrap py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={rec.user.avatarUrl} alt={rec.user.name} />
                        <AvatarFallback dataSeed={rec.user.name} />
                      </Avatar>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{rec.user.name}</div>
                        <div className="text-[11px] text-muted-foreground">{rec.user.role}</div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Module */}
                  <TableCell className="whitespace-nowrap py-3">
                    {getModuleDisplay(rec.module, rec.moduleLabel)}
                  </TableCell>

                  {/* Data Type */}
                  <TableCell className="whitespace-nowrap text-xs text-foreground py-3">
                    {rec.dataType}
                  </TableCell>

                  {/* Record ID */}
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground py-3">
                    {rec.recordId}
                  </TableCell>

                  {/* Action */}
                  <TableCell className="whitespace-nowrap py-3">
                    <Badge variant={rec.action === "login" ? "secondary" : "success"}>
                      {t(`actions.${rec.action}`)}
                    </Badge>
                  </TableCell>

                  {/* Before Change */}
                  <TableCell className="whitespace-nowrap text-xs py-3">
                    {renderValueWithColor(rec.beforeChange, rec.beforeChangeHighlight)}
                  </TableCell>

                  {/* After Change */}
                  <TableCell className="whitespace-nowrap text-xs py-3">
                    {renderValueWithColor(rec.afterChange, rec.afterChangeHighlight)}
                  </TableCell>

                  {/* Reason */}
                  <TableCell className="max-w-[200px] text-xs text-muted-foreground truncate py-3">
                    {rec.reason}
                  </TableCell>

                  {/* Source */}
                  <TableCell className="whitespace-nowrap py-3">
                    {getSourceDisplay(rec.source)}
                  </TableCell>

                  {/* Action: View Detail */}
                  <TableCell className="text-right whitespace-nowrap py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(rec)}
                      className="text-xs text-primary hover:underline font-medium cursor-pointer"
                    >
                      {t("table.viewDetail")}
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination
        pageIndex={page}
        pageSize={10}
        rowCount={totalLogs}
        onPageChange={setPage}
        onPageSizeChange={() => {}}
        showPageSize={false}
      />
    </div>
  );
}
