export type DowntimeCategoryType = "unplanned" | "planned";

export type DowntimeCategory =
  | "Machine Breakdown"
  | "Component Failure"
  | "Tooling / Mold Change"
  | "Changeover & Setup"
  | "CIP & Cleaning Validation"
  | "Material Shortage"
  | "Quality Inspection Hold"
  | "Scheduled Maintenance"
  | "Operator Absence"
  | "Utility Failure";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type ResolutionStatus = "open" | "in_progress" | "resolved";

export type TimeWindowFilter = "shift" | "day" | "week" | "month";

export interface ProductionLineInfo {
  id: string;
  name: string;
  code: string;
}

export interface DowntimeIncident {
  id: string;
  incidentNumber: string;
  machineId: string;
  machineName: string;
  lineId: string;
  lineName: string;
  categoryType: DowntimeCategoryType; // "unplanned" | "planned"
  category: DowntimeCategory;
  reason: string;
  rootCauseAnalysis?: string; // 5-Why or technical diagnosis
  actionTaken?: string; // Corrective and preventive action
  severity: IncidentSeverity;
  status: ResolutionStatus;
  startTime: string; // ISO or formatted e.g. "2026-08-29 08:30"
  endTime?: string;
  durationMinutes: number;
  financialImpactEstimated?: number; // in IDR or Currency
  lostUnitsEstimated?: number;
  reportedBy: string;
  assignedTechnician?: string;
  capaRequired?: boolean;
  capaId?: string;
}

export interface ParetoItem {
  reason: string;
  category: DowntimeCategory;
  categoryType: DowntimeCategoryType;
  totalDurationMinutes: number;
  totalDurationHours: number;
  frequency: number; // count of occurrences
  percentage: number; // Individual share %
  cumulativePercentage: number; // Pareto curve cumulative %
  isVitalFew: boolean; // Part of the 80% cut-off
}

export interface CategoryBreakdownItem {
  category: DowntimeCategory;
  categoryType: DowntimeCategoryType;
  totalDurationMinutes: number;
  totalDurationHours: number;
  frequency: number;
  percentageShare: number;
  topReason: string;
  averageDurationMinutes: number;
}

export interface ShiftTrendItem {
  shift: string; // "Shift 1 (06:00-14:00)", "Shift 2 (14:00-22:00)", "Shift 3 (22:00-06:00)"
  timeLabel: string;
  unplannedDurationMinutes: number;
  plannedDurationMinutes: number;
  totalDurationMinutes: number;
  incidentCount: number;
}

export interface LineImpactItem {
  lineId: string;
  lineName: string;
  unplannedMinutes: number;
  plannedMinutes: number;
  totalLostMinutes: number;
  totalIncidents: number;
  mttrMinutes: number;
  availabilityLossPercentage: number;
}

export interface DowntimeKpiSummary {
  totalLostTimeHours: number;
  totalLostTimeMinutes: number;
  totalIncidents: number;
  unplannedDurationHours: number;
  plannedDurationHours: number;
  unplannedPercentage: number;
  plannedPercentage: number;
  mttrMinutes: number; // Mean Time to Repair (Unplanned only)
  mtbfHours: number; // Mean Time Between Failures
  estimatedUnitsLost: number;
  estimatedCostLost: number;
  topLossDriver: string;
  topLossDriverMinutes: number;
  comparisonVsLastPeriodPercentage: number; // -12.5% means improvement
}

export interface DowntimeFilterParams {
  lineId?: string;
  categoryType?: "all" | DowntimeCategoryType;
  category?: string;
  severity?: string;
  status?: string;
  timeWindow?: TimeWindowFilter;
  search?: string;
}

export interface CreateDowntimeInput {
  machineId: string;
  lineId: string;
  categoryType: DowntimeCategoryType;
  category: DowntimeCategory;
  reason: string;
  rootCauseAnalysis?: string;
  actionTaken?: string;
  severity: IncidentSeverity;
  status: ResolutionStatus;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  lostUnitsEstimated?: number;
  reportedBy: string;
  assignedTechnician?: string;
  capaRequired?: boolean;
}

export interface UpdateDowntimeInput extends Partial<CreateDowntimeInput> {
  id: string;
}
