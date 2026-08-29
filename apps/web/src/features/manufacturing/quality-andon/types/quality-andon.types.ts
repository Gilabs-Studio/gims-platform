export type AndonStatus = "normal" | "warning" | "critical_alarm";

export type ParameterCategory =
  | "temperature"
  | "speed"
  | "viscosity"
  | "pressure"
  | "hardness"
  | "weight"
  | "ph"
  | "dimension";

export type IncidentSeverity = "minor" | "major" | "critical";

export type IncidentStatus = "open" | "investigating" | "action_taken" | "closed";

export interface TelemetryReading {
  id: string;
  timestamp: string; // e.g. "14:15:00"
  value: number;
  unit: string;
  status: AndonStatus;
}

export interface QualityDeviationIncident {
  id: string;
  code: string; // e.g. "DEV-2026-0081"
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  loggedAt: string;
  loggedBy: string;
  qaAssignedTo?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  isCapaRequired: boolean;
}

export interface AndonAuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  details?: string;
  signatureHash?: string;
}

export interface AndonParameterItem {
  id: string;
  code: string;
  name: string;
  category: ParameterCategory;
  batchNumber: string;
  workOrderCode: string;
  productName: string;
  lineId: string;
  lineName: string;
  machineId?: string;
  machineName?: string;
  currentValue: number;
  unit: string;
  lowerSpecLimit: number;
  targetValue: number;
  upperSpecLimit: number;
  status: AndonStatus;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  lastSampleTime: string;
  operatorId: string;
  operatorName: string;
  operatorAvatar?: string;
  operatorRole: string;
  qaInspectorId: string;
  qaInspectorName: string;
  qaInspectorAvatar?: string;
  qaInspectorRole: string;
  telemetryHistory: TelemetryReading[];
  incidents: QualityDeviationIncident[];
  auditLogs: AndonAuditLog[];
  notes?: string;
}

/* =========================================================================
   DASHBOARD EXECUTIVE & OPERATOR VISUALIZATION TYPES
   ========================================================================= */

export interface AndonDashboardKPIs {
  activeAlarms: {
    count: number;
    subtext: string;
  };
  qcChecks: {
    count: number;
    trendPct: number;
  };
  outOfSpec: {
    count: number;
    trendPct: number;
  };
  passRate: {
    percentage: number;
    trendPct: number;
  };
  openCapa: {
    count: number;
    subtext: string;
  };
}

export interface LiveAndonBoardLineItem {
  id: string;
  lineName: string;
  status: "alarm" | "warning" | "normal";
  lastAlarmTime?: string;
  alarmType?: string;
  duration?: string;
  parameterId?: string;
}

export interface HourlyAlarmTrendPoint {
  hour: string;
  critical: number;
  major: number;
  minor: number;
}

export interface RecentAlarmItem {
  id: string;
  title: string;
  severity: "critical" | "major" | "minor";
  lineName: string;
  productName: string;
  timestamp: string;
  relativeTime: string;
  parameterId?: string;
}

export interface QualityDonutDistribution {
  passCount: number;
  passPct: number;
  warningCount: number;
  warningPct: number;
  failCount: number;
  failPct: number;
}

export interface CapaSummaryStatus {
  open: number;
  inProgress: number;
  pendingVerification: number;
  closedThisMonth: number;
}

export interface AndonDashboardData {
  kpis: AndonDashboardKPIs;
  liveBoard: LiveAndonBoardLineItem[];
  hourlyTrends: HourlyAlarmTrendPoint[];
  recentAlarms: RecentAlarmItem[];
  qualityDistribution: QualityDonutDistribution;
  capaSummary: CapaSummaryStatus;
  parameters: AndonParameterItem[];
}

export interface AndonFilterParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: AndonStatus | "all";
  line_id?: string;
  category?: ParameterCategory | "all";
}

export interface AndonPaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface AndonListResponse {
  data: AndonParameterItem[];
  meta: {
    pagination: AndonPaginationMeta;
  };
}

export interface AcknowledgeAlarmInput {
  parameterId: string;
  actorName: string;
  notes?: string;
}

export interface EscalateToQAInput {
  parameterId: string;
  urgency: "high" | "critical";
  message: string;
  reportedBy: string;
  targetQAPerson?: string;
}

export interface LogQualityIncidentInput {
  parameterId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  loggedBy: string;
  correctiveAction?: string;
  isCapaRequired?: boolean;
}
