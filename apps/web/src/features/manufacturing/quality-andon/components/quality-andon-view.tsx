"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { AndonStatusBadge } from "./andon-status-badge";
import { QualityAndonKPIs } from "./quality-andon-kpis";
import { QualityAndonLiveBoard } from "./quality-andon-live-board";
import { QualityAndonTrendChart } from "./quality-andon-trend-chart";
import { QualityAndonRecentAlarms } from "./quality-andon-recent-alarms";
import { QualityAndonDonut } from "./quality-andon-donut";
import { QualityAndonCapaSummary } from "./quality-andon-capa-summary";
import { QualityAndonQuickActions } from "./quality-andon-quick-actions";
import { QualityAndonDetailModal } from "./quality-andon-detail-modal";
import { QualityAndonEscalateDialog } from "./quality-andon-escalate-dialog";
import { QualityAndonIncidentDialog } from "./quality-andon-incident-dialog";
import { useAndonDashboard, useAndonParameters, useAcknowledgeAlarm } from "../hooks/use-quality-andon";
import type { AndonParameterItem, AndonStatus, ParameterCategory, RecentAlarmItem } from "../types/quality-andon.types";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate, cn } from "@/lib/utils";
import { useExportProgress } from "@/lib/use-export-progress";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Plus,
  Search,
  Eye,
  CheckCircle2,
  BellRing,
  AlertTriangle,
  Download,
  ListFilter,
} from "lucide-react";


const AVAILABLE_LINES = [
  { id: "LINE-1", name: "Line A - Filling" },
  { id: "LINE-2", name: "Line B - Packaging" },
  { id: "LINE-3", name: "Line C - Blister" },
  { id: "LINE-4", name: "Line D - Cartoning" },
];

const AVAILABLE_PRODUCTS = [
  { id: "PROD-1", name: "Paracetamol 500mg" },
  { id: "PROD-2", name: "Amoxicillin 250mg" },
  { id: "PROD-3", name: "Cough Syrup 100ml" },
  { id: "PROD-4", name: "Ibuprofen 400mg" },
];

const PARAMETER_CATEGORIES: { id: ParameterCategory; labelKey: string }[] = [
  { id: "temperature", labelKey: "categories.temperature" },
  { id: "speed", labelKey: "categories.speed" },
  { id: "viscosity", labelKey: "categories.viscosity" },
  { id: "pressure", labelKey: "categories.pressure" },
  { id: "hardness", labelKey: "categories.hardness" },
  { id: "weight", labelKey: "categories.weight" },
  { id: "dimension", labelKey: "categories.dimension" },
];

