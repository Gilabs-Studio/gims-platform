"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { PageMotion } from "@/components/motion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "@/i18n/routing";
import { useManufacturingOEE } from "../hooks/use-manufacturing-oee";
import { OeeKpiCards } from "./oee-kpi-cards";
import { OeeTrendChart } from "./oee-trend-chart";
import { DowntimeReasonChart } from "../../downtime/components/downtime-reason-chart";
import { MachineGrid } from "../../machines/components/machine-grid";

export function OeeDashboard() {
  const t = useTranslations("manufacturingOee");
  const router = useRouter();

  const {
    selectedLineId,
    setSelectedLineId,
    timeWindow,
    setTimeWindow,
    searchQuery,
    setSearchQuery,
    machines,
    productionLines,
    downtimeReasons,
    oeeTrend,
    aggregateMetrics,
  } = useManufacturingOEE();

  return (
    <PageMotion className="space-y-6">
      {/* Page Header */}
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

      {/* Overview Main Visual Content */}
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
          onSelectMachine={(m) => {
            router.push(`/manufacturing/machines/${m.id}`);
          }}
        />
      </div>
    </PageMotion>
  );
}
