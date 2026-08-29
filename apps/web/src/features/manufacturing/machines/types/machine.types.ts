export type MachineStatus = "running" | "idle" | "downtime" | "maintenance";

export type DowntimeCategory =
  | "Unplanned Breakdown"
  | "Tooling / Mold Change"
  | "Material Shortage"
  | "Quality Inspection"
  | "Planned Maintenance"
  | "Operator Absence";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type ResolutionStatus = "open" | "in_progress" | "resolved";

export type SensorHealthStatus = "normal" | "warning" | "critical";

export interface MachineSensorTelemetry {
  temperature: number; // Celsius (°C)
  temperatureStatus: SensorHealthStatus;
  vibration: number; // G (acceleration) or mm/s
  vibrationStatus: SensorHealthStatus;
  pressure: number; // Bar
  spindleRpm: number; // RPM
  powerDraw: number; // kW
  cycleTimeSeconds: number; // Seconds
  cycleEfficiency: number; // %
}

export interface MachineTelemetryPoint {
  time: string; // e.g. "08:00"
  temperature: number; // °C
  vibration: number; // G
  rpm: number;
  power: number; // kW
  status: MachineStatus;
}

export interface MachineTimelineBlock {
  id: string;
  start: string; // "08:00"
  end: string; // "10:30"
  durationMinutes: number;
  status: MachineStatus;
  reason?: string;
  category?: DowntimeCategory;
}

export interface MachineIncidentLog {
  id: string;
  machineId: string;
  machineName: string;
  lineId: string;
  lineName: string;
  startTime: string; // e.g. "2026-08-29 08:30" or "08:30"
  endTime?: string; // e.g. "09:15"
  durationMinutes: number;
  status: MachineStatus;
  reason: string;
  category: DowntimeCategory;
  severity: IncidentSeverity;
  reportedBy: string;
  reportedByAvatar?: string;
  actionTaken?: string;
  resolutionStatus: ResolutionStatus;
}

export interface AssignedStaff {
  name: string;
  avatarSeed: string;
  role: string;
  shift: string;
  phone?: string;
}

export interface MachineTechnicalSpecs {
  model: string;
  serialNumber: string;
  manufacturer: string;
  installationDate: string;
  lastServiceDate: string;
  nextScheduledService: string;
  powerRating: string; // e.g. "45 kW"
  maxCapacity: string; // e.g. "350 units/hr"
}

export interface ActiveWorkOrderSummary {
  id: string;
  code: string;
  productName: string;
  sku: string;
  targetQuantity: number;
  completedQuantity: number;
  scrapQuantity: number;
  progressPercentage: number;
}

export interface BaseMachineItem {
  id: string;
  name: string;
  code: string;
  status: MachineStatus;
  lineId?: string;
  lineName?: string;
  oeeScore?: number;
  availabilityScore?: number;
  performanceScore?: number;
  qualityScore?: number;
  temperature?: number;
  vibrationLevel?: number;
  partsPerHour?: number;
  targetPartsPerHour?: number;
  healthIndex?: number;
  currentTelemetry?: MachineSensorTelemetry;
  assignedOperator?: AssignedStaff;
  recentTimelineBlocks?: MachineTimelineBlock[];
  imageUrl?: string;
}

export interface MachineItem extends BaseMachineItem {
  lineId: string;
  lineName: string;
  oeeScore: number; // %
  availabilityScore: number; // %
  performanceScore: number; // %
  qualityScore: number; // %
  currentTelemetry: MachineSensorTelemetry;
  partsPerHour: number;
  targetPartsPerHour: number;
  assignedOperator: AssignedStaff;
  healthIndex: number; // 0-100%
  activeWorkOrder?: ActiveWorkOrderSummary;
  recentTimelineBlocks: MachineTimelineBlock[];
}

export interface MachineDetail extends MachineItem {
  technicalSpecs: MachineTechnicalSpecs;
  assignedTechnician: AssignedStaff;
  mtbfHours: number; // Mean Time Between Failures
  mttrMinutes: number; // Mean Time To Repair
  totalDowntimeTodayMinutes: number;
  totalIncidentsMonth: number;
  timeline24h: MachineTimelineBlock[];
  telemetryTrend: MachineTelemetryPoint[];
  incidentLogs: MachineIncidentLog[];
}

export interface MachineSummaryKpis {
  totalMachines: number;
  runningCount: number;
  idleCount: number;
  downtimeCount: number;
  maintenanceCount: number;
  averageHealthIndex: number;
  averageOeeScore: number;
}

export interface MachineFilterParams {
  lineId?: string;
  status?: string;
  search?: string;
}

export interface CreateIncidentInput {
  machineId: string;
  reason: string;
  category: DowntimeCategory;
  severity: IncidentSeverity;
  durationMinutes: number;
  startTime: string;
  reportedBy: string;
  actionTaken?: string;
}

export interface UpdateMachineStatusInput {
  machineId: string;
  status: MachineStatus;
  reason?: string;
}