export function QualityAndonView() {
  const t = useTranslations("manufacturingQualityAndon");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<AndonStatus | "all">("all");
  const [lineFilter, setLineFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<ParameterCategory | "all">("all");

  const [viewingParam, setViewingParam] = useState<AndonParameterItem | null>(null);
  const [escalateParam, setEscalateParam] = useState<AndonParameterItem | null>(null);
  const [incidentParam, setIncidentParam] = useState<AndonParameterItem | null>(null);

  const exportProgress = useExportProgress();
  const acknowledgeMutation = useAcknowledgeAlarm();

  // Queries
  const { data: dashboardData, isLoading: isDashboardLoading, isError: isDashboardError } = useAndonDashboard();
  const { data: paramData, isLoading: isParamLoading, isError: isParamError, refetch } = useAndonParameters({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    line_id: lineFilter !== "all" ? lineFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
  });

  const parameters = paramData?.data ?? [];
  const pagination = paramData?.meta?.pagination;

  const handleAcknowledge = async (param: AndonParameterItem) => {
    try {
      await acknowledgeMutation.mutateAsync({
        parameterId: param.id,
        actorName: param.operatorName,
      });
      toast.success(t("messages.alarmAcknowledged", { code: param.code, actor: param.operatorName }));
    } catch {
      toast.error(t("messages.failed"));
    }
  };

  const handleExport = async () => {
    try {
      await exportProgress.runWithProgress({
        endpoint: "/manufacturing/quality-andon/export",
        params: {
          search: debouncedSearch || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          line_id: lineFilter !== "all" ? lineFilter : undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
        },
      });
      toast.success(t("exportCsv") + " complete");
    } catch {
      toast.error(t("messages.failed"));
    }
  };

  const handleSelectRecentAlarm = (alarm: RecentAlarmItem) => {
    const found = parameters.find((p) => p.id === alarm.parameterId);
    if (found) {
      setViewingParam(found);
    } else if (parameters.length > 0) {
      setViewingParam(parameters[0]);
    }
  };

  if (isDashboardError || isParamError) {
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
      {/* 1. Header with Top Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Line Filter */}
          <Select value={lineFilter} onValueChange={setLineFilter}>
            <SelectTrigger className="w-36 h-9 text-xs cursor-pointer">
              <SelectValue placeholder={t("allLines")} />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all" className="text-xs cursor-pointer">{t("allLines")}</SelectItem>
              {AVAILABLE_LINES.map((l) => (
                <SelectItem key={l.id} value={l.id} className="text-xs cursor-pointer">
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Product Filter */}
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-40 h-9 text-xs cursor-pointer">
              <SelectValue placeholder={t("allProducts")} />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all" className="text-xs cursor-pointer">{t("allProducts")}</SelectItem>
              {AVAILABLE_PRODUCTS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>


      {/* 2. Top Executive KPI Cards */}
      {isDashboardLoading || !dashboardData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <QualityAndonKPIs kpis={dashboardData.kpis} />
      )}

      {/* 3. Middle Section: Live Andon Board (Left) & Hourly Alarm Trend (Right) */}
      {isDashboardLoading || !dashboardData ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-6 xl:col-span-7 h-72 rounded-lg" />
          <Skeleton className="lg:col-span-6 xl:col-span-5 h-72 rounded-lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 xl:col-span-7">
            <QualityAndonLiveBoard
              lines={dashboardData.liveBoard}
              onViewLine={(id) => {
                const target = parameters.find((p) => p.lineId === id) || parameters[0];
                if (target) setViewingParam(target);
              }}
              onViewAll={() => {
                const tableElem = document.getElementById("detailed-parameter-table");
                tableElem?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>

          <div className="lg:col-span-6 xl:col-span-5">
            <QualityAndonTrendChart data={dashboardData.hourlyTrends} />
          </div>
        </div>
      )}

      {/* 4. Bottom Row: 4 Cards (Recent Alarms, In-Process Donut, CAPA Summary, Quick Actions) */}
      {isDashboardLoading || !dashboardData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QualityAndonRecentAlarms
            alarms={dashboardData.recentAlarms}
            onSelectAlarm={handleSelectRecentAlarm}
            onViewAll={() => {
              const tableElem = document.getElementById("detailed-parameter-table");
              tableElem?.scrollIntoView({ behavior: "smooth" });
            }}
          />

          <QualityAndonDonut distribution={dashboardData.qualityDistribution} />

          <QualityAndonCapaSummary
            summary={dashboardData.capaSummary}
            onViewCapaList={() => {
              if (parameters.length > 0) setViewingParam(parameters[0]);
            }}
          />

          <QualityAndonQuickActions
            onCreateDeviation={() => {
              if (parameters.length > 0) setIncidentParam(parameters[0]);
            }}
            onRaiseCapa={() => {
              if (parameters.length > 0) setIncidentParam(parameters[0]);
            }}
            onQualityCheckEntry={() => {
              if (parameters.length > 0) setViewingParam(parameters[0]);
            }}
            onViewAuditTrail={() => {
              if (parameters.length > 0) setViewingParam(parameters[0]);
            }}
          />
        </div>
      )}

      {/* 5. Detailed In-Process Parameter & CPP Table Section */}
      <div id="detailed-parameter-table" className="pt-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-primary" />
              <span>In-Process Critical Process Parameters (CPP) Record</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Direct telemetry measurement and specification limits per active batch
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exportProgress.isExporting}
              className="h-8 text-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {exportProgress.label(t("exportCsv"), t("exporting"))}
            </Button>

            {parameters.length > 0 && (
              <Button
                size="sm"
                onClick={() => setIncidentParam(parameters[0])}
                className="h-8 text-xs font-bold cursor-pointer hover:-translate-y-0.5 transition-all"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {t("logIncident")}
              </Button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as AndonStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40 h-8 text-xs cursor-pointer">
              <SelectValue placeholder={t("filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs cursor-pointer">{t("allStatuses")}</SelectItem>
              <SelectItem value="normal" className="text-xs cursor-pointer">{t("status.normal")}</SelectItem>
              <SelectItem value="warning" className="text-xs cursor-pointer text-warning">{t("status.warning")}</SelectItem>
              <SelectItem value="critical_alarm" className="text-xs cursor-pointer text-destructive font-bold">{t("status.critical_alarm")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v as ParameterCategory | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36 h-8 text-xs cursor-pointer">
              <SelectValue placeholder={t("filterByCategory")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs cursor-pointer">{t("allCategories")}</SelectItem>
              {PARAMETER_CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs cursor-pointer">
                  {t(cat.labelKey as Parameters<typeof t>[0])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table Container */}
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs font-bold">{t("table.parameterAndBatch")}</TableHead>
                <TableHead className="text-xs font-bold">{t("table.lineAndMachine")}</TableHead>
                <TableHead className="text-xs font-bold">{t("table.limitsVsActual")}</TableHead>
                <TableHead className="text-xs font-bold">{t("table.personnel")}</TableHead>
                <TableHead className="text-xs font-bold">{t("table.lastSample")}</TableHead>
                <TableHead className="text-xs font-bold">{t("table.status")}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {isParamLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-7 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : parameters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                parameters.map((param) => (
                  <TableRow key={param.id} className="text-xs hover:bg-muted/20">
                    {/* Parameter Name & Batch */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => setViewingParam(param)}
                          className="font-bold text-primary hover:underline cursor-pointer text-left"
                        >
                          {param.name}
                        </button>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold text-foreground">
                            {param.code}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1 py-0.2 rounded border">
                            {param.batchNumber}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Line & Equipment */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{param.lineName}</span>
                        {param.machineName && (
                          <span className="text-[10px] text-muted-foreground">{param.machineName}</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Limits vs Measured */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-muted-foreground">Spec:</span>
                          <span className="font-mono font-semibold text-foreground">
                            {param.lowerSpecLimit.toLocaleString()} - {param.upperSpecLimit.toLocaleString()} {param.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-[11px]">Actual:</span>
                          <span
                            className={cn(
                              "font-mono font-bold text-xs",
                              param.status === "critical_alarm"
                                ? "text-destructive font-extrabold"
                                : param.status === "warning"
                                  ? "text-warning"
                                  : "text-success",
                            )}
                          >
                            {param.currentValue.toLocaleString()} {param.unit}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            (T: {param.targetValue.toLocaleString()})
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Personnel (Operator & QA Inspector) */}
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        {/* Operator */}
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarImage src={param.operatorAvatar} alt={param.operatorName} />
                            <AvatarFallback>{param.operatorName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground text-[11px] leading-none">
                              {param.operatorName}
                            </span>
                            <span className="text-[9px] text-muted-foreground">Operator</span>
                          </div>
                        </div>

                        {/* QA Inspector */}
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarImage src={param.qaInspectorAvatar} alt={param.qaInspectorName} />
                            <AvatarFallback>{param.qaInspectorName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground text-[11px] leading-none">
                              {param.qaInspectorName}
                            </span>
                            <span className="text-[9px] text-primary">IPQA Officer</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Last Sample Reading */}
                    <TableCell>
                      <div className="flex flex-col font-mono text-[11px]">
                        <span className="text-foreground">{formatDate(param.lastSampleTime)}</span>
                        {param.isAcknowledged ? (
                          <span className="text-[10px] text-success font-sans font-medium flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{t("actions.acknowledged")}</span>
                          </span>
                        ) : param.status !== "normal" ? (
                          <span className="text-[10px] text-destructive font-sans font-bold flex items-center gap-1 mt-0.5 animate-pulse">
                            <BellRing className="h-3 w-3" />
                            <span>Unacknowledged</span>
                          </span>
                        ) : null}
                      </div>
                    </TableCell>

                    {/* Andon Status Badge */}
                    <TableCell>
                      <AndonStatusBadge status={param.status} />
                    </TableCell>

                    {/* Actions Dropdown */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingParam(param)} className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            {t("actions.viewDetails")}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {param.status !== "normal" && !param.isAcknowledged && (
                            <DropdownMenuItem
                              onClick={() => handleAcknowledge(param)}
                              className="cursor-pointer text-success focus:text-success"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {t("actions.acknowledge")}
                            </DropdownMenuItem>
                          )}

                          {param.status !== "normal" && (
                            <DropdownMenuItem
                              onClick={() => setEscalateParam(param)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <BellRing className="h-4 w-4 mr-2" />
                              {t("actions.escalateToQA")}
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => setIncidentParam(param)}
                            className="cursor-pointer text-warning focus:text-warning"
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            {t("actions.logCapa")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
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
      </div>

      {/* Modals & Dialogs */}
      <QualityAndonDetailModal
        open={!!viewingParam}
        onClose={() => setViewingParam(null)}
        parameter={viewingParam}
        onOpenEscalateDialog={(param) => {
          setViewingParam(null);
          setEscalateParam(param);
        }}
        onOpenIncidentDialog={(param) => {
          setViewingParam(null);
          setIncidentParam(param);
        }}
      />

      <QualityAndonEscalateDialog
        open={!!escalateParam}
        onClose={() => setEscalateParam(null)}
        parameter={escalateParam}
      />

      <QualityAndonIncidentDialog
        open={!!incidentParam}
        onClose={() => setIncidentParam(null)}
        parameter={incidentParam}
      />
    </div>
  );
}
