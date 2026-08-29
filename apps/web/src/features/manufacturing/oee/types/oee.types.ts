export type MachineStatus = "running" | "idle" | "downtime" | "maintenance";

export type WorkOrderStatus = "draft" | "in_progress" | "paused" | "completed" | "cancelled";

export type DowntimeCategory =
  | "Unplanned Breakdown"
  | "Tooling / Mold Change"
  | "Material Shortage"
  | "Quality Inspection"
  | "Planned Maintenance"
  | "Operator Absence";

export interface DowntimeLogEvent {
  id: string;
  machineId: string;
  machineName: string;
  lineId: string;
  lineName: string;
  startTime: string; // e.g. "08:30"
  endTime: string;   // e.g. "09:15"
  status: MachineStatus;
  reason: string;    // e.g. "Spindle Motor Overheat"
  category: DowntimeCategory;
  durationMinutes: number;
}

export interface ScrapLogEvent {
  id: string;
  workOrderId: string;
  workOrderCode: string;
  machineId: string;
  machineName: string;
  lineId: string;
  lineName: string;
  defectType: string;
  quantity: number;
  timestamp: string;
  reportedBy: string;
}

export interface WorkOrder {
  id: string;
  code: string;
  productName: string;
  sku: string;
  lineId: string;
  lineName: string;
  machineId: string;
  machineName: string;
  targetQuantity: number;
  completedQuantity: number;
  scrapQuantity: number;
  idealCycleTimeSeconds: number; // e.g. 15s per unit
  status: WorkOrderStatus;
  startDate: string;
  endDate?: string;
  operatorName: string;
}

export interface MachineItem {
  id: string;
  name: string;
  code: string;
  imageUrl?: string;
  lineId: string;
  lineName: string;
  status: MachineStatus;
  oeeScore: number;          // % e.g. 78.5
  availabilityScore: number; // % e.g. 85.0
  performanceScore: number;  // % e.g. 94.2
  qualityScore: number;      // % e.g. 97.8
  temperature: number;       // Celsius e.g. 74.2
  vibrationLevel: number;    // mm/s e.g. 2.1
  healthIndex?: number;
  lastMaintenance: string;   // e.g. "2026-08-15"
  partsPerHour: number;      // e.g. 240
  cavitation?: string;       // e.g. "11/12"
  cycleTime?: string;        // e.g. "2.51m"
  assignedOperator?: {
    name: string;
    avatarSeed: string;
    role: string;
    shift: string;
    phone: string;
  };
  recentTimelineBlocks?: Array<{
    id: string;
    start: string;
    end: string;
    durationMinutes: number;
    status: MachineStatus;
    reason?: string;
  }>;
  downtimeLogs: DowntimeLogEvent[];
}

export interface ProductionLine {
  id: string;
  name: string;
  code: string;
  supervisor: string;
  targetOutput: number;
  currentOutput: number;
  defectRate: number;        // % e.g. 1.8
  averageOee: number;        // %
  machinesCount: number;
  runningCount: number;
  downtimeCount: number;
  idleCount: number;
}

export interface OEEMetrics {
  overallOee: number;
  targetOee: number;
  averageAvailability: number;
  averagePerformance: number;
  averageQuality: number;
  totalTargetOutput: number;
  totalActualOutput: number;
  totalScrapUnits: number;
  defectRate: number;
  runningMachinesCount: number;
  downtimeMachinesCount: number;
  totalMachinesCount: number;
}

export interface DowntimeReasonBreakdown {
  reason: string;
  category: DowntimeCategory;
  count: number;
  totalDurationMinutes: number;
  percentage: number;
}

export interface OEETrendPoint {
  timestamp: string; // e.g. "15 Aug", "16 Aug" or "08:00"
  overallOee: number;
  availability: number;
  performance: number;
  quality: number;
  targetOee: number;
}

export interface NewDowntimeLogInput {
  machineId: string;
  reason: string;
  category: DowntimeCategory;
  durationMinutes: number;
}

export interface NewScrapLogInput {
  workOrderId: string;
  defectType: string;
  quantity: number;
  reportedBy: string;
}
