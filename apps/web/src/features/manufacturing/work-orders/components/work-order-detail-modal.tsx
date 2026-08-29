"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkOrderStatusBadge } from "./work-order-status-badge";
import { BatchStatusBadge } from "./batch-status-badge";
import type { WorkOrder } from "../types/work-order.types";
import { formatDate } from "@/lib/utils";
import { ShieldCheck, Plus } from "lucide-react";

interface WorkOrderDetailModalProps {
  open: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  onOpenDeviationDialog?: (wo: WorkOrder) => void;
}

export function WorkOrderDetailModal({
  open,
  onClose,
  workOrder,
  onOpenDeviationDialog,
}: WorkOrderDetailModalProps) {
  const t = useTranslations("manufacturingWorkOrders");
  const [activeTab, setActiveTab] = useState("overview");

  if (!workOrder) return null;

  const yieldPct =
    workOrder.targetQuantity > 0
      ? Math.min(100, Math.round((workOrder.completedQuantity / workOrder.targetQuantity) * 100))
      : 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <span>{workOrder.code}</span>
                <span className="text-muted-foreground font-mono text-sm font-normal">
                  ({workOrder.batchNumber})
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {workOrder.productName} • {workOrder.productCode}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <WorkOrderStatusBadge status={workOrder.status} />
              <BatchStatusBadge status={workOrder.batchStatus} />
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 pt-2">
          <TabsList className="grid grid-cols-4 w-full h-9">
            <TabsTrigger value="overview" className="text-xs cursor-pointer">
              {t("detailModal.tabs.overview")}
            </TabsTrigger>
            <TabsTrigger value="materials" className="text-xs cursor-pointer">
              {t("detailModal.tabs.materials")} ({workOrder.materials.length})
            </TabsTrigger>
            <TabsTrigger value="deviations" className="text-xs cursor-pointer">
              {t("detailModal.tabs.deviations")} ({workOrder.deviations.length})
            </TabsTrigger>
            <TabsTrigger value="auditTrail" className="text-xs cursor-pointer">
              {t("detailModal.tabs.auditTrail")}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3 p-3.5 rounded-lg border bg-muted/20">
                <div>
                  <span className="text-muted-foreground font-medium">{t("detailModal.batchNo")}</span>
                  <p className="font-mono font-bold text-sm text-foreground mt-0.5">{workOrder.batchNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">{t("detailModal.product")}</span>
                  <p className="font-semibold text-foreground mt-0.5">{workOrder.productName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{workOrder.productCode}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">{t("detailModal.line")}</span>
                  <p className="font-semibold text-foreground mt-0.5">{workOrder.lineName}</p>
                  {workOrder.machineName && (
                    <p className="text-[11px] text-muted-foreground">{workOrder.machineName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 p-3.5 rounded-lg border bg-muted/20">
                <div>
                  <span className="text-muted-foreground font-medium">{t("detailModal.operator")}</span>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={workOrder.operatorAvatar} alt={workOrder.operatorName} />
                      <AvatarFallback>{workOrder.operatorName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-foreground">{workOrder.operatorName}</p>
                      <p className="text-[11px] text-muted-foreground">{workOrder.operatorRole}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                  <div>
                    <span className="text-muted-foreground font-medium">{t("detailModal.startDate")}</span>
                    <p className="font-mono text-foreground mt-0.5">
                      {workOrder.startDate ? formatDate(workOrder.startDate) : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium">
                      {workOrder.endDate ? t("detailModal.endDate") : t("detailModal.estimatedEnd")}
                    </span>
                    <p className="font-mono text-foreground mt-0.5">
                      {workOrder.endDate
                        ? formatDate(workOrder.endDate)
                        : workOrder.estimatedEndDate
                          ? formatDate(workOrder.estimatedEndDate)
                          : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Yield / Output Summary */}
            <div className="p-4 rounded-lg border bg-card space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-foreground">{t("table.yieldProgress")}</span>
                <span className="font-mono font-bold text-primary">{yieldPct}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${yieldPct}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">{t("detailModal.targetQty")}</span>
                  <p className="font-mono font-bold text-sm text-foreground mt-0.5">
                    {workOrder.targetQuantity.toLocaleString()} {workOrder.unit}
                  </p>
                </div>
                <div className="p-2 rounded bg-success/10 text-success">
                  <span>{t("detailModal.completedQty")}</span>
                  <p className="font-mono font-bold text-sm mt-0.5">
                    {workOrder.completedQuantity.toLocaleString()} {workOrder.unit}
                  </p>
                </div>
                <div className="p-2 rounded bg-destructive/10 text-destructive">
                  <span>{t("detailModal.scrapQty")}</span>
                  <p className="font-mono font-bold text-sm mt-0.5">
                    {workOrder.scrapQuantity.toLocaleString()} {workOrder.unit}
                  </p>
                </div>
              </div>
            </div>

            {workOrder.notes && (
              <div className="p-3 rounded-lg border bg-muted/10 text-xs">
                <span className="font-semibold text-foreground">{t("detailModal.notes")}:</span>
                <p className="text-muted-foreground mt-1">{workOrder.notes}</p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: BOM MATERIALS */}
          <TabsContent value="materials" className="space-y-3 pt-1">
            {workOrder.materials.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                {t("detailModal.noMaterials")}
              </div>
            ) : (
              <div className="rounded-md border bg-card overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold">{t("detailModal.materialsTable.code")}</TableHead>
                      <TableHead className="text-xs font-bold">{t("detailModal.materialsTable.name")}</TableHead>
                      <TableHead className="text-xs font-bold">{t("detailModal.materialsTable.lotNo")}</TableHead>
                      <TableHead className="text-xs font-bold text-right">{t("detailModal.materialsTable.required")}</TableHead>
                      <TableHead className="text-xs font-bold text-right">{t("detailModal.materialsTable.consumed")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workOrder.materials.map((mat) => (
                      <TableRow key={mat.id} className="text-xs">
                        <TableCell className="font-mono font-semibold">{mat.materialCode}</TableCell>
                        <TableCell className="font-medium text-foreground">{mat.materialName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {mat.lotNumber}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-right text-muted-foreground">
                          {mat.requiredQty.toLocaleString()} {mat.unit}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-right text-foreground">
                          {mat.consumedQty.toLocaleString()} {mat.unit}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: DEVIATIONS */}
          <TabsContent value="deviations" className="space-y-3 pt-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground">
                {workOrder.deviations.length} {t("table.deviations")} Logged
              </span>
              {onOpenDeviationDialog && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenDeviationDialog(workOrder)}
                  className="h-7 text-xs font-bold gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>{t("actions.logDeviation")}</span>
                </Button>
              )}
            </div>

            {workOrder.deviations.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg bg-muted/10 p-6">
                <ShieldCheck className="h-8 w-8 text-success mx-auto mb-2 opacity-80" />
                <p>{t("detailModal.noDeviations")}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {workOrder.deviations.map((dev) => (
                  <div key={dev.id} className="p-3 rounded-lg border bg-card space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">{dev.code}</span>
                        <Badge
                          variant={
                            dev.severity === "critical"
                              ? "destructive"
                              : dev.severity === "major"
                                ? "warning"
                                : "secondary"
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {t(`severity.${dev.severity}`)}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {formatDate(dev.loggedAt)} • {dev.loggedBy}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground">{dev.title}</p>
                    <p className="text-muted-foreground">{dev.description}</p>
                    {dev.correctiveAction && (
                      <div className="p-2 rounded bg-muted/40 text-[11px] border">
                        <span className="font-bold text-foreground">Action Taken: </span>
                        <span className="text-muted-foreground">{dev.correctiveAction}</span>
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

            {workOrder.auditLogs.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No audit entries recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {workOrder.auditLogs.map((log) => (
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
