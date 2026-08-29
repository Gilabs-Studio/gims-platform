export type LineStatusType = "running" | "warning" | "stop" | "maintenance";
export type AlertSeverity = "stop" | "warning";
export type TimeWindowOption = "15m" | "30m" | "1h" | "shift" | "today";

export interface LiveMonitoringKPISummary {
  overallOee: number;
  overallOeeTrend: number;
  totalProduction: number;
  totalProductionTrend: number;
  targetProduction: number;
  targetAchievedPct: number;
  runningMachines: number;
  runningMachinesPct: number;
  stoppedMachines: number;
  stoppedMachinesPct: number;
  activeDowntimeCount: number;
  linesAffectedCount: number;
  defectRate: number;
  defectRateTrend: number;
}

export interface LineStatusItem {
  id: string;
  nameKey: string;
  code: string;
  status: LineStatusType;
  oeeScore: number | null;
  sparkline: number[];
  productionActual: number;
  productionTarget: number;
  downtimeDurationText: string;
}

export interface OEELineTrendPoint {
  time: string;
  line1: number;
  line2: number;
  line3: number;
  line4: number;
  line5: number;
  line6?: number;
}

export interface AvailabilityBreakdown {
  score: number;
  operatingText: string;
  operatingPct: number;
  plannedDowntimeText: string;
  plannedDowntimePct: number;
  unplannedDowntimeText: string;
  unplannedDowntimePct: number;
}

export interface PerformanceBreakdown {
  score: number;
  idealCycleText: string;
  idealCyclePct: number;
  minorStopText: string;
  minorStopPct: number;
  speedLossText: string;
  speedLossPct: number;
}

export interface QualityBreakdown {
  score: number;
  goodCount: number;
  goodPct: number;
  defectCount: number;
  defectPct: number;
}

export interface TopDowntimeItem {
  id: string;
  reasonKey: string;
  durationText: string;
  percentage: number;
  severity: "high" | "medium";
}

export interface LiveAlertItem {
  id: string;
  time: string;
  machineCode: string;
  machineName: string;
  status: AlertSeverity;
  messageKey: string;
  messageParam?: string;
  lineLocationKey: string;
}

export interface ProductionTargetMetrics {
  completedCount: number;
  completedPct: number;
  remainingCount: number;
  remainingPct: number;
  targetTotal: number;
}

export interface LiveMonitoringData {
  lastUpdated: string;
  kpiSummary: LiveMonitoringKPISummary;
  lineStatuses: LineStatusItem[];
  oeeTrends: OEELineTrendPoint[];
  availability: AvailabilityBreakdown;
  performance: PerformanceBreakdown;
  quality: QualityBreakdown;
  topDowntime: {
    totalText: string;
    items: TopDowntimeItem[];
  };
  alerts: LiveAlertItem[];
  productionVsTarget: ProductionTargetMetrics;
}
