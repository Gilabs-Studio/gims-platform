"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { PageMotion } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus } from "lucide-react";
import type { MachineDetail, MachineStatus } from "../types/machine.types";
import { MachineStatusBadge } from "./machine-status-badge";
import { Machine24hTimeline } from "./machine-24h-timeline";
import { MachineTelemetryCharts } from "./machine-telemetry-charts";
import { MachineOeeGauge } from "./machine-oee-gauge";
import { MachineMaintenanceKpis } from "./machine-maintenance-kpis";
import { MachineIncidentHistoryTable } from "./machine-incident-history-table";
import { MachineIncidentModal } from "./machine-incident-modal";
import { useMachinesStore } from "../stores/use-machines-store";

interface MachineDetailViewProps {
  machine: MachineDetail;
  onUpdateStatus?: (status: MachineStatus) => void;
  isUpdatingStatus?: boolean;
}

export function MachineDetailView({
  machine,
  onUpdateStatus,
  isUpdatingStatus,
}: MachineDetailViewProps) {
  const t = useTranslations("manufacturingMachines");
  const router = useRouter();
  const { openIncidentModal } = useMachinesStore();
  const [activeTab, setActiveTab] = useState<"telemetry" | "incidents" | "specs">("telemetry");

  const machineImage =
    machine.imageUrl ||
    (machine.code.includes("INJ")
      ? "/images/machines/inj-310.svg"
      : machine.code.includes("CNC")
      ? "/images/machines/cnc-v01.svg"
      : machine.code.includes("STP")
      ? "/images/machines/stp-200.svg"
      : "/images/machines/rob-k01.svg");

  return (
    <PageMotion className="space-y-6">
      {/* Header matching sales-rep-detail-page */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer mt-0.5 shrink-0"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-start gap-4">
            <div className="relative h-14 w-18 shrink-0 rounded-lg bg-muted/30 p-1 flex items-center justify-center border border-border/40">
              <Image
                src={machineImage}
                alt={machine.name}
                width={72}
                height={56}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {machine.name}
                </h1>
                <MachineStatusBadge status={machine.status} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-mono">
                  {machine.code}
                </Badge>
                <Badge variant="outline">
                  {machine.lineName}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {machine.technicalSpecs.model}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onUpdateStatus && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">
                {t("actions.changeStatus")}:
              </span>
              <Select
                value={machine.status}
                onValueChange={(val: MachineStatus) => onUpdateStatus(val)}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="w-36 h-9 text-xs bg-card cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="running">{t("status.running")}</SelectItem>
                  <SelectItem value="idle">{t("status.idle")}</SelectItem>
                  <SelectItem value="downtime">{t("status.downtime")}</SelectItem>
                  <SelectItem value="maintenance">{t("status.maintenance")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <button
            type="button"
            onClick={() => openIncidentModal(machine.id)}
            className="h-9 px-3.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 text-rose-500" />
            <span>{t("actions.reportIncident")}</span>
          </button>
        </div>
      </div>

      {/* Maintenance Reliability KPIs Strip */}
      <MachineMaintenanceKpis
        healthIndex={machine.healthIndex}
        mtbfHours={machine.mtbfHours}
        mttrMinutes={machine.mttrMinutes}
        totalDowntimeTodayMinutes={machine.totalDowntimeTodayMinutes}
        totalIncidentsMonth={machine.totalIncidentsMonth}
      />

      {/* 3-Column Performance & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Col 1: OEE Performance Card */}
        <div>
          <MachineOeeGauge
            oeeScore={machine.oeeScore}
            availabilityScore={machine.availabilityScore}
            performanceScore={machine.performanceScore}
            qualityScore={machine.qualityScore}
          />
        </div>

        {/* Col 2: Live Sensors Telemetry */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-foreground">
              {t("charts.telemetryTitle")}
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              Live
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/30 space-y-1">
              <span className="text-[11px] text-muted-foreground block">
                {t("metrics.temperature")}
              </span>
              <div className="text-lg font-bold font-mono text-foreground">
                {machine.currentTelemetry.temperature}°C
              </div>
              <span
                className={`text-[10px] font-medium capitalize block ${
                  machine.currentTelemetry.temperatureStatus === "critical"
                    ? "text-rose-600 font-semibold"
                    : machine.currentTelemetry.temperatureStatus === "warning"
                    ? "text-amber-600 font-semibold"
                    : "text-emerald-600"
                }`}
              >
                {machine.currentTelemetry.temperatureStatus}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 space-y-1">
              <span className="text-[11px] text-muted-foreground block">
                {t("metrics.vibration")}
              </span>
              <div className="text-lg font-bold font-mono text-foreground">
                {machine.currentTelemetry.vibration} G
              </div>
              <span
                className={`text-[10px] font-medium capitalize block ${
                  machine.currentTelemetry.vibrationStatus === "critical"
                    ? "text-rose-600 font-semibold"
                    : machine.currentTelemetry.vibrationStatus === "warning"
                    ? "text-amber-600 font-semibold"
                    : "text-emerald-600"
                }`}
              >
                {machine.currentTelemetry.vibrationStatus}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 space-y-1">
              <span className="text-[11px] text-muted-foreground block">
                {t("metrics.spindleRpm")}
              </span>
              <div className="text-lg font-bold font-mono text-foreground">
                {machine.currentTelemetry.spindleRpm}
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">RPM</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 space-y-1">
              <span className="text-[11px] text-muted-foreground block">
                {t("metrics.powerDraw")}
              </span>
              <div className="text-lg font-bold font-mono text-foreground">
                {machine.currentTelemetry.powerDraw}
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">kW</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("metrics.cycleTime")}:</span>
            <strong className="font-mono text-foreground">
              {machine.currentTelemetry.cycleTimeSeconds}s ({machine.currentTelemetry.cycleEfficiency}%)
            </strong>
          </div>
        </div>

        {/* Col 3: Personnel & Active Work Order */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm text-foreground">
            {t("staff.operator")} &amp; {t("staff.technician")}
          </h3>

          <div className="space-y-3">
            {/* Operator */}
            <div className="p-3 rounded-lg bg-muted/30 flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0 border border-border">
                <AvatarFallback dataSeed={machine.assignedOperator.name}>
                  {machine.assignedOperator.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-medium text-muted-foreground uppercase block">
                  {t("staff.operator")}
                </span>
                <div className="text-xs font-semibold text-foreground truncate">
                  {machine.assignedOperator.name}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {machine.assignedOperator.shift}
                </div>
              </div>
            </div>

            {/* Lead Technician */}
            <div className="p-3 rounded-lg bg-muted/30 flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0 border border-border">
                <AvatarFallback dataSeed={machine.assignedTechnician.name}>
                  {machine.assignedTechnician.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-medium text-muted-foreground uppercase block">
                  {t("staff.technician")}
                </span>
                <div className="text-xs font-semibold text-foreground truncate">
                  {machine.assignedTechnician.name}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {machine.assignedTechnician.phone}
                </div>
              </div>
            </div>

            {/* Active WO Strip */}
            {machine.activeWorkOrder && (
              <div className="pt-2 border-t border-border/50 space-y-1 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{t("activeWorkOrder.title")}:</span>
                  <span className="font-bold text-foreground font-mono">{machine.activeWorkOrder.code}</span>
                </div>
                <div className="text-foreground text-xs truncate">
                  {machine.activeWorkOrder.productName}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 24-Hour Continuous Timeline */}
      <Machine24hTimeline timelineBlocks={machine.timeline24h} />

      {/* Detail Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("telemetry")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === "telemetry"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("charts.telemetryTitle")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("incidents")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === "incidents"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("incidentHistory.title")} ({machine.incidentLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("specs")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === "specs"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("technicalSpecs.title")}
          </button>
        </div>

        {/* Tab 1: Telemetry Sensor Curves */}
        {activeTab === "telemetry" && (
          <MachineTelemetryCharts data={machine.telemetryTrend} />
        )}

        {/* Tab 2: Incident History Table */}
        {activeTab === "incidents" && (
          <MachineIncidentHistoryTable
            incidentLogs={machine.incidentLogs}
            onReportIncidentClick={() => openIncidentModal(machine.id)}
          />
        )}

        {/* Tab 3: Technical Specifications */}
        {activeTab === "specs" && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-sm text-foreground">
              {t("technicalSpecs.title")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  {t("technicalSpecs.model")}
                </span>
                <div className="font-medium text-foreground">
                  {machine.technicalSpecs.model}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  {t("technicalSpecs.serial")}
                </span>
                <div className="font-medium text-foreground font-mono">
                  {machine.technicalSpecs.serialNumber}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  {t("technicalSpecs.manufacturer")}
                </span>
                <div className="font-medium text-foreground">
                  {machine.technicalSpecs.manufacturer}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  {t("technicalSpecs.installed")}
                </span>
                <div className="font-medium text-foreground font-mono">
                  {machine.technicalSpecs.installationDate}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  {t("technicalSpecs.lastService")}
                </span>
                <div className="font-medium text-foreground font-mono">
                  {machine.technicalSpecs.lastServiceDate}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  {t("technicalSpecs.nextService")}
                </span>
                <div className="font-medium text-foreground font-mono">
                  {machine.technicalSpecs.nextScheduledService}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Incident Modal Triggered from this View */}
      <MachineIncidentModal machine={machine} />
    </PageMotion>
  );
}
