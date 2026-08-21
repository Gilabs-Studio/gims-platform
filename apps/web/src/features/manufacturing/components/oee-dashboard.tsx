"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { PageMotion } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useManufacturingOEE } from "../hooks/use-manufacturing-oee";
import { OeeKpiCards } from "./oee-kpi-cards";
import { OeeTrendChart } from "./oee-trend-chart";
import { DowntimeReasonChart } from "./downtime-reason-chart";
import { MachineGrid } from "./machine-grid";
import { MachineDetailModal } from "./machine-detail-modal";
import { ShopFloorControl } from "./shop-floor-control";

export function OeeDashboard() {
  const t = useTranslations("manufacturing");

  const {
    activeTab,
    setActiveTab,
    selectedLineId,
    setSelectedLineId,
    timeWindow,
    setTimeWindow,
    searchQuery,
    setSearchQuery,
    machines,
    workOrders,
    productionLines,
    downtimeReasons,
    oeeTrend,
    aggregateMetrics,
    downtimeLogsHistory,
    selectedMachine,
    setSelectedMachine,
  } = useManufacturingOEE();

  return (
    <PageMotion className="space-y-6">
      {/* Page Header (Matching sales-overview-page.tsx layout) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Clean Filter Control Header Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Production Line Filter */}
          <Select value={selectedLineId} onValueChange={setSelectedLineId}>
            <SelectTrigger className="w-[210px] h-9 text-xs cursor-pointer bg-card">
              <SelectValue placeholder={t("filters.line")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.allLines")}</SelectItem>
              {productionLines.map((line) => (
                <SelectItem key={line.id} value={line.id}>
                  {line.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Time Window Selector Pills */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg gap-1">
            <button
              type="button"
              onClick={() => setTimeWindow("shift")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                timeWindow === "shift" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("filters.shift")}
            </button>
            <button
              type="button"
              onClick={() => setTimeWindow("day")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                timeWindow === "day" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("filters.day")}
            </button>
            <button
              type="button"
              onClick={() => setTimeWindow("week")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                timeWindow === "week" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("filters.week")}
            </button>
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-56">
            <Input
              placeholder={t("filters.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs bg-card"
            />
          </div>
        </div>
      </div>

      {/* Top Plant KPI Overview Cards */}
      <OeeKpiCards metrics={aggregateMetrics} />

      {/* Tab Navigation Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tabs.overview")}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("machines")}
            className={`py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "machines"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tabs.machines")} ({machines.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("work-orders")}
            className={`py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "work-orders"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tabs.workOrders")} ({workOrders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("downtime-analysis")}
            className={`py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "downtime-analysis"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tabs.downtime")}
          </button>
        </nav>
      </div>

      {/* Main Tab Content Views */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <OeeTrendChart data={oeeTrend} />
            </div>
            <div className="lg:col-span-5">
              <DowntimeReasonChart data={downtimeReasons} />
            </div>
          </div>

          <MachineGrid
            machines={machines.slice(0, 6)}
            onSelectMachine={setSelectedMachine}
          />
        </div>
      )}

      {activeTab === "machines" && (
        <MachineGrid
          machines={machines}
          onSelectMachine={setSelectedMachine}
        />
      )}

      {activeTab === "work-orders" && (
        <ShopFloorControl workOrders={workOrders} />
      )}

      {activeTab === "downtime-analysis" && (
        <div className="space-y-6">
          <DowntimeReasonChart data={downtimeReasons} />

          <Card className="bg-card border border-border p-5 rounded-lg space-y-4">
            <h3 className="font-bold text-base text-foreground">Catatan Kejadian Downtime Terkini</h3>
            {downtimeLogsHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Tidak ada histori downtime untuk filter terpilih.</p>
            ) : (
              <div className="space-y-2">
                {downtimeLogsHistory.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-muted/30 border border-border flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{log.machineName}</span>
                        <span className="text-muted-foreground">({log.lineName})</span>
                        <Badge variant="destructive" className="text-[10px]">
                          {log.durationMinutes} Menit
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{log.reason}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-foreground">{log.startTime} - {log.endTime}</span>
                      <p className="text-[10px] text-muted-foreground">{log.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Machine Detail Modal */}
      <MachineDetailModal
        machine={selectedMachine}
        open={!!selectedMachine}
        onOpenChange={(open) => !open && setSelectedMachine(null)}
      />
    </PageMotion>
  );
}
