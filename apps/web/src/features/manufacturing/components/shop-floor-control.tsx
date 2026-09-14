"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { WorkOrder, WorkOrderStatus } from "../types/oee.types";

interface ShopFloorControlProps {
  workOrders: WorkOrder[];
}

export function ShopFloorControl({ workOrders }: ShopFloorControlProps) {
  const t = useTranslations("manufacturing");

  const getStatusBadge = (status: WorkOrderStatus) => {
    switch (status) {
      case "in_progress":
        return <Badge variant="success" className="text-xs font-semibold">{t("workOrder.status.in_progress")}</Badge>;
      case "paused":
        return <Badge variant="warning" className="text-xs font-semibold">{t("workOrder.status.paused")}</Badge>;
      case "completed":
        return <Badge variant="secondary" className="text-xs font-semibold">{t("workOrder.status.completed")}</Badge>;
      case "draft":
      default:
        return <Badge variant="outline" className="text-xs font-semibold">{t("workOrder.status.draft")}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">{t("workOrder.title")}</h3>
          <p className="text-xs text-muted-foreground">Pemantauan eksekusi Perintah Kerja (Work Order) dan pencapaian target output.</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("workOrder.code")}</TableHead>
              <TableHead>{t("workOrder.product")}</TableHead>
              <TableHead>{t("workOrder.line")}</TableHead>
              <TableHead>{t("workOrder.machine")}</TableHead>
              <TableHead>{t("workOrder.progress")}</TableHead>
              <TableHead>{t("workOrder.scrap")}</TableHead>
              <TableHead>{t("workOrder.operator")}</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Tidak ada Work Order yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              workOrders.map((wo) => {
                const progressPct = Math.min(100, Math.round((wo.completedQuantity / wo.targetQuantity) * 100));

                return (
                  <TableRow key={wo.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-semibold text-primary">
                      {wo.code}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{wo.productName}</div>
                      <div className="text-[11px] text-muted-foreground">{wo.sku}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{wo.lineName}</TableCell>
                    <TableCell className="text-xs font-medium text-foreground">{wo.machineName}</TableCell>

                    {/* Progress Bar & Output */}
                    <TableCell className="w-[200px]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">
                            {wo.completedQuantity.toLocaleString("id-ID")} / {wo.targetQuantity.toLocaleString("id-ID")}
                          </span>
                          <span className="text-[11px] font-semibold text-muted-foreground">{progressPct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              wo.status === "completed" ? "bg-success" : wo.status === "paused" ? "bg-warning" : "bg-primary"
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* Scrap Count */}
                    <TableCell>
                      {wo.scrapQuantity > 0 ? (
                        <Badge variant="destructive" className="text-xs font-bold px-2 py-0.5">
                          {wo.scrapQuantity} Defect
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-foreground font-medium">{wo.operatorName}</TableCell>

                    {/* Status Badge */}
                    <TableCell className="text-right">{getStatusBadge(wo.status)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
