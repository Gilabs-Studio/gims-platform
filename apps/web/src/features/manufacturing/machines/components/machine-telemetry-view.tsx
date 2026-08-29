"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import {
  Server,
  Play,
  Pause,
  AlertTriangle,
  Wrench,
  Activity,
  Search,
  LayoutGrid,
  List,
  Plus,
} from "lucide-react";
import { PageMotion } from "@/components/motion";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMachineList } from "../hooks/use-machine-list";
import { MachineGrid } from "./machine-grid";
import { MachineIncidentModal } from "./machine-incident-modal";
import type { MachineItem } from "../types/machine.types";

export function MachineTelemetryView() {
  const t = useTranslations("manufacturingMachines");
  const router = useRouter();

  const {
    machines,
    summary,
    isLoading,
    selectedLineId,
    statusFilter,
    searchQuery,
    viewMode,
    setSelectedLineId,
    setStatusFilter,
    setSearchQuery,
    setViewMode,
    openIncidentModal,
  } = useMachineList();

  const [incidentTargetMachine, setIncidentTargetMachine] = useState<MachineItem | null>(null);

  const lines = [
    { id: "all", name: t("actions.filterLine") },
    { id: "LINE-A", name: "Line A - Injection Molding" },
    { id: "LINE-B", name: "Line B - CNC Machining" },
    { id: "LINE-C", name: "Line C - Stamping Press" },
    { id: "LINE-D", name: "Line D - Robotic Assembly" },
  ];

  const statuses = [
    { id: "all", label: t("actions.filterStatus") },
    { id: "running", label: t("status.running") },
    { id: "idle", label: t("status.idle") },
    { id: "downtime", label: t("status.downtime") },
    { id: "maintenance", label: t("status.maintenance") },
  ];

  return (
    <PageMotion className="space-y-6">
      {/* Header matching sales-overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Top-right Filters & Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Select value={selectedLineId} onValueChange={setSelectedLineId}>
            <SelectTrigger className="w-40 h-9 text-xs bg-card cursor-pointer">
              <SelectValue placeholder={t("actions.filterLine")} />
            </SelectTrigger>
            <SelectContent>
              {lines.map((line) => (
                <SelectItem key={line.id} value={line.id}>
                  {line.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-xs bg-card cursor-pointer">
              <SelectValue placeholder={t("actions.filterStatus")} />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((st) => (
                <SelectItem key={st.id} value={st.id}>
                  {st.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => {
              setIncidentTargetMachine(null);
              openIncidentModal();
            }}
            className="h-9 px-3.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 text-rose-500" />
            <span>{t("actions.reportIncident")}</span>
          </button>
        </div>
      </div>

      {/* 6 Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Total Fleet */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">
              {t("kpis.totalMachines")}
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {summary.totalMachines}
            </div>
          </div>
        </div>

        {/* 2. Running */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Play className="h-5 w-5 fill-emerald-600" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">
              {t("kpis.running")}
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {summary.runningCount}
            </div>
          </div>
        </div>

        {/* 3. Idle */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Pause className="h-5 w-5 fill-amber-600" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">
              {t("kpis.idle")}
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {summary.idleCount}
            </div>
          </div>
        </div>

        {/* 4. Breakdown */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">
              {t("kpis.downtime")}
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {summary.downtimeCount}
            </div>
          </div>
        </div>

        {/* 5. In Maintenance */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">
              {t("kpis.maintenance")}
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {summary.maintenanceCount}
            </div>
          </div>
        </div>

        {/* 6. Health Index */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-[11px] text-muted-foreground font-medium truncate">
              {t("kpis.avgHealth")}
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-foreground">
            {summary.averageHealthIndex}%
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${summary.averageHealthIndex}%` }}
            />
          </div>
        </div>
      </div>

      {/* Search & View Mode Switcher */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("actions.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-card"
          />
        </div>

        <div className="flex items-center border border-border rounded-lg bg-card p-0.5 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === "table"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Table View"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === "grid"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Card View"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Machine Fleet List / Grid */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-24 rounded-xl bg-card border border-border animate-pulse" />
          <div className="h-24 rounded-xl bg-card border border-border animate-pulse" />
          <div className="h-24 rounded-xl bg-card border border-border animate-pulse" />
        </div>
      ) : (
        <MachineGrid
          machines={machines}
          viewMode={viewMode}
          onSelectMachine={(m) => {
            router.push(`/manufacturing/machines/${m.id}`);
          }}
          onReportIncident={(m) => {
            const found = machines.find((item) => item.id === m.id);
            setIncidentTargetMachine(found || null);
            openIncidentModal(m.id);
          }}
        />
      )}

      {/* Incident Reporting Modal */}
      <MachineIncidentModal
        machine={incidentTargetMachine}
        allMachines={machines}
      />
    </PageMotion>
  );
}
