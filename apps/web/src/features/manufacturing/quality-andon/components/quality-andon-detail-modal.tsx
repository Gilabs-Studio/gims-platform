"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AndonStatusBadge } from "./andon-status-badge";
import type { AndonParameterItem } from "../types/quality-andon.types";
import { formatDate } from "@/lib/utils";
import { ShieldCheck, Plus, BellRing } from "lucide-react";


interface QualityAndonDetailModalProps {
  open: boolean;
  onClose: () => void;
  parameter: AndonParameterItem | null;
  onOpenEscalateDialog?: (param: AndonParameterItem) => void;
  onOpenIncidentDialog?: (param: AndonParameterItem) => void;
}

export function QualityAndonDetailModal({
  open,
  onClose,
  parameter,
  onOpenEscalateDialog,
  onOpenIncidentDialog,
}: QualityAndonDetailModalProps) {
  const t = useTranslations("manufacturingQualityAndon");
  const [activeTab, setActiveTab] = useState("overview");

  if (!parameter) return null;

  const delta = parameter.currentValue - parameter.targetValue;
  const deltaPct = parameter.targetValue !== 0 ? ((delta / parameter.targetValue) * 100).toFixed(1) : "0";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <span>{parameter.name}</span>
                <span className="text-muted-foreground font-mono text-sm font-normal">
                  ({parameter.code})
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {parameter.batchNumber} • {parameter.productName} • {parameter.lineName}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <AndonStatusBadge status={parameter.status} />
              {parameter.status !== "normal" && onOpenEscalateDialog && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => onOpenEscalateDialog(parameter)}
                  className="h-7 text-xs font-bold gap-1 cursor-pointer"
                >
                  <BellRing className="h-3 w-3" />
                  <span>{t("actions.escalateToQA")}</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 pt-2">
          <TabsList className="grid grid-cols-4 w-full h-9">
            <TabsTrigger value="overview" className="text-xs cursor-pointer">
              {t("detailModal.tabs.overview")}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs cursor-pointer">
              {t("detailModal.tabs.history")} ({parameter.telemetryHistory.length})
            </TabsTrigger>
            <TabsTrigger value="incidents" className="text-xs cursor-pointer">
              {t("detailModal.tabs.incidents")} ({parameter.incidents.length})
            </TabsTrigger>
            <TabsTrigger value="auditTrail" className="text-xs cursor-pointer">
              {t("detailModal.tabs.auditTrail")}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW & LIMITS */}
          <TabsContent value="overview" className="space-y-4 pt-1">
            {/* Spec Limits Gauge Card */}
            <div className="p-4 rounded-lg border bg-card space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-foreground">{t("detailModal.limitsSummary")}</span>
                <span className="font-mono text-muted-foreground">
                  {t("detailModal.deviationDelta")}:{" "}
                  <strong className={delta === 0 ? "text-foreground" : delta > 0 ? "text-rose" : "text-destructive"}>
                    {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} {parameter.unit} ({deltaPct}%)
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-muted/40 border">
                  <span className="text-muted-foreground">{t("detailModal.lsl")}</span>
                  <p className="font-mono font-bold text-sm text-foreground mt-0.5">
                    {parameter.lowerSpecLimit.toLocaleString()} {parameter.unit}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <span className="font-semibold">{t("detailModal.target")}</span>
                  <p className="font-mono font-extrabold text-base mt-0.5">
                    {parameter.targetValue.toLocaleString()} {parameter.unit}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border">
                  <span className="text-muted-foreground">{t("detailModal.usl")}</span>
                  <p className="font-mono font-bold text-sm text-foreground mt-0.5">
                    {parameter.upperSpecLimit.toLocaleString()} {parameter.unit}
                  </p>
                </div>
                <div
                  className={`p-2.5 rounded-lg border ${
                    parameter.status === "critical_alarm"
                      ? "bg-destructive/10 border-destructive/30 text-destructive"
                      : parameter.status === "warning"
                        ? "bg-warning/10 border-warning/30 text-warning"
                        : "bg-success/10 border-success/30 text-success"
                  }`}
                >
                  <span className="font-bold">{t("detailModal.currentValue")}</span>
                  <p className="font-mono font-extrabold text-base mt-0.5">
                    {parameter.currentValue.toLocaleString()} {parameter.unit}
                  </p>
                </div>
              </div>
            </div>

            {/* Personnel & Production Assignment Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Operator & Line */}
              <div className="space-y-3 p-3.5 rounded-lg border bg-muted/20">
                <div>
                  <span className="text-muted-foreground font-medium">{t("detailModal.operator")}</span>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={parameter.operatorAvatar} alt={parameter.operatorName} />
                      <AvatarFallback>{parameter.operatorName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-foreground">{parameter.operatorName}</p>
                      <p className="text-[11px] text-muted-foreground">{parameter.operatorRole}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("detailModal.line")}:</span>
                    <span className="font-semibold text-foreground">{parameter.lineName}</span>
                  </div>
                  {parameter.machineName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("detailModal.machine")}:</span>
                      <span className="text-foreground">{parameter.machineName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* IPQA Inspector & Last Telemetry */}
              <div className="space-y-3 p-3.5 rounded-lg border bg-muted/20">
                <div>
                  <span className="text-muted-foreground font-medium">{t("detailModal.qaInspector")}</span>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={parameter.qaInspectorAvatar} alt={parameter.qaInspectorName} />
                      <AvatarFallback>{parameter.qaInspectorName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-foreground">{parameter.qaInspectorName}</p>
                      <p className="text-[11px] text-muted-foreground">{parameter.qaInspectorRole}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("detailModal.lastSampleTime")}:</span>
                    <span className="font-mono text-foreground">{formatDate(parameter.lastSampleTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("detailModal.batchNo")}:</span>
                    <span className="font-mono font-bold text-foreground">{parameter.batchNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            {parameter.notes && (
              <div className="p-3 rounded-lg border bg-muted/10 text-xs">
                <span className="font-semibold text-foreground">{t("detailModal.notes")}:</span>
                <p className="text-muted-foreground mt-1">{parameter.notes}</p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: TELEMETRY SENSOR HISTORY */}
          <TabsContent value="history" className="space-y-3 pt-1">
            <div className="rounded-md border bg-card overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Time</TableHead>
                    <TableHead className="text-xs font-bold text-right">Measured Reading</TableHead>
                    <TableHead className="text-xs font-bold text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parameter.telemetryHistory.map((tel) => (
                    <TableRow key={tel.id} className="text-xs">
                      <TableCell className="font-mono font-semibold">{tel.timestamp}</TableCell>
                      <TableCell className="font-mono font-bold text-right text-foreground">
                        {tel.value.toLocaleString()} {tel.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        <AndonStatusBadge status={tel.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB 3: QUALITY DEVIATION INCIDENTS & CAPA */}
          <TabsContent value="incidents" className="space-y-3 pt-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground">
                {parameter.incidents.length} Deviation(s) Logged
              </span>
              {onOpenIncidentDialog && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenIncidentDialog(parameter)}
                  className="h-7 text-xs font-bold gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>{t("logIncident")}</span>
                </Button>
              )}
            </div>

            {parameter.incidents.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg bg-muted/10 p-6">
                <ShieldCheck className="h-8 w-8 text-success mx-auto mb-2 opacity-80" />
                <p>{t("detailModal.noIncidents")}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {parameter.incidents.map((inc) => (
                  <div key={inc.id} className="p-3.5 rounded-lg border bg-card space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">{inc.code}</span>
                        <Badge
                          variant={
                            inc.severity === "critical"
                              ? "destructive"
                              : inc.severity === "major"
                                ? "warning"
                                : "secondary"
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {t(`severity.${inc.severity}`)}
                        </Badge>
                        {inc.isCapaRequired && (
                          <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
                            CAPA Required
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {formatDate(inc.loggedAt)} • {inc.loggedBy}
                      </span>
                    </div>

                    <p className="font-semibold text-foreground">{inc.title}</p>
                    <p className="text-muted-foreground">{inc.description}</p>

                    {inc.correctiveAction && (
                      <div className="p-2 rounded bg-muted/40 text-[11px] border">
                        <span className="font-bold text-foreground">Immediate Action: </span>
                        <span className="text-muted-foreground">{inc.correctiveAction}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 4: CSV AUDIT TRAIL */}
          <TabsContent value="auditTrail" className="space-y-3 pt-1">
            <div className="p-2.5 rounded-lg border bg-primary/5 text-primary text-xs flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{t("detailModal.auditInfo")}</span>
            </div>

            {parameter.auditLogs.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No audit entries recorded yet for this parameter.
              </div>
            ) : (
              <div className="space-y-2">
                {parameter.auditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border bg-card text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-foreground">{log.action}</span>
                      <span className="font-mono text-muted-foreground">{formatDate(log.timestamp)}</span>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2">
                      <span className="font-semibold text-foreground">{log.actorName}</span>
                      <span>({log.actorRole})</span>
                    </div>
                    {log.details && <p className="text-muted-foreground text-[11px]">{log.details}</p>}
                    {log.signatureHash && (
                      <div className="text-[10px] font-mono text-muted-foreground/80 break-all bg-muted/30 p-1.5 rounded border">
                        <span className="font-bold">Hash: </span>
                        <span>{log.signatureHash}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
