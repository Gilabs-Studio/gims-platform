"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { WorkOrderStatusBadge } from "./work-order-status-badge";
import { BatchStatusBadge } from "./batch-status-badge";
import { WorkOrderDetailModal } from "./work-order-detail-modal";
import { WorkOrderFormDialog } from "./work-order-form-dialog";
import { WorkOrderDeviationDialog } from "./work-order-deviation-dialog";
import { useWorkOrders, useUpdateWorkOrderStatus } from "../hooks/use-work-orders";
import type { WorkOrder, WorkOrderStatus } from "../types/work-order.types";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate } from "@/lib/utils";
import { useExportProgress } from "@/lib/use-export-progress";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Plus,
  Search,
  Eye,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
} from "lucide-react";

const AVAILABLE_LINES = [
  { id: "LINE-1", name: "Line 1 - Granulation & Tableting" },
  { id: "LINE-2", name: "Line 2 - Capsule Encapsulation" },
  { id: "LINE-3", name: "Line 3 - Liquid Syrup Formulation" },
  { id: "LINE-4", name: "Line 4 - Blister Packaging & Secondary Boxing" },
];

export function WorkOrderManagement() {
  const t = useTranslations("manufacturingWorkOrders");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | "all">("all");
  const [lineFilter, setLineFilter] = useState<string>("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingWo, setViewingWo] = useState<WorkOrder | null>(null);
  const [deviationWo, setDeviationWo] = useState<WorkOrder | null>(null);

  const exportProgress = useExportProgress();
  const updateStatusMutation = useUpdateWorkOrderStatus();

  const { data, isLoading, isError, refetch } = useWorkOrders({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    line_id: lineFilter !== "all" ? lineFilter : undefined,
  });

  const orders = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleStatusChange = async (wo: WorkOrder, newStatus: WorkOrderStatus) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: wo.id,
        status: newStatus,
        actorName: wo.operatorName,
      });
      toast.success(t("messages.statusUpdated", { status: t(`status.${newStatus}`) }));
    } catch {
      toast.error(t("messages.failed"));
    }
  };

  const handleExport = async () => {
    try {
      await exportProgress.runWithProgress({
        endpoint: "/manufacturing/work-orders/export",
        params: {
          search: debouncedSearch || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          line_id: lineFilter !== "all" ? lineFilter : undefined,
        },
      });
      toast.success(t("exportCsv") + " complete");
    } catch {
      toast.error(t("messages.failed"));
    }
  };

  if (isError) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-destructive font-semibold">{t("error")}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as WorkOrderStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44 h-9 text-xs cursor-pointer">
            <SelectValue placeholder={t("filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs cursor-pointer">{t("allStatuses")}</SelectItem>
            <SelectItem value="draft" className="text-xs cursor-pointer">{t("status.draft")}</SelectItem>
            <SelectItem value="in_progress" className="text-xs cursor-pointer">{t("status.in_progress")}</SelectItem>
            <SelectItem value="paused" className="text-xs cursor-pointer">{t("status.paused")}</SelectItem>
            <SelectItem value="completed" className="text-xs cursor-pointer">{t("status.completed")}</SelectItem>
            <SelectItem value="cancelled" className="text-xs cursor-pointer">{t("status.cancelled")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={lineFilter}
          onValueChange={(v) => {
            setLineFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-56 h-9 text-xs cursor-pointer">
            <SelectValue placeholder={t("filterByLine")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs cursor-pointer">{t("allLines")}</SelectItem>
            {AVAILABLE_LINES.map((line) => (
              <SelectItem key={line.id} value={line.id} className="text-xs cursor-pointer">
                {line.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exportProgress.isExporting}
          className="h-9 text-xs cursor-pointer"
        >
          <Download className="h-4 w-4 mr-2" />
          {exportProgress.label(t("exportCsv"), t("exporting"))}
        </Button>

        <Button
          onClick={() => setIsFormOpen(true)}
          className="h-9 text-xs font-bold cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("add")}
        </Button>
      </div>

      {/* Work Orders Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.woAndBatch")}</TableHead>
              <TableHead>{t("table.product")}</TableHead>
              <TableHead>{t("table.line")}</TableHead>
              <TableHead>{t("table.operator")}</TableHead>
              <TableHead>{t("table.timeline")}</TableHead>
              <TableHead>{t("table.yieldProgress")}</TableHead>
              <TableHead>{t("table.deviations")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-xs">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              orders.map((wo) => {
                const progressPct =
                  wo.targetQuantity > 0
                    ? Math.min(100, Math.round((wo.completedQuantity / wo.targetQuantity) * 100))
                    : 0;

                return (
                  <TableRow key={wo.id} className="text-xs">
                    {/* WO Code & Batch Number */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingWo(wo)}
                          className="font-bold text-primary hover:underline cursor-pointer text-left"
                        >
                          {wo.code}
                        </button>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border">
                            {wo.batchNumber}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Product Name & SKU */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{wo.productName}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{wo.productCode}</span>
                      </div>
                    </TableCell>

                    {/* Line / Facility */}
                    <TableCell>
                      <span className="text-muted-foreground font-medium">{wo.lineName}</span>
                    </TableCell>

                    {/* Responsible Operator with Avatar */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={wo.operatorAvatar} alt={wo.operatorName} />
                          <AvatarFallback>{wo.operatorName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-xs leading-none">
                            {wo.operatorName}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {wo.operatorRole}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Timeline */}
                    <TableCell>
                      <div className="flex flex-col text-[11px] font-mono">
                        <span className="text-foreground">
                          {wo.startDate ? formatDate(wo.startDate) : "-"}
                        </span>
                        <span className="text-muted-foreground">
                          {wo.endDate
                            ? formatDate(wo.endDate)
                            : wo.estimatedEndDate
                              ? `Est. ${formatDate(wo.estimatedEndDate)}`
                              : ""}
                        </span>
                      </div>
                    </TableCell>

                    {/* Yield / Output Progress */}
                    <TableCell>
                      <div className="space-y-1 w-28">
                        <div className="flex justify-between text-[11px] font-mono font-semibold">
                          <span>{wo.completedQuantity.toLocaleString()}</span>
                          <span className="text-muted-foreground">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Target: {wo.targetQuantity.toLocaleString()} {wo.unit}
                        </div>
                      </div>
                    </TableCell>

                    {/* Deviations / Scrap */}
                    <TableCell>
                      {wo.deviations.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setViewingWo(wo)}
                          className="cursor-pointer"
                          title={`${wo.deviations.length} Deviation(s) recorded`}
                        >
                          <Badge
                            variant={
                              wo.deviations.some((d) => d.severity === "critical")
                                ? "destructive"
                                : "warning"
                            }
                            className="text-[10px] uppercase font-bold"
                          >
                            {wo.deviations.length} Dev
                          </Badge>
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs font-mono">0</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <WorkOrderStatusBadge status={wo.status} />
                        <BatchStatusBadge status={wo.batchStatus} />
                      </div>
                    </TableCell>

                    {/* Actions Menu */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingWo(wo)} className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            {t("actions.viewDetails")}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {wo.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(wo, "in_progress")}
                              className="cursor-pointer text-success focus:text-success"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              {t("actions.start")}
                            </DropdownMenuItem>
                          )}

                          {wo.status === "in_progress" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(wo, "paused")}
                                className="cursor-pointer text-warning focus:text-warning"
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                {t("actions.pause")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(wo, "completed")}
                                className="cursor-pointer text-success focus:text-success"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {t("actions.complete")}
                              </DropdownMenuItem>
                            </>
                          )}

                          {wo.status === "paused" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(wo, "in_progress")}
                              className="cursor-pointer text-success focus:text-success"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              {t("actions.resume")}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => setDeviationWo(wo)}
                            className="cursor-pointer text-warning focus:text-warning"
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            {t("actions.logDeviation")}
                          </DropdownMenuItem>

                          {wo.status !== "completed" && wo.status !== "cancelled" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(wo, "cancelled")}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {t("actions.cancel")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {pagination && (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {/* Modals & Dialogs */}
      <WorkOrderFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />

      <WorkOrderDetailModal
        open={!!viewingWo}
        onClose={() => setViewingWo(null)}
        workOrder={viewingWo}
        onOpenDeviationDialog={(wo) => {
          setViewingWo(null);
          setDeviationWo(wo);
        }}
      />

      <WorkOrderDeviationDialog
        open={!!deviationWo}
        onClose={() => setDeviationWo(null)}
        workOrder={deviationWo}
      />
    </div>
  );
}
