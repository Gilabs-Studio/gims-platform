"use client";

import { useMemo, useState } from "react";
import {
  LINE_DOWNTIME_REASONS,
  LINE_OEE_TRENDS,
  MOCK_MACHINES,
  MOCK_PRODUCTION_LINES,
  MOCK_WORK_ORDERS,
} from "../services/mock-manufacturing-data";
import type {
  MachineItem,
  OEEMetrics,
  ProductionLine,
} from "../types/oee.types";
import { calculateAggregateOEE } from "../utils/oee-calculator";

export type TimeWindowFilter = "shift" | "day" | "week";
export type ViewTab = "overview" | "machines" | "work-orders" | "downtime-analysis";

export function useManufacturingOEE() {
  const [activeTab, setActiveTab] = useState<ViewTab>("overview");
  const [selectedLineId, setSelectedLineId] = useState<string>("all");
  const [timeWindow, setTimeWindow] = useState<TimeWindowFilter>("shift");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMachine, setSelectedMachine] = useState<MachineItem | null>(null);

  // Filtered Machines based on selectedLineId and searchQuery
  const filteredMachines = useMemo(() => {
    return MOCK_MACHINES.filter((mch) => {
      const matchLine = selectedLineId === "all" || mch.lineId === selectedLineId;
      const matchQuery =
        !searchQuery ||
        mch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mch.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mch.lineName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchLine && matchQuery;
    });
  }, [selectedLineId, searchQuery]);

  // Filtered Work Orders based on selectedLineId and searchQuery
  const filteredWorkOrders = useMemo(() => {
    return MOCK_WORK_ORDERS.filter((wo) => {
      const matchLine = selectedLineId === "all" || wo.lineId === selectedLineId;
      const matchQuery =
        !searchQuery ||
        wo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wo.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wo.machineName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchLine && matchQuery;
    });
  }, [selectedLineId, searchQuery]);

  // Line-specific or overall OEE Trend data points
  const oeeTrend = useMemo(() => {
    return LINE_OEE_TRENDS[selectedLineId] ?? LINE_OEE_TRENDS["all"];
  }, [selectedLineId]);

  // Line-specific or overall Downtime Pareto reasons
  const downtimeReasons = useMemo(() => {
    return LINE_DOWNTIME_REASONS[selectedLineId] ?? LINE_DOWNTIME_REASONS["all"];
  }, [selectedLineId]);

  // Computed Overall Plant or Line Specific Metrics
  const aggregateMetrics: OEEMetrics = useMemo(() => {
    return calculateAggregateOEE(filteredMachines, filteredWorkOrders, MOCK_PRODUCTION_LINES);
  }, [filteredMachines, filteredWorkOrders]);

  // Filtered downtime log events history
  const downtimeLogsHistory = useMemo(() => {
    return filteredMachines.flatMap((m) => m.downtimeLogs);
  }, [filteredMachines]);

  return {
    activeTab,
    setActiveTab,
    selectedLineId,
    setSelectedLineId,
    timeWindow,
    setTimeWindow,
    searchQuery,
    setSearchQuery,
    machines: filteredMachines,
    allMachines: MOCK_MACHINES,
    workOrders: filteredWorkOrders,
    productionLines: MOCK_PRODUCTION_LINES as ProductionLine[],
    downtimeReasons,
    oeeTrend,
    aggregateMetrics,
    downtimeLogsHistory,
    selectedMachine,
    setSelectedMachine,
  };
}
